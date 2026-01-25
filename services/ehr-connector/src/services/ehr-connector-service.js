/**
 * EHR Connector Service
 * Handles legacy EHR system integration with concurrent connection support
 * For physician review only
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const EHRTransformer = require('./ehr-transformer');
const ConnectionPool = require('./connection-pool');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'ehr-connector.log' })
  ]
});

class EHRConnectorService {
  constructor() {
    this.connectionPool = new ConnectionPool();
    this.transformer = new EHRTransformer();
    this.activeConnections = new Map();
    this.dataCache = new Map();
  }

  /**
   * Register a new EHR system connection
   * Supports concurrent connections to multiple EHR systems
   */
  async registerEHRSystem(config) {
    try {
      const connectionId = uuidv4();
      
      // Validate configuration
      this.validateEHRConfig(config);
      
      // Create connection
      const connection = {
        id: connectionId,
        type: config.type, // 'epic', 'cerner', 'allscripts', 'meditech', 'custom'
        name: config.name,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        credentials: config.credentials,
        version: config.version,
        timeout: config.timeout || 30000,
        retryAttempts: config.retryAttempts || 3,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastHealthCheck: null
      };
      
      // Add to connection pool
      await this.connectionPool.addConnection(connection);
      this.activeConnections.set(connectionId, connection);
      
      logger.info(`EHR system registered: ${config.name} (${config.type})`, {
        connectionId,
        type: config.type
      });
      
      return {
        connectionId,
        status: 'registered',
        message: 'EHR system successfully registered'
      };
    } catch (error) {
      logger.error('Failed to register EHR system', { error: error.message, config });
      throw new Error(`EHR registration failed: ${error.message}`);
    }
  }

  /**
   * Fetch patient data from legacy EHR system
   * Supports concurrent data retrieval from multiple systems
   */
  async fetchPatientData(connectionId, patientId, options = {}) {
    try {
      const connection = this.activeConnections.get(connectionId);
      
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }
      
      // Check cache first
      const cacheKey = `${connectionId}:${patientId}`;
      if (this.dataCache.has(cacheKey) && !options.forceRefresh) {
        logger.info('Returning cached patient data', { connectionId, patientId });
        return this.dataCache.get(cacheKey);
      }
      
      // Fetch data based on EHR type
      let rawData;
      switch (connection.type) {
        case 'epic':
          rawData = await this.fetchFromEpic(connection, patientId);
          break;
        case 'cerner':
          rawData = await this.fetchFromCerner(connection, patientId);
          break;
        case 'allscripts':
          rawData = await this.fetchFromAllscripts(connection, patientId);
          break;
        case 'meditech':
          rawData = await this.fetchFromMeditech(connection, patientId);
          break;
        case 'custom':
          rawData = await this.fetchFromCustom(connection, patientId);
          break;
        default:
          throw new Error(`Unsupported EHR type: ${connection.type}`);
      }
      
      // Transform to standardized format
      const transformedData = await this.transformer.transformPatientData(
        rawData,
        connection.type
      );
      
      // Cache the result
      this.dataCache.set(cacheKey, transformedData);
      
      logger.info('Patient data fetched and transformed', {
        connectionId,
        patientId,
        ehrType: connection.type
      });
      
      return transformedData;
    } catch (error) {
      logger.error('Failed to fetch patient data', {
        error: error.message,
        connectionId,
        patientId
      });
      throw error;
    }
  }

  /**
   * Fetch data from multiple EHR systems concurrently
   * Implements concurrent connection support as per requirement 5.5
   */
  async fetchFromMultipleSystems(requests) {
    try {
      logger.info(`Fetching data from ${requests.length} EHR systems concurrently`);
      
      // Execute all requests concurrently
      const promises = requests.map(request =>
        this.fetchPatientData(request.connectionId, request.patientId, request.options)
          .then(data => ({
            success: true,
            connectionId: request.connectionId,
            patientId: request.patientId,
            data
          }))
          .catch(error => ({
            success: false,
            connectionId: request.connectionId,
            patientId: request.patientId,
            error: error.message
          }))
      );
      
      const results = await Promise.all(promises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      logger.info('Concurrent fetch completed', {
        total: requests.length,
        successful: successful.length,
        failed: failed.length
      });
      
      return {
        total: requests.length,
        successful: successful.length,
        failed: failed.length,
        results
      };
    } catch (error) {
      logger.error('Concurrent fetch failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Sync data from EHR system to internal database
   */
  async syncPatientData(connectionId, patientId) {
    try {
      const patientData = await this.fetchPatientData(connectionId, patientId, {
        forceRefresh: true
      });
      
      // Here you would save to your internal database
      // For now, we'll just return the transformed data
      
      logger.info('Patient data synced', { connectionId, patientId });
      
      return {
        status: 'synced',
        patientId,
        timestamp: new Date().toISOString(),
        data: patientData
      };
    } catch (error) {
      logger.error('Sync failed', { error: error.message, connectionId, patientId });
      throw error;
    }
  }

  /**
   * Health check for EHR connection
   */
  async checkConnectionHealth(connectionId) {
    try {
      const connection = this.activeConnections.get(connectionId);
      
      if (!connection) {
        return { status: 'not_found', connectionId };
      }
      
      // Perform health check based on EHR type
      const healthCheckUrl = `${connection.baseUrl}/health`;
      
      try {
        const response = await axios.get(healthCheckUrl, {
          timeout: 5000,
          headers: this.getAuthHeaders(connection)
        });
        
        connection.lastHealthCheck = new Date().toISOString();
        connection.status = 'active';
        
        return {
          status: 'healthy',
          connectionId,
          lastCheck: connection.lastHealthCheck
        };
      } catch (error) {
        connection.status = 'unhealthy';
        
        return {
          status: 'unhealthy',
          connectionId,
          error: error.message
        };
      }
    } catch (error) {
      logger.error('Health check failed', { error: error.message, connectionId });
      return {
        status: 'error',
        connectionId,
        error: error.message
      };
    }
  }

  /**
   * Get all active connections
   */
  getActiveConnections() {
    return Array.from(this.activeConnections.values()).map(conn => ({
      id: conn.id,
      type: conn.type,
      name: conn.name,
      status: conn.status,
      lastHealthCheck: conn.lastHealthCheck
    }));
  }

  /**
   * Remove EHR connection
   */
  async removeConnection(connectionId) {
    try {
      const connection = this.activeConnections.get(connectionId);
      
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }
      
      // Remove from pool and active connections
      await this.connectionPool.removeConnection(connectionId);
      this.activeConnections.delete(connectionId);
      
      // Clear cache for this connection
      for (const [key] of this.dataCache) {
        if (key.startsWith(`${connectionId}:`)) {
          this.dataCache.delete(key);
        }
      }
      
      logger.info('Connection removed', { connectionId });
      
      return {
        status: 'removed',
        connectionId
      };
    } catch (error) {
      logger.error('Failed to remove connection', { error: error.message, connectionId });
      throw error;
    }
  }

  // Private helper methods for different EHR systems

  async fetchFromEpic(connection, patientId) {
    const url = `${connection.baseUrl}/api/FHIR/R4/Patient/${patientId}`;
    const response = await this.makeRequest(connection, url);
    return response.data;
  }

  async fetchFromCerner(connection, patientId) {
    const url = `${connection.baseUrl}/v1/patients/${patientId}`;
    const response = await this.makeRequest(connection, url);
    return response.data;
  }

  async fetchFromAllscripts(connection, patientId) {
    const url = `${connection.baseUrl}/Unity/UnityService.svc/GetPatient`;
    const response = await this.makeRequest(connection, url, {
      method: 'POST',
      data: { PatientID: patientId }
    });
    return response.data;
  }

  async fetchFromMeditech(connection, patientId) {
    const url = `${connection.baseUrl}/api/patient/${patientId}`;
    const response = await this.makeRequest(connection, url);
    return response.data;
  }

  async fetchFromCustom(connection, patientId) {
    const url = `${connection.baseUrl}/patient/${patientId}`;
    const response = await this.makeRequest(connection, url);
    return response.data;
  }

  async makeRequest(connection, url, options = {}) {
    const config = {
      url,
      method: options.method || 'GET',
      timeout: connection.timeout,
      headers: this.getAuthHeaders(connection),
      ...options
    };
    
    let lastError;
    for (let attempt = 1; attempt <= connection.retryAttempts; attempt++) {
      try {
        const response = await axios(config);
        return response;
      } catch (error) {
        lastError = error;
        logger.warn(`Request attempt ${attempt} failed`, {
          url,
          error: error.message
        });
        
        if (attempt < connection.retryAttempts) {
          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError;
  }

  getAuthHeaders(connection) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (connection.apiKey) {
      headers['Authorization'] = `Bearer ${connection.apiKey}`;
    } else if (connection.credentials) {
      const auth = Buffer.from(
        `${connection.credentials.username}:${connection.credentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    return headers;
  }

  validateEHRConfig(config) {
    if (!config.type) {
      throw new Error('EHR type is required');
    }
    
    if (!config.name) {
      throw new Error('EHR name is required');
    }
    
    if (!config.baseUrl) {
      throw new Error('Base URL is required');
    }
    
    if (!config.apiKey && !config.credentials) {
      throw new Error('Authentication credentials are required');
    }
    
    const validTypes = ['epic', 'cerner', 'allscripts', 'meditech', 'custom'];
    if (!validTypes.includes(config.type)) {
      throw new Error(`Invalid EHR type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache for a specific connection or all connections
   */
  clearCache(connectionId = null) {
    if (connectionId) {
      for (const [key] of this.dataCache) {
        if (key.startsWith(`${connectionId}:`)) {
          this.dataCache.delete(key);
        }
      }
      logger.info('Cache cleared for connection', { connectionId });
    } else {
      this.dataCache.clear();
      logger.info('All cache cleared');
    }
  }
}

module.exports = EHRConnectorService;
