/**
 * Real-time Risk Update Service - Event-driven Risk Recalculation
 * For physician review only
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const { RiskScoringModel } = require('../models/risk-scoring');
const TriageService = require('./triage-service');
const { v4: uuidv4 } = require('uuid');

class RealTimeRiskService extends EventEmitter {
  constructor(dbManager, wsServer = null) {
    super();
    this.dbManager = dbManager;
    this.riskModel = new RiskScoringModel();
    this.triageService = new TriageService(dbManager);
    this.wsServer = wsServer;
    this.activeConnections = new Map(); // tenantId -> Set of WebSocket connections
    this.riskUpdateQueue = new Map(); // patientId -> pending updates
    this.processingInterval = null;
    
    // Risk change thresholds
    this.riskThresholds = {
      significantChange: 10, // Points change to trigger notification
      criticalChange: 20,    // Points change to trigger immediate alert
      priorityChange: true   // Any priority level change triggers notification
    };
    
    this.startProcessing();
  }

  /**
   * Start the real-time processing system
   */
  startProcessing() {
    // Process risk updates every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueuedUpdates();
    }, 5000);
    
    console.log('Real-time risk update service started');
  }

  /**
   * Stop the real-time processing system
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    console.log('Real-time risk update service stopped');
  }

  /**
   * Register WebSocket connection for a tenant
   */
  registerConnection(ws, tenantId, physicianId) {
    if (!this.activeConnections.has(tenantId)) {
      this.activeConnections.set(tenantId, new Set());
    }
    
    // Add connection metadata
    ws.tenantId = tenantId;
    ws.physicianId = physicianId;
    ws.connectionId = uuidv4();
    
    this.activeConnections.get(tenantId).add(ws);
    
    // Handle connection close
    ws.on('close', () => {
      this.unregisterConnection(ws, tenantId);
    });
    
    // Send initial connection confirmation
    this.sendToConnection(ws, {
      type: 'connection_established',
      connectionId: ws.connectionId,
      message: 'Real-time risk updates enabled',
      disclaimer: 'For physician review only'
    });
    
    console.log(`WebSocket connection registered for tenant ${tenantId}, physician ${physicianId}`);
  }

  /**
   * Unregister WebSocket connection
   */
  unregisterConnection(ws, tenantId) {
    if (this.activeConnections.has(tenantId)) {
      this.activeConnections.get(tenantId).delete(ws);
      
      if (this.activeConnections.get(tenantId).size === 0) {
        this.activeConnections.delete(tenantId);
      }
    }
    
    console.log(`WebSocket connection unregistered for tenant ${tenantId}`);
  }

  /**
   * Queue a patient for risk recalculation
   */
  async queueRiskUpdate(patientId, tenantId, changeType, changeData) {
    const updateId = uuidv4();
    const update = {
      id: updateId,
      patientId,
      tenantId,
      changeType, // 'vital_signs', 'medication', 'lab_result', 'history'
      changeData,
      timestamp: new Date(),
      processed: false
    };
    
    // Store in queue
    if (!this.riskUpdateQueue.has(patientId)) {
      this.riskUpdateQueue.set(patientId, []);
    }
    this.riskUpdateQueue.get(patientId).push(update);
    
    // Emit event for immediate processing if critical
    if (this.isCriticalChange(changeType, changeData)) {
      await this.processPatientRiskUpdate(patientId);
    }
    
    return updateId;
  }

  /**
   * Process all queued risk updates
   */
  async processQueuedUpdates() {
    const patientIds = Array.from(this.riskUpdateQueue.keys());
    
    for (const patientId of patientIds) {
      try {
        await this.processPatientRiskUpdate(patientId);
      } catch (error) {
        console.error(`Error processing risk update for patient ${patientId}:`, error);
      }
    }
  }

  /**
   * Process risk updates for a specific patient
   */
  async processPatientRiskUpdate(patientId) {
    const updates = this.riskUpdateQueue.get(patientId);
    if (!updates || updates.length === 0) {
      return;
    }
    
    // Get the most recent update
    const latestUpdate = updates[updates.length - 1];
    const { tenantId } = latestUpdate;
    
    try {
      // Get current patient data
      const patientData = await this.getPatientData(patientId, tenantId);
      if (!patientData) {
        console.warn(`Patient data not found for ${patientId}`);
        return;
      }
      
      // Get previous risk assessment
      const previousRisk = await this.getPreviousRiskAssessment(patientId, tenantId);
      
      // Calculate new risk assessment
      const newRiskAssessment = this.riskModel.calculateRiskScores(patientData);
      
      // Compare with previous assessment
      const riskChanges = this.compareRiskAssessments(previousRisk, newRiskAssessment);
      
      // Update triage priority if needed
      if (riskChanges.significantChange || riskChanges.priorityChanged) {
        await this.updateTriagePriority(patientId, newRiskAssessment, tenantId);
      }
      
      // Send notifications if changes are significant
      if (riskChanges.shouldNotify) {
        await this.sendRiskChangeNotifications(patientId, tenantId, riskChanges, newRiskAssessment);
      }
      
      // Store new risk assessment
      await this.storeRiskAssessment(patientId, tenantId, newRiskAssessment, latestUpdate.changeType);
      
      // Mark updates as processed
      updates.forEach(update => update.processed = true);
      this.riskUpdateQueue.delete(patientId);
      
      // Emit event for successful processing
      this.emit('riskUpdated', {
        patientId,
        tenantId,
        riskChanges,
        newRiskAssessment,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error(`Failed to process risk update for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Compare risk assessments to detect changes
   */
  compareRiskAssessments(previousRisk, newRisk) {
    if (!previousRisk) {
      return {
        significantChange: true,
        priorityChanged: false,
        shouldNotify: true,
        changes: ['Initial risk assessment'],
        scoreDifference: newRisk.overallRisk.score
      };
    }
    
    const scoreDifference = Math.abs(newRisk.overallRisk.score - previousRisk.overallRisk.score);
    const priorityChanged = newRisk.overallRisk.level !== previousRisk.overallRisk.level;
    const significantChange = scoreDifference >= this.riskThresholds.significantChange;
    const criticalChange = scoreDifference >= this.riskThresholds.criticalChange;
    
    const changes = [];
    
    // Check overall risk changes
    if (priorityChanged) {
      changes.push(`Priority changed from ${previousRisk.overallRisk.level} to ${newRisk.overallRisk.level}`);
    }
    
    if (significantChange) {
      changes.push(`Overall risk score changed by ${scoreDifference} points`);
    }
    
    // Check category-specific changes
    const categories = ['cardiac', 'respiratory', 'infection', 'medication'];
    for (const category of categories) {
      const prevScore = previousRisk.riskCategories[category]?.score || 0;
      const newScore = newRisk.riskCategories[category]?.score || 0;
      const categoryDiff = Math.abs(newScore - prevScore);
      
      if (categoryDiff >= this.riskThresholds.significantChange) {
        changes.push(`${category} risk changed by ${categoryDiff} points`);
      }
    }
    
    return {
      significantChange,
      criticalChange,
      priorityChanged,
      shouldNotify: significantChange || priorityChanged,
      changes,
      scoreDifference
    };
  }

  /**
   * Update triage priority based on new risk assessment
   */
  async updateTriagePriority(patientId, riskAssessment, tenantId) {
    const newPriority = this.determinePriorityLevel(riskAssessment.overallRisk.score);
    
    try {
      await this.triageService.updateTriagePriority(
        patientId, 
        newPriority, 
        'system-auto-update', 
        tenantId
      );
      
      console.log(`Updated triage priority for patient ${patientId} to ${newPriority}`);
    } catch (error) {
      console.error(`Failed to update triage priority for patient ${patientId}:`, error);
    }
  }

  /**
   * Send risk change notifications via WebSocket
   */
  async sendRiskChangeNotifications(patientId, tenantId, riskChanges, newRiskAssessment) {
    const notification = {
      type: 'risk_change_alert',
      patientId,
      tenantId,
      timestamp: new Date().toISOString(),
      priority: riskChanges.criticalChange ? 'CRITICAL' : 'HIGH',
      changes: riskChanges.changes,
      newRiskScore: newRiskAssessment.overallRisk.score,
      newRiskLevel: newRiskAssessment.overallRisk.level,
      scoreDifference: riskChanges.scoreDifference,
      recommendations: this.generateRiskChangeRecommendations(riskChanges, newRiskAssessment),
      disclaimer: 'For physician review only'
    };
    
    // Send to all connected clients for this tenant
    await this.broadcastToTenant(tenantId, notification);
    
    // Log the notification
    await this.logRiskChangeNotification(patientId, tenantId, notification);
  }

  /**
   * Generate recommendations based on risk changes
   */
  generateRiskChangeRecommendations(riskChanges, riskAssessment) {
    const recommendations = [];
    
    if (riskChanges.criticalChange) {
      recommendations.push('Immediate physician evaluation recommended');
      recommendations.push('Consider continuous monitoring');
    } else if (riskChanges.significantChange) {
      recommendations.push('Physician review recommended within 30 minutes');
      recommendations.push('Monitor vital signs closely');
    }
    
    if (riskChanges.priorityChanged) {
      recommendations.push(`Patient priority updated to ${riskAssessment.overallRisk.level}`);
    }
    
    // Add category-specific recommendations
    for (const [category, risk] of Object.entries(riskAssessment.riskCategories)) {
      if (risk.score > 60 && risk.recommendations) {
        recommendations.push(...risk.recommendations);
      }
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Broadcast message to all connections for a tenant
   */
  async broadcastToTenant(tenantId, message) {
    const connections = this.activeConnections.get(tenantId);
    if (!connections || connections.size === 0) {
      return;
    }
    
    const messageStr = JSON.stringify(message);
    const deadConnections = new Set();
    
    for (const ws of connections) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        } else {
          deadConnections.add(ws);
        }
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        deadConnections.add(ws);
      }
    }
    
    // Clean up dead connections
    for (const deadWs of deadConnections) {
      connections.delete(deadWs);
    }
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(ws, message) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending WebSocket message to connection:', error);
    }
  }

  /**
   * Check if a change is critical and needs immediate processing
   */
  isCriticalChange(changeType, changeData) {
    switch (changeType) {
      case 'vital_signs':
        return this.isCriticalVitalChange(changeData);
      case 'lab_result':
        return this.isCriticalLabChange(changeData);
      case 'medication':
        return this.isCriticalMedicationChange(changeData);
      default:
        return false;
    }
  }

  /**
   * Check if vital sign change is critical
   */
  isCriticalVitalChange(vitalData) {
    if (!vitalData) return false;
    
    // Critical vital sign thresholds
    if (vitalData.bp) {
      const [systolic, diastolic] = vitalData.bp.split('/').map(Number);
      if (systolic > 180 || systolic < 90 || diastolic > 110 || diastolic < 60) {
        return true;
      }
    }
    
    if (vitalData.hr) {
      const hr = parseInt(vitalData.hr);
      if (hr > 120 || hr < 50) return true;
    }
    
    if (vitalData.temp) {
      const temp = parseFloat(vitalData.temp);
      if (temp > 103 || temp < 95) return true;
    }
    
    if (vitalData.spo2) {
      const spo2 = parseInt(vitalData.spo2);
      if (spo2 < 90) return true;
    }
    
    return false;
  }

  /**
   * Check if lab result change is critical
   */
  isCriticalLabChange(labData) {
    if (!labData || !labData.is_abnormal) return false;
    
    // Critical lab value thresholds
    const criticalLabs = ['WBC', 'Glucose', 'Creatinine', 'Potassium'];
    return criticalLabs.includes(labData.test_name);
  }

  /**
   * Check if medication change is critical
   */
  isCriticalMedicationChange(medicationData) {
    if (!medicationData) return false;
    
    const highRiskMeds = ['warfarin', 'heparin', 'insulin', 'digoxin'];
    const medName = (medicationData.name || '').toLowerCase();
    
    return highRiskMeds.some(hrm => medName.includes(hrm));
  }

  // Helper methods

  /**
   * Get patient data from database
   */
  async getPatientData(patientId, tenantId) {
    const query = `
      SELECT p.*, 
             p.vitals,
             p.past_history,
             p.current_medications,
             p.lab_results
      FROM patients p
      WHERE p.id = $1 AND p.tenant_id = $2
    `;
    
    const result = await this.dbManager.executeQuery(query, [patientId, tenantId]);
    return result.rows[0] || null;
  }

  /**
   * Get previous risk assessment
   */
  async getPreviousRiskAssessment(patientId, tenantId) {
    const query = `
      SELECT risk_assessment
      FROM risk_assessments
      WHERE patient_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await this.dbManager.executeQuery(query, [patientId, tenantId]);
    return result.rows[0]?.risk_assessment || null;
  }

  /**
   * Store risk assessment in database
   */
  async storeRiskAssessment(patientId, tenantId, riskAssessment, changeType) {
    const query = `
      INSERT INTO risk_assessments (
        id, patient_id, tenant_id, risk_assessment, 
        change_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await this.dbManager.executeQuery(query, [
      uuidv4(),
      patientId,
      tenantId,
      JSON.stringify(riskAssessment),
      changeType
    ]);
  }

  /**
   * Log risk change notification
   */
  async logRiskChangeNotification(patientId, tenantId, notification) {
    const query = `
      INSERT INTO risk_change_notifications (
        id, patient_id, tenant_id, notification_data, 
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `;
    
    await this.dbManager.executeQuery(query, [
      uuidv4(),
      patientId,
      tenantId,
      JSON.stringify(notification)
    ]);
  }

  /**
   * Determine priority level from risk score
   */
  determinePriorityLevel(riskScore) {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    return 'NORMAL';
  }
}

module.exports = RealTimeRiskService;