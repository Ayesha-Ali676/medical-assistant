/**
 * Device Integration Service
 * Handles real-time medical device data streaming and IoT connectivity
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const VitalSignsProcessor = require('./vital-signs-processor');
const DeviceConnector = require('./device-connector');
const DataValidator = require('./data-validator');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'device-integration.log' })
  ]
});

class DeviceIntegrationService {
  constructor() {
    this.vitalSignsProcessor = new VitalSignsProcessor();
    this.deviceConnector = new DeviceConnector();
    this.dataValidator = new DataValidator();
    this.registeredDevices = new Map();
    this.activeStreams = new Map();
    this.vitalSignsHistory = new Map();
    this.deviceStatus = new Map();
  }

  /**
   * Register a new medical device
   * Supports various device types and protocols
   */
  async registerDevice(config) {
    try {
      const deviceId = uuidv4();
      
      // Validate configuration
      this.validateDeviceConfig(config);
      
      // Create device registration
      const device = {
        id: deviceId,
        deviceType: config.deviceType,
        manufacturer: config.manufacturer,
        model: config.model,
        serialNumber: config.serialNumber,
        patientId: config.patientId,
        protocol: config.protocol, // 'websocket', 'mqtt', 'http'
        connectionConfig: config.connectionConfig,
        capabilities: config.capabilities || [],
        status: 'registered',
        registeredAt: new Date().toISOString(),
        lastDataReceived: null,
        connectionQuality: 100,
        batteryLevel: config.batteryLevel || 100
      };
      
      // Register device
      this.registeredDevices.set(deviceId, device);
      this.deviceStatus.set(deviceId, {
        status: 'inactive',
        lastDataReceived: null,
        connectionQuality: 100,
        batteryLevel: device.batteryLevel,
        errors: []
      });
      
      // Initialize history storage
      this.vitalSignsHistory.set(deviceId, []);
      
      logger.info(`Device registered: ${config.manufacturer} ${config.model}`, {
        deviceId,
        deviceType: config.deviceType,
        patientId: config.patientId
      });
      
      return {
        deviceId,
        status: 'registered',
        message: 'Device successfully registered'
      };
    } catch (error) {
      logger.error('Failed to register device', { error: error.message, config });
      throw new Error(`Device registration failed: ${error.message}`);
    }
  }

  /**
   * Start real-time data streaming from device
   * Implements real-time medical device data streaming (Requirement 5.3)
   */
  async startStreaming(deviceId) {
    try {
      const device = this.registeredDevices.get(deviceId);
      
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }
      
      if (this.activeStreams.has(deviceId)) {
        logger.warn('Device already streaming', { deviceId });
        return { status: 'already_streaming', deviceId };
      }
      
      // Start streaming based on protocol
      const stream = await this.deviceConnector.connect(device);
      
      // Set up data handler
      stream.on('data', (data) => {
        this.handleDeviceData(deviceId, data);
      });
      
      stream.on('error', (error) => {
        this.handleStreamError(deviceId, error);
      });
      
      stream.on('disconnect', () => {
        this.handleStreamDisconnect(deviceId);
      });
      
      this.activeStreams.set(deviceId, stream);
      
      // Update device status
      device.status = 'streaming';
      this.updateDeviceStatus(deviceId, { status: 'active' });
      
      logger.info('Device streaming started', { deviceId, protocol: device.protocol });
      
      return {
        status: 'streaming',
        deviceId,
        protocol: device.protocol
      };
    } catch (error) {
      logger.error('Failed to start streaming', { error: error.message, deviceId });
      throw error;
    }
  }

  /**
   * Stop data streaming from device
   */
  async stopStreaming(deviceId) {
    try {
      const stream = this.activeStreams.get(deviceId);
      
      if (!stream) {
        return { status: 'not_streaming', deviceId };
      }
      
      // Disconnect stream
      await this.deviceConnector.disconnect(stream);
      this.activeStreams.delete(deviceId);
      
      // Update device status
      const device = this.registeredDevices.get(deviceId);
      if (device) {
        device.status = 'registered';
      }
      this.updateDeviceStatus(deviceId, { status: 'inactive' });
      
      logger.info('Device streaming stopped', { deviceId });
      
      return {
        status: 'stopped',
        deviceId
      };
    } catch (error) {
      logger.error('Failed to stop streaming', { error: error.message, deviceId });
      throw error;
    }
  }

  /**
   * Handle incoming device data
   * Processes and validates real-time vital signs data
   */
  async handleDeviceData(deviceId, rawData) {
    try {
      const device = this.registeredDevices.get(deviceId);
      
      // Validate data
      const validationResult = this.dataValidator.validate(rawData, device.deviceType);
      
      if (!validationResult.isValid) {
        logger.warn('Invalid device data received', {
          deviceId,
          errors: validationResult.errors
        });
        return;
      }
      
      // Process vital signs
      const processedData = await this.vitalSignsProcessor.process(
        rawData,
        device.deviceType
      );
      
      // Add metadata
      const vitalSigns = {
        deviceId,
        patientId: device.patientId,
        timestamp: new Date().toISOString(),
        readings: processedData.readings,
        quality: processedData.quality,
        alerts: processedData.alerts || []
      };
      
      // Store in history
      const history = this.vitalSignsHistory.get(deviceId);
      history.push(vitalSigns);
      
      // Keep only last 1000 readings
      if (history.length > 1000) {
        history.shift();
      }
      
      // Update device status
      device.lastDataReceived = vitalSigns.timestamp;
      this.updateDeviceStatus(deviceId, {
        lastDataReceived: vitalSigns.timestamp,
        connectionQuality: processedData.quality.signalQuality || 100
      });
      
      // Emit event for real-time subscribers
      this.emit('vitals', vitalSigns);
      
      // Check for alerts
      if (vitalSigns.alerts.length > 0) {
        this.handleAlerts(deviceId, vitalSigns.alerts);
      }
      
      logger.debug('Device data processed', {
        deviceId,
        patientId: device.patientId,
        alertCount: vitalSigns.alerts.length
      });
    } catch (error) {
      logger.error('Failed to handle device data', {
        error: error.message,
        deviceId
      });
    }
  }

  /**
   * Get latest vital signs for a device
   */
  getLatestVitals(deviceId) {
    const history = this.vitalSignsHistory.get(deviceId);
    
    if (!history || history.length === 0) {
      return null;
    }
    
    return history[history.length - 1];
  }

  /**
   * Get vital signs history for a device
   */
  getVitalsHistory(deviceId, options = {}) {
    const history = this.vitalSignsHistory.get(deviceId) || [];
    
    let filtered = history;
    
    // Filter by time range
    if (options.startTime) {
      const startTime = new Date(options.startTime);
      filtered = filtered.filter(v => new Date(v.timestamp) >= startTime);
    }
    
    if (options.endTime) {
      const endTime = new Date(options.endTime);
      filtered = filtered.filter(v => new Date(v.timestamp) <= endTime);
    }
    
    // Limit results
    const limit = options.limit || 100;
    if (filtered.length > limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered;
  }

  /**
   * Get device status
   */
  getDeviceStatus(deviceId) {
    const device = this.registeredDevices.get(deviceId);
    const status = this.deviceStatus.get(deviceId);
    
    if (!device || !status) {
      return null;
    }
    
    return {
      deviceId,
      deviceType: device.deviceType,
      manufacturer: device.manufacturer,
      model: device.model,
      patientId: device.patientId,
      ...status
    };
  }

  /**
   * Get all registered devices
   */
  getAllDevices(filters = {}) {
    let devices = Array.from(this.registeredDevices.values());
    
    // Filter by patient
    if (filters.patientId) {
      devices = devices.filter(d => d.patientId === filters.patientId);
    }
    
    // Filter by status
    if (filters.status) {
      devices = devices.filter(d => {
        const status = this.deviceStatus.get(d.id);
        return status && status.status === filters.status;
      });
    }
    
    return devices.map(device => ({
      id: device.id,
      deviceType: device.deviceType,
      manufacturer: device.manufacturer,
      model: device.model,
      patientId: device.patientId,
      status: this.deviceStatus.get(device.id)
    }));
  }

  /**
   * Remove device registration
   */
  async removeDevice(deviceId) {
    try {
      // Stop streaming if active
      if (this.activeStreams.has(deviceId)) {
        await this.stopStreaming(deviceId);
      }
      
      // Remove device
      this.registeredDevices.delete(deviceId);
      this.deviceStatus.delete(deviceId);
      this.vitalSignsHistory.delete(deviceId);
      
      logger.info('Device removed', { deviceId });
      
      return {
        status: 'removed',
        deviceId
      };
    } catch (error) {
      logger.error('Failed to remove device', { error: error.message, deviceId });
      throw error;
    }
  }

  /**
   * Process manual reading (for non-connected devices)
   */
  async processManualReading(data) {
    try {
      // Validate manual reading
      const validationResult = this.dataValidator.validate(data, data.deviceType);
      
      if (!validationResult.isValid) {
        throw new Error(`Invalid reading: ${validationResult.errors.join(', ')}`);
      }
      
      // Process vital signs
      const processedData = await this.vitalSignsProcessor.process(
        data,
        data.deviceType
      );
      
      const vitalSigns = {
        deviceId: 'manual',
        patientId: data.patientId,
        timestamp: data.timestamp || new Date().toISOString(),
        readings: processedData.readings,
        quality: processedData.quality,
        alerts: processedData.alerts || [],
        source: 'manual'
      };
      
      logger.info('Manual reading processed', {
        patientId: data.patientId,
        deviceType: data.deviceType
      });
      
      return vitalSigns;
    } catch (error) {
      logger.error('Failed to process manual reading', { error: error.message });
      throw error;
    }
  }

  // Private helper methods

  validateDeviceConfig(config) {
    if (!config.deviceType) {
      throw new Error('Device type is required');
    }
    
    if (!config.manufacturer) {
      throw new Error('Manufacturer is required');
    }
    
    if (!config.model) {
      throw new Error('Model is required');
    }
    
    if (!config.serialNumber) {
      throw new Error('Serial number is required');
    }
    
    if (!config.patientId) {
      throw new Error('Patient ID is required');
    }
    
    if (!config.protocol) {
      throw new Error('Protocol is required');
    }
    
    const validProtocols = ['websocket', 'mqtt', 'http'];
    if (!validProtocols.includes(config.protocol)) {
      throw new Error(`Invalid protocol. Must be one of: ${validProtocols.join(', ')}`);
    }
    
    if (!config.connectionConfig) {
      throw new Error('Connection configuration is required');
    }
  }

  updateDeviceStatus(deviceId, updates) {
    const status = this.deviceStatus.get(deviceId);
    if (status) {
      Object.assign(status, updates);
    }
  }

  handleStreamError(deviceId, error) {
    logger.error('Stream error', { deviceId, error: error.message });
    
    const status = this.deviceStatus.get(deviceId);
    if (status) {
      status.status = 'error';
      status.errors.push({
        timestamp: new Date().toISOString(),
        message: error.message
      });
    }
    
    // Attempt reconnection
    this.attemptReconnection(deviceId);
  }

  handleStreamDisconnect(deviceId) {
    logger.warn('Stream disconnected', { deviceId });
    
    this.activeStreams.delete(deviceId);
    this.updateDeviceStatus(deviceId, { status: 'inactive' });
    
    // Attempt reconnection
    this.attemptReconnection(deviceId);
  }

  async attemptReconnection(deviceId) {
    const device = this.registeredDevices.get(deviceId);
    
    if (!device) {
      return;
    }
    
    logger.info('Attempting reconnection', { deviceId });
    
    // Wait before reconnecting
    await this.sleep(5000);
    
    try {
      await this.startStreaming(deviceId);
      logger.info('Reconnection successful', { deviceId });
    } catch (error) {
      logger.error('Reconnection failed', { deviceId, error: error.message });
    }
  }

  handleAlerts(deviceId, alerts) {
    const device = this.registeredDevices.get(deviceId);
    
    alerts.forEach(alert => {
      logger.warn('Device alert', {
        deviceId,
        patientId: device.patientId,
        alert
      });
      
      // Emit alert event
      this.emit('alert', {
        deviceId,
        patientId: device.patientId,
        ...alert
      });
    });
  }

  emit(event, data) {
    // This would integrate with your event system (WebSocket, MQTT, etc.)
    // For now, just log
    logger.debug('Event emitted', { event, data });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DeviceIntegrationService;
