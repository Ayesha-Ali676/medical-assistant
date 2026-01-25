/**
 * Device Connector
 * Handles connections to medical devices via various protocols
 * For physician review only
 */

const WebSocket = require('ws');
const mqtt = require('mqtt');
const axios = require('axios');
const { EventEmitter } = require('events');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class DeviceStream extends EventEmitter {
  constructor(protocol, connection) {
    super();
    this.protocol = protocol;
    this.connection = connection;
    this.isConnected = false;
  }

  disconnect() {
    this.isConnected = false;
    if (this.connection) {
      if (this.protocol === 'websocket' && this.connection.close) {
        this.connection.close();
      } else if (this.protocol === 'mqtt' && this.connection.end) {
        this.connection.end();
      } else if (this.protocol === 'http' && this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
    }
  }
}

class DeviceConnector {
  constructor() {
    this.activeConnections = new Map();
  }

  /**
   * Connect to a medical device based on protocol
   */
  async connect(device) {
    try {
      let stream;
      
      switch (device.protocol) {
        case 'websocket':
          stream = await this.connectWebSocket(device);
          break;
        case 'mqtt':
          stream = await this.connectMQTT(device);
          break;
        case 'http':
          stream = await this.connectHTTP(device);
          break;
        default:
          throw new Error(`Unsupported protocol: ${device.protocol}`);
      }
      
      this.activeConnections.set(device.id, stream);
      
      logger.info('Device connected', {
        deviceId: device.id,
        protocol: device.protocol
      });
      
      return stream;
    } catch (error) {
      logger.error('Failed to connect device', {
        deviceId: device.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Connect via WebSocket
   */
  async connectWebSocket(device) {
    return new Promise((resolve, reject) => {
      const config = device.connectionConfig;
      const url = config.url || config.endpoint;
      
      // Add authentication if provided
      const headers = {};
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      
      const ws = new WebSocket(url, { headers });
      const stream = new DeviceStream('websocket', ws);
      
      ws.on('open', () => {
        stream.isConnected = true;
        logger.info('WebSocket connected', { deviceId: device.id });
        resolve(stream);
      });
      
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          stream.emit('data', parsed);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', {
            deviceId: device.id,
            error: error.message
          });
        }
      });
      
      ws.on('error', (error) => {
        logger.error('WebSocket error', {
          deviceId: device.id,
          error: error.message
        });
        stream.emit('error', error);
      });
      
      ws.on('close', () => {
        stream.isConnected = false;
        logger.info('WebSocket disconnected', { deviceId: device.id });
        stream.emit('disconnect');
      });
      
      // Timeout for connection
      setTimeout(() => {
        if (!stream.isConnected) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Connect via MQTT
   */
  async connectMQTT(device) {
    return new Promise((resolve, reject) => {
      const config = device.connectionConfig;
      const brokerUrl = config.url || config.brokerUrl;
      
      const options = {
        clientId: `medassist_${device.id}`,
        clean: true,
        connectTimeout: 10000
      };
      
      // Add authentication if provided
      if (config.username && config.password) {
        options.username = config.username;
        options.password = config.password;
      }
      
      const client = mqtt.connect(brokerUrl, options);
      const stream = new DeviceStream('mqtt', client);
      
      client.on('connect', () => {
        stream.isConnected = true;
        
        // Subscribe to device topic
        const topic = config.topic || `devices/${device.id}/data`;
        client.subscribe(topic, (err) => {
          if (err) {
            logger.error('MQTT subscription failed', {
              deviceId: device.id,
              error: err.message
            });
            stream.emit('error', err);
          } else {
            logger.info('MQTT connected and subscribed', {
              deviceId: device.id,
              topic
            });
            resolve(stream);
          }
        });
      });
      
      client.on('message', (topic, message) => {
        try {
          const parsed = JSON.parse(message.toString());
          stream.emit('data', parsed);
        } catch (error) {
          logger.error('Failed to parse MQTT message', {
            deviceId: device.id,
            error: error.message
          });
        }
      });
      
      client.on('error', (error) => {
        logger.error('MQTT error', {
          deviceId: device.id,
          error: error.message
        });
        stream.emit('error', error);
      });
      
      client.on('close', () => {
        stream.isConnected = false;
        logger.info('MQTT disconnected', { deviceId: device.id });
        stream.emit('disconnect');
      });
      
      // Timeout for connection
      setTimeout(() => {
        if (!stream.isConnected) {
          client.end();
          reject(new Error('MQTT connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Connect via HTTP polling
   */
  async connectHTTP(device) {
    const config = device.connectionConfig;
    const url = config.url || config.endpoint;
    const pollInterval = config.pollInterval || 5000; // Default 5 seconds
    
    const stream = new DeviceStream('http', null);
    stream.isConnected = true;
    
    // Set up polling
    const poll = async () => {
      try {
        const headers = {};
        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        
        const response = await axios.get(url, {
          headers,
          timeout: 5000
        });
        
        stream.emit('data', response.data);
      } catch (error) {
        logger.error('HTTP polling error', {
          deviceId: device.id,
          error: error.message
        });
        stream.emit('error', error);
      }
    };
    
    // Start polling
    stream.pollingInterval = setInterval(poll, pollInterval);
    
    // Do initial poll
    await poll();
    
    logger.info('HTTP polling started', {
      deviceId: device.id,
      pollInterval
    });
    
    return stream;
  }

  /**
   * Disconnect a device stream
   */
  async disconnect(stream) {
    try {
      stream.disconnect();
      
      // Remove from active connections
      for (const [deviceId, activeStream] of this.activeConnections) {
        if (activeStream === stream) {
          this.activeConnections.delete(deviceId);
          break;
        }
      }
      
      logger.info('Device disconnected', { protocol: stream.protocol });
    } catch (error) {
      logger.error('Failed to disconnect device', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount() {
    return this.activeConnections.size;
  }

  /**
   * Check if device is connected
   */
  isDeviceConnected(deviceId) {
    const stream = this.activeConnections.get(deviceId);
    return stream && stream.isConnected;
  }
}

module.exports = DeviceConnector;
