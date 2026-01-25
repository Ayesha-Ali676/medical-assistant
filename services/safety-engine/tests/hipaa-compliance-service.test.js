/**
 * Unit Tests for HIPAA Compliance Service
 */

const HIPAAComplianceService = require('../src/services/hipaa-compliance-service');

describe('HIPAA Compliance Service', () => {
  let service;

  beforeEach(() => {
    service = new HIPAAComplianceService();
  });

  describe('Data Encryption', () => {
    test('should encrypt and decrypt data correctly', () => {
      const originalData = 'Patient SSN: 123-45-6789';
      const encryptionKey = service.generateEncryptionKey();

      const encrypted = service.encryptData(originalData, encryptionKey);
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.encrypted).not.toBe(originalData);

      const decrypted = service.decryptData(encrypted, encryptionKey);
      expect(decrypted).toBe(originalData);
    });

    test('should fail decryption with wrong key', () => {
      const originalData = 'Sensitive patient data';
      const encryptionKey = service.generateEncryptionKey();
      const wrongKey = service.generateEncryptionKey();

      const encrypted = service.encryptData(originalData, encryptionKey);
      
      expect(() => {
        service.decryptData(encrypted, wrongKey);
      }).toThrow();
    });

    test('should generate unique encryption keys', () => {
      const key1 = service.generateEncryptionKey();
      const key2 = service.generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(0);
      expect(key2.length).toBeGreaterThan(0);
    });
  });

  describe('Access Control Validation', () => {
    test('should allow access for authorized physician with valid purpose', () => {
      const accessRequest = {
        userId: 'doc123',
        userRole: 'physician',
        patientId: 'patient456',
        dataType: 'medical_records',
        purpose: 'treatment'
      };

      const result = service.validateAccessControl(accessRequest);
      
      expect(result.allowed).toBe(true);
      expect(result.complianceViolation).toBe(false);
      expect(result.reason).toContain('Access granted');
    });

    test('should deny access for unauthorized role', () => {
      const accessRequest = {
        userId: 'user123',
        userRole: 'unauthorized_user',
        patientId: 'patient456',
        dataType: 'medical_records',
        purpose: 'treatment'
      };

      const result = service.validateAccessControl(accessRequest);
      
      expect(result.allowed).toBe(false);
      expect(result.complianceViolation).toBe(true);
      expect(result.reason).toContain('not authorized');
    });

    test('should deny access for invalid purpose', () => {
      const accessRequest = {
        userId: 'doc123',
        userRole: 'physician',
        patientId: 'patient456',
        dataType: 'medical_records',
        purpose: 'curiosity'
      };

      const result = service.validateAccessControl(accessRequest);
      
      expect(result.allowed).toBe(false);
      expect(result.complianceViolation).toBe(true);
      expect(result.reason).toContain('Invalid or unauthorized purpose');
    });

    test('should deny access when required fields are missing', () => {
      const accessRequest = {
        userId: 'doc123',
        userRole: 'physician'
        // Missing patientId, dataType, purpose
      };

      const result = service.validateAccessControl(accessRequest);
      
      expect(result.allowed).toBe(false);
      expect(result.complianceViolation).toBe(true);
      expect(result.reason).toContain('Missing required');
    });

    test('should log successful access attempts', () => {
      const accessRequest = {
        userId: 'doc123',
        userRole: 'physician',
        patientId: 'patient456',
        dataType: 'medical_records',
        purpose: 'treatment'
      };

      service.validateAccessControl(accessRequest);
      
      const accessLog = service.getAccessLog();
      expect(accessLog.length).toBe(1);
      expect(accessLog[0].userId).toBe('doc123');
      expect(accessLog[0].result).toBe('ALLOWED');
    });

    test('should log compliance violations', () => {
      const accessRequest = {
        userId: 'user123',
        userRole: 'unauthorized_user',
        patientId: 'patient456',
        dataType: 'medical_records',
        purpose: 'treatment'
      };

      service.validateAccessControl(accessRequest);
      
      const violations = service.getComplianceViolations();
      expect(violations.length).toBe(1);
      expect(violations[0].type).toBe('UNAUTHORIZED_ROLE');
    });
  });

  describe('Compliance Validation', () => {
    test('should validate compliant operation', () => {
      const operation = {
        operationType: 'data_access',
        dataEncrypted: true,
        accessControlled: true,
        auditTrailEnabled: true
      };

      const result = service.validateCompliance(operation);
      
      expect(result.compliant).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    test('should detect missing data encryption', () => {
      const operation = {
        operationType: 'data_access',
        dataEncrypted: false,
        accessControlled: true,
        auditTrailEnabled: true
      };

      const result = service.validateCompliance(operation);
      
      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].rule).toBe('DATA_ENCRYPTION');
      expect(result.violations[0].severity).toBe('CRITICAL');
    });

    test('should detect missing access control', () => {
      const operation = {
        operationType: 'data_access',
        dataEncrypted: true,
        accessControlled: false,
        auditTrailEnabled: true
      };

      const result = service.validateCompliance(operation);
      
      expect(result.compliant).toBe(false);
      expect(result.violations.some(v => v.rule === 'ACCESS_CONTROL')).toBe(true);
    });

    test('should detect missing audit trail', () => {
      const operation = {
        operationType: 'data_access',
        dataEncrypted: true,
        accessControlled: true,
        auditTrailEnabled: false
      };

      const result = service.validateCompliance(operation);
      
      expect(result.compliant).toBe(false);
      expect(result.violations.some(v => v.rule === 'AUDIT_TRAIL')).toBe(true);
    });

    test('should require patient consent for data sharing', () => {
      const operation = {
        operationType: 'data_sharing',
        dataEncrypted: true,
        accessControlled: true,
        auditTrailEnabled: true,
        patientConsent: false
      };

      const result = service.validateCompliance(operation);
      
      expect(result.compliant).toBe(false);
      expect(result.violations.some(v => v.rule === 'PATIENT_CONSENT')).toBe(true);
    });

    test('should include FDA disclaimer warning for clinical decision support', () => {
      const operation = {
        operationType: 'clinical_decision_support',
        dataEncrypted: true,
        accessControlled: true,
        auditTrailEnabled: true
      };

      const result = service.validateCompliance(operation);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].rule).toBe('FDA_DISCLAIMER');
    });
  });

  describe('Audit Trail Integrity', () => {
    test('should verify valid audit trail', () => {
      const auditEntries = [
        {
          auditId: 'audit1',
          userId: 'doc123',
          patientId: 'patient456',
          action: 'VIEW_RECORD',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          auditId: 'audit2',
          userId: 'doc123',
          patientId: 'patient456',
          action: 'UPDATE_RECORD',
          timestamp: new Date('2024-01-01T10:05:00Z')
        }
      ];

      const result = service.verifyAuditTrailIntegrity(auditEntries);
      
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(2);
      expect(result.invalidEntries).toBe(0);
      expect(result.chronologicalErrors).toBe(0);
    });

    test('should detect missing required fields', () => {
      const auditEntries = [
        {
          auditId: 'audit1',
          userId: 'doc123',
          // Missing patientId, action, timestamp
        }
      ];

      const result = service.verifyAuditTrailIntegrity(auditEntries);
      
      expect(result.valid).toBe(false);
      expect(result.invalidEntries).toBe(1);
    });

    test('should detect chronological errors', () => {
      const auditEntries = [
        {
          auditId: 'audit1',
          userId: 'doc123',
          patientId: 'patient456',
          action: 'VIEW_RECORD',
          timestamp: new Date('2024-01-01T10:05:00Z')
        },
        {
          auditId: 'audit2',
          userId: 'doc123',
          patientId: 'patient456',
          action: 'UPDATE_RECORD',
          timestamp: new Date('2024-01-01T10:00:00Z') // Earlier than previous
        }
      ];

      const result = service.verifyAuditTrailIntegrity(auditEntries);
      
      expect(result.valid).toBe(false);
      expect(result.chronologicalErrors).toBe(1);
    });

    test('should handle empty audit trail', () => {
      const result = service.verifyAuditTrailIntegrity([]);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('No audit entries');
    });
  });

  describe('Compliance Reporting', () => {
    test('should generate compliance report with metrics', () => {
      // Create some access logs
      service.validateAccessControl({
        userId: 'doc123',
        userRole: 'physician',
        patientId: 'patient456',
        dataType: 'medical_records',
        purpose: 'treatment'
      });

      service.validateAccessControl({
        userId: 'user123',
        userRole: 'unauthorized_user',
        patientId: 'patient789',
        dataType: 'medical_records',
        purpose: 'treatment'
      });

      const report = service.generateComplianceReport();
      
      expect(report.summary).toBeDefined();
      expect(report.summary.totalAccesses).toBe(1);
      expect(report.summary.totalViolations).toBe(1);
      expect(report.violations.total).toBe(1);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    test('should filter report by date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const report = service.generateComplianceReport({ startDate, endDate });
      
      expect(report.reportPeriod.startDate).toEqual(startDate);
      expect(report.reportPeriod.endDate).toEqual(endDate);
    });

    test('should provide recommendations based on violations', () => {
      // Create violation
      service.validateAccessControl({
        userId: 'user123',
        userRole: 'unauthorized_user',
        patientId: 'patient456',
        dataType: 'medical_records',
        purpose: 'treatment'
      });

      const report = service.generateComplianceReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0].priority).toBeDefined();
      expect(report.recommendations[0].recommendation).toBeDefined();
    });
  });
});
