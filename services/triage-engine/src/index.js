/**
 * Triage Engine Service - Main Entry Point
 * For physician review only
 */

const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
const { body, param, query, validationResult } = require('express-validator');
require('dotenv').config();

const { dbManager } = require('../../shared/config/database');
const { clinicalSafetyValidation } = require('../../shared/utils/validation');
const TriageService = require('./services/triage-service');
const WebSocketServer = require('./websocket-server');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(clinicalSafetyValidation.requireDisclaimer);

// Initialize services
let triageService;
let wsServer;
let realTimeRiskService;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'medassist-triage-engine',
    timestamp: new Date().toISOString(),
    disclaimer: 'For physician review only'
  });
});

// Calculate triage priority for a patient
app.post('/calculate-priority', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('patientData.id').notEmpty().withMessage('Patient ID is required'),
  body('tenantId').isUUID().withMessage('Valid tenant ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        disclaimer: 'For physician review only'
      });
    }

    const { patientData, tenantId } = req.body;
    const result = await triageService.calculateTriagePriority(patientData, tenantId);
    
    logger.info(`Triage calculated for patient ${patientData.id}`, {
      patientId: patientData.id,
      priority: result.triageScore.priorityLevel,
      score: result.triageScore.urgencyScore,
      tenantId
    });

    res.json(result);
  } catch (error) {
    logger.error('Triage calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate triage priority',
      message: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get patient queue ordered by priority
app.get('/queue/:tenantId', [
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  query('priorityLevel').optional().isIn(['CRITICAL', 'HIGH', 'NORMAL']).withMessage('Invalid priority level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        disclaimer: 'For physician review only'
      });
    }

    const { tenantId } = req.params;
    const filters = {};
    if (req.query.priorityLevel) {
      filters.priorityLevel = req.query.priorityLevel;
    }

    const queue = await triageService.getPatientQueue(tenantId, filters);
    
    res.json({
      queue,
      totalPatients: queue.length,
      timestamp: new Date().toISOString(),
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    logger.error('Queue retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patient queue',
      message: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Update triage priority for a patient
app.put('/priority/:patientId', [
  param('patientId').isUUID().withMessage('Valid patient ID is required'),
  body('newPriority').isIn(['CRITICAL', 'HIGH', 'NORMAL']).withMessage('Invalid priority level'),
  body('physicianId').isUUID().withMessage('Valid physician ID is required'),
  body('tenantId').isUUID().withMessage('Valid tenant ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        disclaimer: 'For physician review only'
      });
    }

    const { patientId } = req.params;
    const { newPriority, physicianId, tenantId } = req.body;
    
    const result = await triageService.updateTriagePriority(patientId, newPriority, physicianId, tenantId);
    
    logger.info(`Triage priority updated for patient ${patientId}`, {
      patientId,
      newPriority,
      physicianId,
      tenantId
    });

    res.json(result);
  } catch (error) {
    logger.error('Priority update error:', error);
    res.status(500).json({
      error: 'Failed to update triage priority',
      message: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get triage statistics
app.get('/statistics/:tenantId', [
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  query('timeRange').optional().isIn(['1h', '6h', '24h', '7d']).withMessage('Invalid time range')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        disclaimer: 'For physician review only'
      });
    }

    const { tenantId } = req.params;
    const timeRange = req.query.timeRange || '24h';
    
    const statistics = await triageService.getTriageStatistics(tenantId, timeRange);
    
    res.json(statistics);
  } catch (error) {
    logger.error('Statistics retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve triage statistics',
      message: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Queue real-time risk update
app.post('/queue-risk-update', [
  body('patientId').isUUID().withMessage('Valid patient ID is required'),
  body('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  body('changeType').isIn(['vital_signs', 'medication', 'lab_result', 'history']).withMessage('Invalid change type'),
  body('changeData').isObject().withMessage('Change data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        disclaimer: 'For physician review only'
      });
    }

    const { patientId, tenantId, changeType, changeData } = req.body;
    
    const updateId = await realTimeRiskService.queueRiskUpdate(
      patientId, 
      tenantId, 
      changeType, 
      changeData
    );
    
    logger.info(`Risk update queued for patient ${patientId}`, {
      patientId,
      tenantId,
      changeType,
      updateId
    });

    res.json({
      success: true,
      updateId,
      message: 'Risk update queued for processing',
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    logger.error('Risk update queue error:', error);
    res.status(500).json({
      error: 'Failed to queue risk update',
      message: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Get real-time risk update status
app.get('/risk-update-status/:patientId/:tenantId', [
  param('patientId').isUUID().withMessage('Valid patient ID is required'),
  param('tenantId').isUUID().withMessage('Valid tenant ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        disclaimer: 'For physician review only'
      });
    }

    const { patientId, tenantId } = req.params;
    
    // Get recent risk assessments
    const query = `
      SELECT * FROM risk_assessments_realtime 
      WHERE patient_id = $1 AND tenant_id = $2 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const result = await dbManager.executeQuery(query, [patientId, tenantId]);
    
    res.json({
      patientId,
      tenantId,
      recentAssessments: result.rows,
      timestamp: new Date().toISOString(),
      disclaimer: 'For physician review only'
    });
  } catch (error) {
    logger.error('Risk status retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve risk update status',
      message: error.message,
      disclaimer: 'For physician review only'
    });
  }
});
app.post('/recalculate/:tenantId', [
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  body('physicianId').isUUID().withMessage('Valid physician ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
        disclaimer: 'For physician review only'
      });
    }

    const { tenantId } = req.params;
    const { physicianId } = req.body;
    
    const result = await triageService.recalculateAllTriage(tenantId);
    
    logger.info(`Triage recalculated for tenant ${tenantId}`, {
      tenantId,
      physicianId,
      recalculatedCount: result.recalculatedCount
    });

    res.json(result);
  } catch (error) {
    logger.error('Recalculation error:', error);
    res.status(500).json({
      error: 'Failed to recalculate triage',
      message: error.message,
      disclaimer: 'For physician review only'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    disclaimer: 'For physician review only'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    disclaimer: 'For physician review only'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await dbManager.initializePostgreSQL();
    await dbManager.initializeRedis();
    
    triageService = new TriageService(dbManager);
    
    // Initialize WebSocket server for real-time updates
    wsServer = new WebSocketServer(server, dbManager);
    realTimeRiskService = wsServer.getRealTimeRiskService();
    
    server.listen(PORT, () => {
      logger.info(`Triage Engine Service running on port ${PORT}`);
      logger.info('WebSocket server enabled for real-time risk updates');
      logger.info('Clinical Decision Support System - For physician review only');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (wsServer) {
    wsServer.close();
  }
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (wsServer) {
    wsServer.close();
  }
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, wsServer };