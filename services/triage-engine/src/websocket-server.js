/**
 * WebSocket Server for Real-time Risk Updates
 * For physician review only
 */

const WebSocket = require('ws');
const url = require('url');
const RealTimeRiskService = require('./services/real-time-risk-service');

class WebSocketServer {
  constructor(server, dbManager) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/risk-updates',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.dbManager = dbManager;
    this.realTimeRiskService = new RealTimeRiskService(dbManager, this.wss);
    
    this.setupWebSocketHandlers();
    console.log('WebSocket server initialized for real-time risk updates');
  }

  /**
   * Verify client connection
   */
  verifyClient(info) {
    try {
      const query = url.parse(info.req.url, true).query;
      
      // Basic validation - in production, add proper authentication
      if (!query.tenantId || !query.physicianId) {
        console.warn('WebSocket connection rejected: missing tenantId or physicianId');
        return false;
      }
      
      // Store query parameters for later use
      info.req.tenantId = query.tenantId;
      info.req.physicianId = query.physicianId;
      
      return true;
    } catch (error) {
      console.error('Error verifying WebSocket client:', error);
      return false;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      const tenantId = req.tenantId;
      const physicianId = req.physicianId;
      
      console.log(`WebSocket connection established for tenant ${tenantId}, physician ${physicianId}`);
      
      // Register connection with real-time service
      this.realTimeRiskService.registerConnection(ws, tenantId, physicianId);
      
      // Handle incoming messages
      ws.on('message', (message) => {
        this.handleMessage(ws, message, tenantId, physicianId);
      });
      
      // Handle connection errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for tenant ${tenantId}:`, error);
      });
      
      // Handle connection close
      ws.on('close', (code, reason) => {
        console.log(`WebSocket connection closed for tenant ${tenantId}: ${code} ${reason}`);
      });
      
      // Send initial connection message
      this.sendMessage(ws, {
        type: 'connection_established',
        message: 'Real-time risk updates enabled',
        tenantId,
        physicianId,
        timestamp: new Date().toISOString(),
        disclaimer: 'For physician review only'
      });
    });
    
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(ws, message, tenantId, physicianId) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'ping':
          this.sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
          
        case 'subscribe_patient':
          await this.handlePatientSubscription(ws, data, tenantId, physicianId);
          break;
          
        case 'unsubscribe_patient':
          await this.handlePatientUnsubscription(ws, data, tenantId, physicianId);
          break;
          
        case 'acknowledge_alert':
          await this.handleAlertAcknowledgment(ws, data, tenantId, physicianId);
          break;
          
        case 'request_patient_status':
          await this.handlePatientStatusRequest(ws, data, tenantId, physicianId);
          break;
          
        default:
          this.sendMessage(ws, {
            type: 'error',
            message: `Unknown message type: ${data.type}`,
            disclaimer: 'For physician review only'
          });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendMessage(ws, {
        type: 'error',
        message: 'Invalid message format',
        disclaimer: 'For physician review only'
      });
    }
  }

  /**
   * Handle patient subscription
   */
  async handlePatientSubscription(ws, data, tenantId, physicianId) {
    const { patientId } = data;
    
    if (!patientId) {
      this.sendMessage(ws, {
        type: 'error',
        message: 'Patient ID required for subscription',
        disclaimer: 'For physician review only'
      });
      return;
    }
    
    // Add patient to connection's subscription list
    if (!ws.subscribedPatients) {
      ws.subscribedPatients = new Set();
    }
    ws.subscribedPatients.add(patientId);
    
    // Send current patient risk status
    try {
      const patientData = await this.realTimeRiskService.getPatientData(patientId, tenantId);
      if (patientData) {
        const riskAssessment = this.realTimeRiskService.riskModel.calculateRiskScores(patientData);
        
        this.sendMessage(ws, {
          type: 'patient_subscribed',
          patientId,
          currentRiskAssessment: riskAssessment,
          timestamp: new Date().toISOString(),
          disclaimer: 'For physician review only'
        });
      }
    } catch (error) {
      console.error(`Error getting patient data for subscription: ${error.message}`);
      this.sendMessage(ws, {
        type: 'subscription_error',
        patientId,
        message: 'Failed to get current patient status',
        disclaimer: 'For physician review only'
      });
    }
  }

  /**
   * Handle patient unsubscription
   */
  async handlePatientUnsubscription(ws, data, tenantId, physicianId) {
    const { patientId } = data;
    
    if (ws.subscribedPatients) {
      ws.subscribedPatients.delete(patientId);
    }
    
    this.sendMessage(ws, {
      type: 'patient_unsubscribed',
      patientId,
      timestamp: new Date().toISOString(),
      disclaimer: 'For physician review only'
    });
  }

  /**
   * Handle alert acknowledgment
   */
  async handleAlertAcknowledgment(ws, data, tenantId, physicianId) {
    const { alertId, patientId } = data;
    
    try {
      // Update alert acknowledgment in database
      const query = `
        UPDATE risk_change_notifications 
        SET acknowledged = true, 
            acknowledged_by = $1, 
            acknowledged_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING *
      `;
      
      const result = await this.dbManager.executeQuery(query, [physicianId, alertId, tenantId]);
      
      if (result.rows.length > 0) {
        this.sendMessage(ws, {
          type: 'alert_acknowledged',
          alertId,
          patientId,
          acknowledgedBy: physicianId,
          timestamp: new Date().toISOString(),
          disclaimer: 'For physician review only'
        });
        
        // Broadcast acknowledgment to other connected physicians for this tenant
        this.realTimeRiskService.broadcastToTenant(tenantId, {
          type: 'alert_acknowledged_broadcast',
          alertId,
          patientId,
          acknowledgedBy: physicianId,
          timestamp: new Date().toISOString(),
          disclaimer: 'For physician review only'
        });
      } else {
        this.sendMessage(ws, {
          type: 'error',
          message: 'Alert not found or already acknowledged',
          disclaimer: 'For physician review only'
        });
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      this.sendMessage(ws, {
        type: 'error',
        message: 'Failed to acknowledge alert',
        disclaimer: 'For physician review only'
      });
    }
  }

  /**
   * Handle patient status request
   */
  async handlePatientStatusRequest(ws, data, tenantId, physicianId) {
    const { patientId } = data;
    
    try {
      const patientData = await this.realTimeRiskService.getPatientData(patientId, tenantId);
      if (!patientData) {
        this.sendMessage(ws, {
          type: 'error',
          message: 'Patient not found',
          disclaimer: 'For physician review only'
        });
        return;
      }
      
      const riskAssessment = this.realTimeRiskService.riskModel.calculateRiskScores(patientData);
      
      // Get recent alerts for this patient
      const alertsQuery = `
        SELECT * FROM risk_change_notifications 
        WHERE patient_id = $1 AND tenant_id = $2 
        ORDER BY sent_at DESC 
        LIMIT 5
      `;
      const alertsResult = await this.dbManager.executeQuery(alertsQuery, [patientId, tenantId]);
      
      this.sendMessage(ws, {
        type: 'patient_status_response',
        patientId,
        riskAssessment,
        recentAlerts: alertsResult.rows,
        timestamp: new Date().toISOString(),
        disclaimer: 'For physician review only'
      });
    } catch (error) {
      console.error('Error getting patient status:', error);
      this.sendMessage(ws, {
        type: 'error',
        message: 'Failed to get patient status',
        disclaimer: 'For physician review only'
      });
    }
  }

  /**
   * Send message to WebSocket connection
   */
  sendMessage(ws, message) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  /**
   * Broadcast message to all connections for a tenant
   */
  broadcastToTenant(tenantId, message) {
    this.realTimeRiskService.broadcastToTenant(tenantId, message);
  }

  /**
   * Get real-time risk service instance
   */
  getRealTimeRiskService() {
    return this.realTimeRiskService;
  }

  /**
   * Close WebSocket server
   */
  close() {
    this.realTimeRiskService.stopProcessing();
    this.wss.close();
    console.log('WebSocket server closed');
  }
}

module.exports = WebSocketServer;