const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'medassist-api-gateway',
    disclaimer: 'For physician review only'
  });
});

// Service proxy configurations
const services = {
  '/api/triage': {
    target: process.env.TRIAGE_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/triage': '' }
  },
  '/api/ai': {
    target: process.env.AI_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '' }
  },
  '/api/safety': {
    target: process.env.SAFETY_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/safety': '' }
  },
  '/api/workflow': {
    target: process.env.WORKFLOW_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/workflow': '' }
  },
  '/api/alerts': {
    target: process.env.ALERT_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/alerts': '' }
  },
  '/api/fhir': {
    target: process.env.FHIR_SERVICE_URL || 'http://localhost:3006',
    changeOrigin: true,
    pathRewrite: { '^/api/fhir': '' }
  },
  '/api/ehr': {
    target: process.env.EHR_SERVICE_URL || 'http://localhost:3007',
    changeOrigin: true,
    pathRewrite: { '^/api/ehr': '' }
  },
  '/api/devices': {
    target: process.env.DEVICE_SERVICE_URL || 'http://localhost:3008',
    changeOrigin: true,
    pathRewrite: { '^/api/devices': '' }
  }
};

// Set up proxies for each service
Object.entries(services).forEach(([path, config]) => {
  app.use(path, createProxyMiddleware({
    ...config,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${path}:`, err);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        disclaimer: 'For physician review only'
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.info(`Proxying ${req.method} ${req.url} to ${config.target}`);
    }
  }));
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

app.listen(PORT, () => {
  logger.info(`MedAssist API Gateway running on port ${PORT}`);
  logger.info('Clinical Decision Support System - For physician review only');
});

module.exports = app;