/**
 * Device Integration Service - Main Entry Point
 * For physician review only
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const DeviceIntegrationService = require('./services/device-integration-service');

const app = express();
const PORT = process.env.DEVICE_INTEGRATION_PORT || 3007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Device Integration Service
const deviceService = new DeviceIntegrationService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'device-integration',
    timestamp: new Date().toISOString(),
    disclaimer: 'For physician review only'
  });
});

// Register new device
app.post('/api/devices/register', async (req, res) => {
  try {
    const result = await deviceService.registerDevice(req.body);
    res.status(201).json({
      ...result,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Start device streaming
app.post('/api/devices/:deviceId/stream/start', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await deviceService.startStreaming(deviceId);
    res.json({
      ...result,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Stop device streaming
app.post('/api/devices/:deviceId/stream/stop', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await deviceService.stopStreaming(deviceId);
    res.json({
      ...result,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get latest vital signs
app.get('/api/devices/:deviceId/vitals/latest', (req, res) => {
  try {
    const { deviceId } = req.params;
    const vitals = deviceService.getLatestVitals(deviceId);
    
    if (!vitals) {
      return res.status(404).json({
        error: 'No vital signs data available',
        disclaimer: 'For physician review only'
      });
    }
    
    res.json({
      vitals,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get vital signs history
app.get('/api/devices/:deviceId/vitals/history', (req, res) => {
  try {
    const { deviceId } = req.params;
    const options = {
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    const history = deviceService.getVitalsHistory(deviceId, options);
    
    res.json({
      deviceId,
      count: history.length,
      history,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get device status
app.get('/api/devices/:deviceId/status', (req, res) => {
  try {
    const { deviceId } = req.params;
    const status = deviceService.getDeviceStatus(deviceId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Device not found',
        disclaimer: 'For physician review only'
      });
    }
    
    res.json({
      status,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get all devices
app.get('/api/devices', (req, res) => {
  try {
    const filters = {
      patientId: req.query.patientId,
      status: req.query.status
    };
    
    const devices = deviceService.getAllDevices(filters);
    
    res.json({
      count: devices.length,
      devices,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Remove device
app.delete('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await deviceService.removeDevice(deviceId);
    res.json({
      ...result,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Process manual reading
app.post('/api/devices/manual-reading', async (req, res) => {
  try {
    const result = await deviceService.processManualReading(req.body);
    res.json({
      vitals: result,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    disclaimer: 'For physician review only'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Device Integration Service running on port ${PORT}`);
    console.log('For physician review only');
  });
}

module.exports = app;
