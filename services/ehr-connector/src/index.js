/**
 * EHR Connector Service - Main Entry Point
 * For physician review only
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const EHRConnectorService = require('./services/ehr-connector-service');

const app = express();
const PORT = process.env.EHR_CONNECTOR_PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize EHR Connector Service
const ehrConnector = new EHRConnectorService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ehr-connector',
    timestamp: new Date().toISOString(),
    disclaimer: 'For physician review only'
  });
});

// Register new EHR system
app.post('/api/ehr/register', async (req, res) => {
  try {
    const result = await ehrConnector.registerEHRSystem(req.body);
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

// Fetch patient data from specific EHR system
app.get('/api/ehr/:connectionId/patient/:patientId', async (req, res) => {
  try {
    const { connectionId, patientId } = req.params;
    const options = {
      forceRefresh: req.query.forceRefresh === 'true'
    };
    
    const data = await ehrConnector.fetchPatientData(connectionId, patientId, options);
    res.json({
      data,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Fetch data from multiple EHR systems concurrently
app.post('/api/ehr/fetch-multiple', async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json({
        error: 'Requests must be an array',
        disclaimer: 'For physician review only'
      });
    }
    
    const results = await ehrConnector.fetchFromMultipleSystems(requests);
    res.json({
      ...results,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Sync patient data
app.post('/api/ehr/:connectionId/sync/:patientId', async (req, res) => {
  try {
    const { connectionId, patientId } = req.params;
    const result = await ehrConnector.syncPatientData(connectionId, patientId);
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

// Check connection health
app.get('/api/ehr/:connectionId/health', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const health = await ehrConnector.checkConnectionHealth(connectionId);
    res.json({
      ...health,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get all active connections
app.get('/api/ehr/connections', (req, res) => {
  try {
    const connections = ehrConnector.getActiveConnections();
    res.json({
      connections,
      count: connections.length,
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Remove connection
app.delete('/api/ehr/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const result = await ehrConnector.removeConnection(connectionId);
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

// Clear cache
app.post('/api/ehr/cache/clear', (req, res) => {
  try {
    const { connectionId } = req.body;
    ehrConnector.clearCache(connectionId);
    res.json({
      status: 'success',
      message: connectionId ? `Cache cleared for connection ${connectionId}` : 'All cache cleared',
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    res.status(500).json({
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
    console.log(`EHR Connector Service running on port ${PORT}`);
    console.log('For physician review only');
  });
}

module.exports = app;
