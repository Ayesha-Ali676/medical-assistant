/**
 * Alert Management Service
 * Real-time alert generation, prioritization, and tracking
 * Requirements: 1.1, 8.2
 */

class AlertService {
  constructor() {
    this.alerts = new Map();
    this.alertHistory = [];
    this.alertRules = this.initializeAlertRules();
    this.escalationPolicies = this.initializeEscalationPolicies();
  }

  /**
   * Initialize alert rules for different clinical scenarios
   */
  initializeAlertRules() {
    return {
      vitalSigns: {
        criticalBP: { systolic: { min: 70, max: 180 }, diastolic: { min: 40, max: 110 } },
        criticalHR: { min: 40, max: 130 },
        criticalTemp: { min: 35.0, max: 39.5 },
        criticalO2: { min: 88, max: 100 },
      },
      labResults: {
        criticalGlucose: { min: 40, max: 400 },
        criticalPotassium: { min: 2.5, max: 6.0 },
        criticalSodium: { min: 120, max: 160 },
        criticalCreatinine: { min: 0, max: 5.0 },
      },
      medications: {
        drugInteraction: { severity: ['high', 'critical'] },
        contraindication: { severity: ['critical'] },
        allergyConflict: { severity: ['critical'] },
      },
    };
  }

  /**
   * Initialize escalation policies
   */
  initializeEscalationPolicies() {
    return {
      CRITICAL: {
        notifyImmediately: true,
        escalateAfter: 5, // minutes
        notifyChannels: ['push', 'sms', 'email'],
        requireAcknowledgment: true,
      },
      HIGH: {
        notifyImmediately: true,
        escalateAfter: 15,
        notifyChannels: ['push', 'email'],
        requireAcknowledgment: true,
      },
      MEDIUM: {
        notifyImmediately: false,
        escalateAfter: 60,
        notifyChannels: ['push'],
        requireAcknowledgment: false,
      },
      LOW: {
        notifyImmediately: false,
        escalateAfter: null,
        notifyChannels: ['email'],
        requireAcknowledgment: false,
      },
    };
  }

  /**
   * Generate alert from clinical data
   * @param {Object} data - Clinical data that triggered the alert
   * @param {string} type - Alert type (vitals, labs, medications, etc.)
   * @returns {Object} - Generated alert
   */
  generateAlert(data, type) {
    const alert = {
      id: this.generateAlertId(),
      type,
      severity: this.determineSeverity(data, type),
      message: this.generateAlertMessage(data, type),
      timestamp: new Date().toISOString(),
      patientId: data.patientId,
      data,
      acknowledged: false,
      escalated: false,
      resolvedAt: null,
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push({ ...alert, action: 'created' });

    return alert;
  }

  /**
   * Generate unique alert ID
   * @returns {string} - Alert ID
   */
  generateAlertId() {
    return `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine alert severity based on data and type
   * @param {Object} data - Clinical data
   * @param {string} type - Alert type
   * @returns {string} - Severity level
   */
  determineSeverity(data, type) {
    switch (type) {
      case 'vitals':
        return this.determineVitalsSeverity(data);
      case 'labs':
        return this.determineLabsSeverity(data);
      case 'medications':
        return this.determineMedicationsSeverity(data);
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Determine severity for vital signs alerts
   * @param {Object} vitals - Vital signs data
   * @returns {string} - Severity level
   */
  determineVitalsSeverity(vitals) {
    const rules = this.alertRules.vitalSigns;

    // Check for critical vital signs
    if (vitals.systolicBP) {
      if (vitals.systolicBP < rules.criticalBP.systolic.min || 
          vitals.systolicBP > rules.criticalBP.systolic.max) {
        return 'CRITICAL';
      }
    }

    if (vitals.heartRate) {
      if (vitals.heartRate < rules.criticalHR.min || 
          vitals.heartRate > rules.criticalHR.max) {
        return 'CRITICAL';
      }
    }

    if (vitals.oxygenSaturation && vitals.oxygenSaturation < rules.criticalO2.min) {
      return 'CRITICAL';
    }

    // If not critical, check for high priority
    if (vitals.systolicBP > 160 || vitals.diastolicBP > 100) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  /**
   * Determine severity for lab results alerts
   * @param {Object} labs - Lab results data
   * @returns {string} - Severity level
   */
  determineLabsSeverity(labs) {
    const rules = this.alertRules.labResults;

    if (labs.glucose) {
      if (labs.glucose < rules.criticalGlucose.min || 
          labs.glucose > rules.criticalGlucose.max) {
        return 'CRITICAL';
      }
    }

    if (labs.potassium) {
      if (labs.potassium < rules.criticalPotassium.min || 
          labs.potassium > rules.criticalPotassium.max) {
        return 'CRITICAL';
      }
    }

    if (labs.abnormalCount && labs.abnormalCount >= 3) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  /**
   * Determine severity for medication alerts
   * @param {Object} medications - Medication data
   * @returns {string} - Severity level
   */
  determineMedicationsSeverity(medications) {
    if (medications.allergyConflict || medications.contraindication) {
      return 'CRITICAL';
    }

    if (medications.drugInteraction && medications.interactionSeverity === 'high') {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  /**
   * Generate alert message
   * @param {Object} data - Clinical data
   * @param {string} type - Alert type
   * @returns {string} - Alert message
   */
  generateAlertMessage(data, type) {
    switch (type) {
      case 'vitals':
        return this.generateVitalsMessage(data);
      case 'labs':
        return this.generateLabsMessage(data);
      case 'medications':
        return this.generateMedicationsMessage(data);
      default:
        return 'Clinical alert requires attention';
    }
  }

  /**
   * Generate message for vital signs alert
   * @param {Object} vitals - Vital signs data
   * @returns {string} - Alert message
   */
  generateVitalsMessage(vitals) {
    const issues = [];

    if (vitals.systolicBP > 180 || vitals.systolicBP < 70) {
      issues.push(`Critical BP: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg`);
    }

    if (vitals.heartRate > 130 || vitals.heartRate < 40) {
      issues.push(`Critical HR: ${vitals.heartRate} bpm`);
    }

    if (vitals.oxygenSaturation < 88) {
      issues.push(`Critical O2: ${vitals.oxygenSaturation}%`);
    }

    return issues.length > 0 
      ? issues.join('; ') 
      : 'Abnormal vital signs detected';
  }

  /**
   * Generate message for lab results alert
   * @param {Object} labs - Lab results data
   * @returns {string} - Alert message
   */
  generateLabsMessage(labs) {
    if (labs.abnormalResults) {
      return `${labs.abnormalResults.length} abnormal lab result(s): ${labs.abnormalResults.join(', ')}`;
    }
    return 'Abnormal lab results require review';
  }

  /**
   * Generate message for medication alert
   * @param {Object} medications - Medication data
   * @returns {string} - Alert message
   */
  generateMedicationsMessage(medications) {
    if (medications.allergyConflict) {
      return `ALLERGY ALERT: ${medications.medication} conflicts with known allergy`;
    }

    if (medications.drugInteraction) {
      return `Drug interaction: ${medications.medication} with ${medications.interactsWith}`;
    }

    return 'Medication alert requires review';
  }

  /**
   * Prioritize alerts based on severity and age
   * @param {Array} alerts - List of alerts
   * @returns {Array} - Prioritized alerts
   */
  prioritizeAlerts(alerts) {
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };

    return alerts.sort((a, b) => {
      // First sort by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by timestamp (older first)
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
  }

  /**
   * Acknowledge alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User who acknowledged
   * @returns {Object} - Updated alert
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();

    this.alertHistory.push({ ...alert, action: 'acknowledged', userId });

    return alert;
  }

  /**
   * Resolve alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User who resolved
   * @param {string} resolution - Resolution notes
   * @returns {Object} - Updated alert
   */
  resolveAlert(alertId, userId, resolution) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = userId;
    alert.resolution = resolution;

    this.alertHistory.push({ ...alert, action: 'resolved', userId, resolution });

    return alert;
  }

  /**
   * Get active alerts for a patient
   * @param {string} patientId - Patient ID
   * @returns {Array} - Active alerts
   */
  getActiveAlerts(patientId) {
    const alerts = Array.from(this.alerts.values())
      .filter(alert => alert.patientId === patientId && !alert.resolvedAt);

    return this.prioritizeAlerts(alerts);
  }

  /**
   * Get all active alerts
   * @returns {Array} - All active alerts
   */
  getAllActiveAlerts() {
    const alerts = Array.from(this.alerts.values())
      .filter(alert => !alert.resolvedAt);

    return this.prioritizeAlerts(alerts);
  }

  /**
   * Check if alert should be escalated
   * @param {Object} alert - Alert to check
   * @returns {boolean} - True if should escalate
   */
  shouldEscalate(alert) {
    if (alert.escalated || alert.acknowledged || alert.resolvedAt) {
      return false;
    }

    const policy = this.escalationPolicies[alert.severity];
    if (!policy.escalateAfter) {
      return false;
    }

    const alertAge = Date.now() - new Date(alert.timestamp).getTime();
    const escalateAfterMs = policy.escalateAfter * 60 * 1000;

    return alertAge > escalateAfterMs;
  }

  /**
   * Escalate alert
   * @param {string} alertId - Alert ID
   * @returns {Object} - Updated alert
   */
  escalateAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.escalated = true;
    alert.escalatedAt = new Date().toISOString();

    this.alertHistory.push({ ...alert, action: 'escalated' });

    return alert;
  }
}

module.exports = AlertService;
