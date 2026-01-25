/**
 * HIPAA Compliance Monitoring Service
 * 
 * Implements data encryption, access control, compliance validation,
 * and audit trail security for HIPAA requirements.
 * 
 * Requirements: 3.3
 */

const crypto = require('crypto');

class HIPAAComplianceService {
  constructor() {
    // Encryption configuration
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.saltLength = 64;
    this.tagLength = 16;
    
    // Access control tracking
    this.accessLog = [];
    this.complianceViolations = [];
    
    // Compliance rules
    this.complianceRules = {
      dataEncryption: true,
      accessControl: true,
      auditTrail: true,
      dataRetention: true,
      minimumNecessary: true,
      patientRights: true
    };
  }

  /**
   * Encrypt sensitive patient data using AES-256-GCM
   * @param {string} data - Data to encrypt
   * @param {string} encryptionKey - Encryption key (base64)
   * @returns {Object} Encrypted data with IV and auth tag
   */
  encryptData(data, encryptionKey) {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const key = Buffer.from(encryptionKey, 'base64');
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.algorithm
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive patient data
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} encryptionKey - Decryption key (base64)
   * @returns {string} Decrypted data
   */
  decryptData(encryptedData, encryptionKey) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      // Create decipher
      const key = Buffer.from(encryptionKey, 'base64');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'base64')
      );
      
      // Set authentication tag
      decipher.setAuthTag(Buffer.from(authTag, 'base64'));
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a secure encryption key
   * @returns {string} Base64-encoded encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(this.keyLength).toString('base64');
  }

  /**
   * Validate access control for patient data
   * @param {Object} accessRequest - Access request details
   * @returns {Object} Access validation result
   */
  validateAccessControl(accessRequest) {
    const {
      userId,
      userRole,
      patientId,
      dataType,
      purpose,
      timestamp = new Date()
    } = accessRequest;

    // Validate required fields
    if (!userId || !userRole || !patientId || !dataType || !purpose) {
      return {
        allowed: false,
        reason: 'Missing required access control fields',
        complianceViolation: true
      };
    }

    // Role-based access control
    const allowedRoles = ['physician', 'nurse', 'admin', 'authorized_staff'];
    if (!allowedRoles.includes(userRole)) {
      this.logComplianceViolation({
        type: 'UNAUTHORIZED_ROLE',
        userId,
        userRole,
        patientId,
        timestamp
      });
      
      return {
        allowed: false,
        reason: 'User role not authorized for patient data access',
        complianceViolation: true
      };
    }

    // Validate purpose (minimum necessary principle)
    const validPurposes = [
      'treatment',
      'payment',
      'healthcare_operations',
      'research_with_authorization',
      'public_health',
      'legal_requirement'
    ];
    
    if (!validPurposes.includes(purpose)) {
      this.logComplianceViolation({
        type: 'INVALID_PURPOSE',
        userId,
        purpose,
        patientId,
        timestamp
      });
      
      return {
        allowed: false,
        reason: 'Invalid or unauthorized purpose for data access',
        complianceViolation: true
      };
    }

    // Log successful access
    this.logAccess({
      userId,
      userRole,
      patientId,
      dataType,
      purpose,
      timestamp,
      result: 'ALLOWED'
    });

    return {
      allowed: true,
      reason: 'Access granted based on role and purpose',
      complianceViolation: false
    };
  }

  /**
   * Log data access for audit trail
   * @param {Object} accessDetails - Access details
   */
  logAccess(accessDetails) {
    this.accessLog.push({
      ...accessDetails,
      logId: crypto.randomUUID(),
      loggedAt: new Date()
    });
  }

  /**
   * Log compliance violation
   * @param {Object} violation - Violation details
   */
  logComplianceViolation(violation) {
    this.complianceViolations.push({
      ...violation,
      violationId: crypto.randomUUID(),
      loggedAt: new Date(),
      severity: 'HIGH'
    });
  }

  /**
   * Validate HIPAA compliance for system operation
   * @param {Object} operation - Operation to validate
   * @returns {Object} Compliance validation result
   */
  validateCompliance(operation) {
    const {
      operationType,
      dataEncrypted = false,
      accessControlled = false,
      auditTrailEnabled = false,
      patientConsent = false
    } = operation;

    const violations = [];
    const warnings = [];

    // Check data encryption requirement
    if (this.complianceRules.dataEncryption && !dataEncrypted) {
      violations.push({
        rule: 'DATA_ENCRYPTION',
        message: 'Patient data must be encrypted at rest and in transit',
        severity: 'CRITICAL'
      });
    }

    // Check access control requirement
    if (this.complianceRules.accessControl && !accessControlled) {
      violations.push({
        rule: 'ACCESS_CONTROL',
        message: 'Access control must be enforced for all patient data',
        severity: 'CRITICAL'
      });
    }

    // Check audit trail requirement
    if (this.complianceRules.auditTrail && !auditTrailEnabled) {
      violations.push({
        rule: 'AUDIT_TRAIL',
        message: 'All access to patient data must be logged in audit trail',
        severity: 'HIGH'
      });
    }

    // Check patient consent for certain operations
    if (['data_sharing', 'research', 'marketing'].includes(operationType) && !patientConsent) {
      violations.push({
        rule: 'PATIENT_CONSENT',
        message: 'Patient consent required for this operation',
        severity: 'CRITICAL'
      });
    }

    // FDA requirement validation for clinical decision support
    if (operationType === 'clinical_decision_support') {
      warnings.push({
        rule: 'FDA_DISCLAIMER',
        message: 'Clinical outputs must include "For physician review only" disclaimer',
        severity: 'MEDIUM'
      });
    }

    const isCompliant = violations.length === 0;

    if (!isCompliant) {
      this.logComplianceViolation({
        type: 'COMPLIANCE_CHECK_FAILED',
        operationType,
        violations,
        timestamp: new Date()
      });
    }

    return {
      compliant: isCompliant,
      violations,
      warnings,
      timestamp: new Date()
    };
  }

  /**
   * Generate compliance report
   * @param {Object} options - Report options
   * @returns {Object} Compliance report
   */
  generateComplianceReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate = new Date()
    } = options;

    // Filter logs by date range
    const accessLogsInRange = this.accessLog.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    );

    const violationsInRange = this.complianceViolations.filter(violation =>
      violation.loggedAt >= startDate && violation.loggedAt <= endDate
    );

    // Calculate metrics
    const totalAccesses = accessLogsInRange.length;
    const totalViolations = violationsInRange.length;
    const complianceRate = totalAccesses > 0 
      ? ((totalAccesses - totalViolations) / totalAccesses * 100).toFixed(2)
      : 100;

    // Group violations by type
    const violationsByType = violationsInRange.reduce((acc, violation) => {
      acc[violation.type] = (acc[violation.type] || 0) + 1;
      return acc;
    }, {});

    return {
      reportPeriod: {
        startDate,
        endDate
      },
      summary: {
        totalAccesses,
        totalViolations,
        complianceRate: `${complianceRate}%`
      },
      violations: {
        total: totalViolations,
        byType: violationsByType,
        details: violationsInRange
      },
      accessLog: {
        total: totalAccesses,
        recentAccesses: accessLogsInRange.slice(-10) // Last 10 accesses
      },
      recommendations: this.generateRecommendations(violationsInRange),
      generatedAt: new Date()
    };
  }

  /**
   * Generate recommendations based on violations
   * @param {Array} violations - List of violations
   * @returns {Array} Recommendations
   */
  generateRecommendations(violations) {
    const recommendations = [];
    const violationTypes = new Set(violations.map(v => v.type));

    if (violationTypes.has('UNAUTHORIZED_ROLE')) {
      recommendations.push({
        priority: 'HIGH',
        recommendation: 'Review and update role-based access control policies',
        action: 'Conduct access control audit and training'
      });
    }

    if (violationTypes.has('INVALID_PURPOSE')) {
      recommendations.push({
        priority: 'HIGH',
        recommendation: 'Enforce minimum necessary principle for data access',
        action: 'Implement purpose validation at access points'
      });
    }

    if (violationTypes.has('COMPLIANCE_CHECK_FAILED')) {
      recommendations.push({
        priority: 'CRITICAL',
        recommendation: 'Address compliance violations immediately',
        action: 'Enable required security controls and audit mechanisms'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'LOW',
        recommendation: 'Maintain current compliance standards',
        action: 'Continue regular compliance monitoring'
      });
    }

    return recommendations;
  }

  /**
   * Verify audit trail integrity
   * @param {Array} auditEntries - Audit trail entries
   * @returns {Object} Integrity verification result
   */
  verifyAuditTrailIntegrity(auditEntries) {
    if (!auditEntries || auditEntries.length === 0) {
      return {
        valid: false,
        reason: 'No audit entries to verify'
      };
    }

    // Check for required fields in each entry
    const requiredFields = ['auditId', 'userId', 'patientId', 'action', 'timestamp'];
    const invalidEntries = [];

    for (const entry of auditEntries) {
      const missingFields = requiredFields.filter(field => !entry[field]);
      if (missingFields.length > 0) {
        invalidEntries.push({
          auditId: entry.auditId || 'UNKNOWN',
          missingFields
        });
      }
    }

    // Check chronological order
    let chronologicalErrors = 0;
    for (let i = 1; i < auditEntries.length; i++) {
      if (new Date(auditEntries[i].timestamp) < new Date(auditEntries[i-1].timestamp)) {
        chronologicalErrors++;
      }
    }

    const isValid = invalidEntries.length === 0 && chronologicalErrors === 0;

    return {
      valid: isValid,
      totalEntries: auditEntries.length,
      invalidEntries: invalidEntries.length,
      chronologicalErrors,
      details: invalidEntries.length > 0 ? invalidEntries : undefined
    };
  }

  /**
   * Get access log
   * @returns {Array} Access log entries
   */
  getAccessLog() {
    return [...this.accessLog];
  }

  /**
   * Get compliance violations
   * @returns {Array} Compliance violation entries
   */
  getComplianceViolations() {
    return [...this.complianceViolations];
  }

  /**
   * Clear logs (for testing purposes)
   */
  clearLogs() {
    this.accessLog = [];
    this.complianceViolations = [];
  }
}

module.exports = HIPAAComplianceService;
