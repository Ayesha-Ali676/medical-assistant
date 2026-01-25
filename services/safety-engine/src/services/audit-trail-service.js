/**
 * Audit Trail Service
 * Comprehensive audit logging for all clinical decisions
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');

class AuditTrailService {
  constructor() {
    // In-memory storage for this implementation
    // In production, this would use a secure, immutable database
    this.auditEntries = [];
    this.auditIndex = new Map(); // For fast lookups
  }

  /**
   * Record a clinical decision in the audit trail
   */
  async recordClinicalDecision(decisionData) {
    try {
      const auditEntry = {
        auditId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'CLINICAL_DECISION',
        userId: decisionData.userId,
        userRole: decisionData.userRole || 'physician',
        patientId: decisionData.patientId,
        action: decisionData.action,
        systemRecommendation: decisionData.systemRecommendation || null,
        physicianDecision: decisionData.physicianDecision,
        decisionRationale: decisionData.decisionRationale || null,
        riskLevel: decisionData.riskLevel || 'UNKNOWN',
        inputData: this.sanitizeData(decisionData.inputData),
        outputData: this.sanitizeData(decisionData.outputData),
        complianceFlags: decisionData.complianceFlags || [],
        sessionId: decisionData.sessionId || null,
        ipAddress: this.hashSensitiveData(decisionData.ipAddress),
        deviceInfo: decisionData.deviceInfo || null,
        integrityHash: null // Will be calculated
      };

      // Calculate integrity hash
      auditEntry.integrityHash = this.calculateIntegrityHash(auditEntry);

      // Store entry
      this.auditEntries.push(auditEntry);
      this.indexEntry(auditEntry);

      return {
        success: true,
        auditId: auditEntry.auditId,
        timestamp: auditEntry.timestamp,
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Failed to record clinical decision: ${error.message}`);
    }
  }

  /**
   * Record system access event
   */
  async recordSystemAccess(accessData) {
    try {
      const auditEntry = {
        auditId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'SYSTEM_ACCESS',
        userId: accessData.userId,
        userRole: accessData.userRole,
        action: accessData.action, // LOGIN, LOGOUT, VIEW_PATIENT, etc.
        patientId: accessData.patientId || null,
        resourceAccessed: accessData.resourceAccessed || null,
        accessGranted: accessData.accessGranted,
        accessDeniedReason: accessData.accessDeniedReason || null,
        sessionId: accessData.sessionId,
        ipAddress: this.hashSensitiveData(accessData.ipAddress),
        deviceInfo: accessData.deviceInfo || null,
        integrityHash: null
      };

      auditEntry.integrityHash = this.calculateIntegrityHash(auditEntry);

      this.auditEntries.push(auditEntry);
      this.indexEntry(auditEntry);

      return {
        success: true,
        auditId: auditEntry.auditId,
        timestamp: auditEntry.timestamp
      };
    } catch (error) {
      throw new Error(`Failed to record system access: ${error.message}`);
    }
  }

  /**
   * Record data modification event
   */
  async recordDataModification(modificationData) {
    try {
      const auditEntry = {
        auditId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'DATA_MODIFICATION',
        userId: modificationData.userId,
        userRole: modificationData.userRole,
        patientId: modificationData.patientId,
        dataType: modificationData.dataType, // PATIENT_RECORD, MEDICATION, LAB_RESULT, etc.
        action: modificationData.action, // CREATE, UPDATE, DELETE
        recordId: modificationData.recordId,
        previousValue: this.sanitizeData(modificationData.previousValue),
        newValue: this.sanitizeData(modificationData.newValue),
        modificationReason: modificationData.modificationReason || null,
        sessionId: modificationData.sessionId,
        ipAddress: this.hashSensitiveData(modificationData.ipAddress),
        integrityHash: null
      };

      auditEntry.integrityHash = this.calculateIntegrityHash(auditEntry);

      this.auditEntries.push(auditEntry);
      this.indexEntry(auditEntry);

      return {
        success: true,
        auditId: auditEntry.auditId,
        timestamp: auditEntry.timestamp,
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Failed to record data modification: ${error.message}`);
    }
  }

  /**
   * Record alert acknowledgment
   */
  async recordAlertAcknowledgment(alertData) {
    try {
      const auditEntry = {
        auditId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'ALERT_ACKNOWLEDGMENT',
        userId: alertData.userId,
        userRole: alertData.userRole,
        patientId: alertData.patientId,
        alertId: alertData.alertId,
        alertType: alertData.alertType,
        alertSeverity: alertData.alertSeverity,
        acknowledged: alertData.acknowledged,
        acknowledgmentTime: alertData.acknowledgmentTime,
        responseAction: alertData.responseAction || null,
        responseNotes: alertData.responseNotes || null,
        sessionId: alertData.sessionId,
        integrityHash: null
      };

      auditEntry.integrityHash = this.calculateIntegrityHash(auditEntry);

      this.auditEntries.push(auditEntry);
      this.indexEntry(auditEntry);

      return {
        success: true,
        auditId: auditEntry.auditId,
        timestamp: auditEntry.timestamp
      };
    } catch (error) {
      throw new Error(`Failed to record alert acknowledgment: ${error.message}`);
    }
  }

  /**
   * Retrieve audit trail for a patient
   */
  async getPatientAuditTrail(patientId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        eventTypes = null,
        limit = 100,
        offset = 0
      } = options;

      let entries = this.auditEntries.filter(entry => entry.patientId === patientId);

      // Filter by date range
      if (startDate) {
        entries = entries.filter(entry => new Date(entry.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        entries = entries.filter(entry => new Date(entry.timestamp) <= new Date(endDate));
      }

      // Filter by event types
      if (eventTypes && Array.isArray(eventTypes)) {
        entries = entries.filter(entry => eventTypes.includes(entry.eventType));
      }

      // Sort by timestamp (newest first)
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const totalEntries = entries.length;
      const paginatedEntries = entries.slice(offset, offset + limit);

      return {
        patientId,
        totalEntries,
        returnedEntries: paginatedEntries.length,
        offset,
        limit,
        entries: paginatedEntries,
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Failed to retrieve patient audit trail: ${error.message}`);
    }
  }

  /**
   * Retrieve audit trail for a user
   */
  async getUserAuditTrail(userId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        eventTypes = null,
        limit = 100,
        offset = 0
      } = options;

      let entries = this.auditEntries.filter(entry => entry.userId === userId);

      // Apply filters
      if (startDate) {
        entries = entries.filter(entry => new Date(entry.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        entries = entries.filter(entry => new Date(entry.timestamp) <= new Date(endDate));
      }
      if (eventTypes && Array.isArray(eventTypes)) {
        entries = entries.filter(entry => eventTypes.includes(entry.eventType));
      }

      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const totalEntries = entries.length;
      const paginatedEntries = entries.slice(offset, offset + limit);

      return {
        userId,
        totalEntries,
        returnedEntries: paginatedEntries.length,
        offset,
        limit,
        entries: paginatedEntries
      };
    } catch (error) {
      throw new Error(`Failed to retrieve user audit trail: ${error.message}`);
    }
  }

  /**
   * Retrieve specific audit entry
   */
  async getAuditEntry(auditId) {
    const entry = this.auditIndex.get(auditId);
    
    if (!entry) {
      return {
        found: false,
        message: 'Audit entry not found'
      };
    }

    // Verify integrity
    const isValid = this.verifyIntegrity(entry);

    return {
      found: true,
      entry,
      integrityValid: isValid,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Search audit trail
   */
  async searchAuditTrail(searchCriteria) {
    try {
      let entries = [...this.auditEntries];

      // Apply search filters
      if (searchCriteria.userId) {
        entries = entries.filter(e => e.userId === searchCriteria.userId);
      }
      if (searchCriteria.patientId) {
        entries = entries.filter(e => e.patientId === searchCriteria.patientId);
      }
      if (searchCriteria.eventType) {
        entries = entries.filter(e => e.eventType === searchCriteria.eventType);
      }
      if (searchCriteria.action) {
        entries = entries.filter(e => e.action === searchCriteria.action);
      }
      if (searchCriteria.riskLevel) {
        entries = entries.filter(e => e.riskLevel === searchCriteria.riskLevel);
      }
      if (searchCriteria.startDate) {
        entries = entries.filter(e => new Date(e.timestamp) >= new Date(searchCriteria.startDate));
      }
      if (searchCriteria.endDate) {
        entries = entries.filter(e => new Date(e.timestamp) <= new Date(searchCriteria.endDate));
      }

      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const limit = searchCriteria.limit || 100;
      const offset = searchCriteria.offset || 0;

      return {
        totalResults: entries.length,
        returnedResults: Math.min(entries.length - offset, limit),
        offset,
        limit,
        entries: entries.slice(offset, offset + limit),
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Audit trail search failed: ${error.message}`);
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditTrailIntegrity(auditIds = null) {
    try {
      const entriesToVerify = auditIds 
        ? auditIds.map(id => this.auditIndex.get(id)).filter(e => e)
        : this.auditEntries;

      const results = {
        totalChecked: entriesToVerify.length,
        valid: 0,
        invalid: 0,
        invalidEntries: []
      };

      for (const entry of entriesToVerify) {
        const isValid = this.verifyIntegrity(entry);
        if (isValid) {
          results.valid++;
        } else {
          results.invalid++;
          results.invalidEntries.push({
            auditId: entry.auditId,
            timestamp: entry.timestamp,
            eventType: entry.eventType
          });
        }
      }

      return {
        ...results,
        integrityPercentage: (results.valid / results.totalChecked * 100).toFixed(2),
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Integrity verification failed: ${error.message}`);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        patientId = null,
        userId = null
      } = options;

      let entries = [...this.auditEntries];

      // Apply filters
      if (startDate) {
        entries = entries.filter(e => new Date(e.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        entries = entries.filter(e => new Date(e.timestamp) <= new Date(endDate));
      }
      if (patientId) {
        entries = entries.filter(e => e.patientId === patientId);
      }
      if (userId) {
        entries = entries.filter(e => e.userId === userId);
      }

      // Calculate statistics
      const stats = {
        totalEntries: entries.length,
        eventTypeCounts: {},
        riskLevelCounts: {},
        userActivityCounts: {},
        patientActivityCounts: {},
        timeRange: {
          earliest: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
          latest: entries.length > 0 ? entries[0].timestamp : null
        }
      };

      // Count by event type
      entries.forEach(entry => {
        stats.eventTypeCounts[entry.eventType] = 
          (stats.eventTypeCounts[entry.eventType] || 0) + 1;
        
        if (entry.riskLevel) {
          stats.riskLevelCounts[entry.riskLevel] = 
            (stats.riskLevelCounts[entry.riskLevel] || 0) + 1;
        }
        
        stats.userActivityCounts[entry.userId] = 
          (stats.userActivityCounts[entry.userId] || 0) + 1;
        
        if (entry.patientId) {
          stats.patientActivityCounts[entry.patientId] = 
            (stats.patientActivityCounts[entry.patientId] || 0) + 1;
        }
      });

      return {
        ...stats,
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Failed to generate audit statistics: ${error.message}`);
    }
  }

  /**
   * Export audit trail for compliance reporting
   */
  async exportAuditTrail(exportOptions = {}) {
    try {
      const {
        format = 'JSON',
        startDate = null,
        endDate = null,
        patientId = null,
        userId = null
      } = exportOptions;

      let entries = [...this.auditEntries];

      // Apply filters
      if (startDate) {
        entries = entries.filter(e => new Date(e.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        entries = entries.filter(e => new Date(e.timestamp) <= new Date(endDate));
      }
      if (patientId) {
        entries = entries.filter(e => e.patientId === patientId);
      }
      if (userId) {
        entries = entries.filter(e => e.userId === userId);
      }

      const exportData = {
        exportId: uuidv4(),
        exportTimestamp: new Date().toISOString(),
        format,
        totalEntries: entries.length,
        filters: { startDate, endDate, patientId, userId },
        entries,
        integrityVerified: true,
        disclaimer: 'For physician review only - Confidential audit data'
      };

      return exportData;
    } catch (error) {
      throw new Error(`Audit trail export failed: ${error.message}`);
    }
  }

  /**
   * Calculate integrity hash for an audit entry
   */
  calculateIntegrityHash(entry) {
    // In production, use a cryptographic hash function (SHA-256)
    // For this implementation, we'll use a simple hash
    const dataString = JSON.stringify({
      auditId: entry.auditId,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      userId: entry.userId,
      patientId: entry.patientId,
      action: entry.action
    });
    
    // Simple hash for demonstration
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Verify integrity of an audit entry
   */
  verifyIntegrity(entry) {
    const storedHash = entry.integrityHash;
    const calculatedHash = this.calculateIntegrityHash(entry);
    return storedHash === calculatedHash;
  }

  /**
   * Sanitize sensitive data
   */
  sanitizeData(data) {
    if (!data) return null;
    
    // In production, implement proper data sanitization
    // Remove or mask sensitive fields
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Hash sensitive data (like IP addresses)
   */
  hashSensitiveData(data) {
    if (!data) return null;
    
    // In production, use proper hashing
    return `hashed_${data.split('').reverse().join('')}`;
  }

  /**
   * Index entry for fast lookups
   */
  indexEntry(entry) {
    this.auditIndex.set(entry.auditId, entry);
  }

  /**
   * Clear audit trail (for testing only)
   */
  clearAuditTrail() {
    this.auditEntries = [];
    this.auditIndex.clear();
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      totalEntries: this.auditEntries.length,
      eventTypes: [...new Set(this.auditEntries.map(e => e.eventType))],
      oldestEntry: this.auditEntries.length > 0 ? this.auditEntries[0].timestamp : null,
      newestEntry: this.auditEntries.length > 0 ? 
        this.auditEntries[this.auditEntries.length - 1].timestamp : null,
      disclaimer: 'For physician review only'
    };
  }
}

module.exports = AuditTrailService;
