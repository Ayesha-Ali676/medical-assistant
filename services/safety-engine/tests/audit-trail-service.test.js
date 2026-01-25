/**
 * Tests for Audit Trail Service
 * For physician review only
 */

const AuditTrailService = require('../src/services/audit-trail-service');

describe('Audit Trail Service', () => {
  let auditService;
  
  beforeEach(() => {
    auditService = new AuditTrailService();
  });

  describe('Clinical Decision Recording', () => {
    test('should record clinical decision with all required fields', async () => {
      const decisionData = {
        userId: 'physician-123',
        userRole: 'physician',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        systemRecommendation: 'Recommend aspirin 81mg daily',
        physicianDecision: 'Prescribed aspirin 81mg daily',
        decisionRationale: 'Patient has cardiovascular risk factors',
        riskLevel: 'MEDIUM',
        inputData: { symptoms: ['chest pain'], vitals: { bp: '140/90' } },
        outputData: { prescription: 'Aspirin 81mg' },
        complianceFlags: ['HIPAA_COMPLIANT'],
        sessionId: 'session-789',
        ipAddress: '192.168.1.1'
      };

      const result = await auditService.recordClinicalDecision(decisionData);

      expect(result.success).toBe(true);
      expect(result.auditId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should generate unique audit IDs', async () => {
      const decisionData = {
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'REVIEW_LABS',
        physicianDecision: 'Labs reviewed'
      };

      const result1 = await auditService.recordClinicalDecision(decisionData);
      const result2 = await auditService.recordClinicalDecision(decisionData);

      expect(result1.auditId).not.toBe(result2.auditId);
    });

    test('should calculate integrity hash', async () => {
      const decisionData = {
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication'
      };

      await auditService.recordClinicalDecision(decisionData);
      
      const stats = auditService.getServiceStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('System Access Recording', () => {
    test('should record system access event', async () => {
      const accessData = {
        userId: 'physician-123',
        userRole: 'physician',
        action: 'LOGIN',
        accessGranted: true,
        sessionId: 'session-789',
        ipAddress: '192.168.1.1',
        deviceInfo: 'Chrome/Windows'
      };

      const result = await auditService.recordSystemAccess(accessData);

      expect(result.success).toBe(true);
      expect(result.auditId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should record denied access attempts', async () => {
      const accessData = {
        userId: 'user-999',
        userRole: 'unknown',
        action: 'VIEW_PATIENT',
        patientId: 'patient-456',
        accessGranted: false,
        accessDeniedReason: 'Insufficient permissions',
        sessionId: 'session-999',
        ipAddress: '192.168.1.100'
      };

      const result = await auditService.recordSystemAccess(accessData);

      expect(result.success).toBe(true);
      
      const entry = await auditService.getAuditEntry(result.auditId);
      expect(entry.entry.accessGranted).toBe(false);
      expect(entry.entry.accessDeniedReason).toBe('Insufficient permissions');
    });
  });

  describe('Data Modification Recording', () => {
    test('should record data modification', async () => {
      const modificationData = {
        userId: 'physician-123',
        userRole: 'physician',
        patientId: 'patient-456',
        dataType: 'MEDICATION',
        action: 'UPDATE',
        recordId: 'med-789',
        previousValue: { dose: '5mg' },
        newValue: { dose: '10mg' },
        modificationReason: 'Dose adjustment based on patient response',
        sessionId: 'session-789',
        ipAddress: '192.168.1.1'
      };

      const result = await auditService.recordDataModification(modificationData);

      expect(result.success).toBe(true);
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should record data creation', async () => {
      const modificationData = {
        userId: 'physician-123',
        userRole: 'physician',
        patientId: 'patient-456',
        dataType: 'LAB_RESULT',
        action: 'CREATE',
        recordId: 'lab-123',
        previousValue: null,
        newValue: { test: 'CBC', result: 'Normal' },
        sessionId: 'session-789',
        ipAddress: '192.168.1.1'
      };

      const result = await auditService.recordDataModification(modificationData);

      expect(result.success).toBe(true);
      
      const entry = await auditService.getAuditEntry(result.auditId);
      expect(entry.entry.action).toBe('CREATE');
      expect(entry.entry.previousValue).toBeNull();
    });
  });

  describe('Alert Acknowledgment Recording', () => {
    test('should record alert acknowledgment', async () => {
      const alertData = {
        userId: 'physician-123',
        userRole: 'physician',
        patientId: 'patient-456',
        alertId: 'alert-789',
        alertType: 'DRUG_INTERACTION',
        alertSeverity: 'HIGH',
        acknowledged: true,
        acknowledgmentTime: new Date().toISOString(),
        responseAction: 'MEDICATION_CHANGED',
        responseNotes: 'Switched to alternative medication',
        sessionId: 'session-789'
      };

      const result = await auditService.recordAlertAcknowledgment(alertData);

      expect(result.success).toBe(true);
      
      const entry = await auditService.getAuditEntry(result.auditId);
      expect(entry.entry.eventType).toBe('ALERT_ACKNOWLEDGMENT');
      expect(entry.entry.acknowledged).toBe(true);
    });
  });

  describe('Audit Trail Retrieval', () => {
    beforeEach(async () => {
      // Create test data
      await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed aspirin'
      });
      
      await auditService.recordSystemAccess({
        userId: 'physician-123',
        userRole: 'physician',
        action: 'LOGIN',
        accessGranted: true,
        sessionId: 'session-789',
        ipAddress: '192.168.1.1'
      });
      
      await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'REVIEW_LABS',
        physicianDecision: 'Labs reviewed'
      });
    });

    test('should retrieve patient audit trail', async () => {
      const trail = await auditService.getPatientAuditTrail('patient-456');

      expect(trail.patientId).toBe('patient-456');
      expect(trail.totalEntries).toBe(2);
      expect(trail.entries.length).toBe(2);
      expect(trail.disclaimer).toBe('For physician review only');
    });

    test('should retrieve user audit trail', async () => {
      const trail = await auditService.getUserAuditTrail('physician-123');

      expect(trail.userId).toBe('physician-123');
      expect(trail.totalEntries).toBe(3);
      expect(trail.entries.length).toBe(3);
    });

    test('should filter by event type', async () => {
      const trail = await auditService.getPatientAuditTrail('patient-456', {
        eventTypes: ['CLINICAL_DECISION']
      });

      expect(trail.totalEntries).toBe(2);
      trail.entries.forEach(entry => {
        expect(entry.eventType).toBe('CLINICAL_DECISION');
      });
    });

    test('should apply pagination', async () => {
      const trail = await auditService.getPatientAuditTrail('patient-456', {
        limit: 1,
        offset: 0
      });

      expect(trail.returnedEntries).toBe(1);
      expect(trail.totalEntries).toBe(2);
    });

    test('should sort by timestamp (newest first)', async () => {
      const trail = await auditService.getPatientAuditTrail('patient-456');

      for (let i = 0; i < trail.entries.length - 1; i++) {
        const current = new Date(trail.entries[i].timestamp);
        const next = new Date(trail.entries[i + 1].timestamp);
        expect(current >= next).toBe(true);
      }
    });
  });

  describe('Audit Entry Retrieval', () => {
    test('should retrieve specific audit entry', async () => {
      const recordResult = await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication'
      });

      const entry = await auditService.getAuditEntry(recordResult.auditId);

      expect(entry.found).toBe(true);
      expect(entry.entry.auditId).toBe(recordResult.auditId);
      expect(entry.integrityValid).toBe(true);
      expect(entry.disclaimer).toBe('For physician review only');
    });

    test('should handle non-existent audit entry', async () => {
      const entry = await auditService.getAuditEntry('non-existent-id');

      expect(entry.found).toBe(false);
      expect(entry.message).toBe('Audit entry not found');
    });
  });

  describe('Audit Trail Search', () => {
    beforeEach(async () => {
      await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed aspirin',
        riskLevel: 'LOW'
      });
      
      await auditService.recordClinicalDecision({
        userId: 'physician-456',
        patientId: 'patient-789',
        action: 'REVIEW_LABS',
        physicianDecision: 'Labs reviewed',
        riskLevel: 'HIGH'
      });
    });

    test('should search by user ID', async () => {
      const results = await auditService.searchAuditTrail({
        userId: 'physician-123'
      });

      expect(results.totalResults).toBe(1);
      expect(results.entries[0].userId).toBe('physician-123');
    });

    test('should search by patient ID', async () => {
      const results = await auditService.searchAuditTrail({
        patientId: 'patient-456'
      });

      expect(results.totalResults).toBe(1);
      expect(results.entries[0].patientId).toBe('patient-456');
    });

    test('should search by event type', async () => {
      const results = await auditService.searchAuditTrail({
        eventType: 'CLINICAL_DECISION'
      });

      expect(results.totalResults).toBe(2);
    });

    test('should search by risk level', async () => {
      const results = await auditService.searchAuditTrail({
        riskLevel: 'HIGH'
      });

      expect(results.totalResults).toBe(1);
      expect(results.entries[0].riskLevel).toBe('HIGH');
    });

    test('should apply multiple search criteria', async () => {
      const results = await auditService.searchAuditTrail({
        userId: 'physician-123',
        patientId: 'patient-456',
        riskLevel: 'LOW'
      });

      expect(results.totalResults).toBe(1);
      expect(results.entries[0].userId).toBe('physician-123');
      expect(results.entries[0].patientId).toBe('patient-456');
    });
  });

  describe('Integrity Verification', () => {
    test('should verify audit trail integrity', async () => {
      await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication'
      });

      const verification = await auditService.verifyAuditTrailIntegrity();

      expect(verification.totalChecked).toBe(1);
      expect(verification.valid).toBe(1);
      expect(verification.invalid).toBe(0);
      expect(verification.integrityPercentage).toBe('100.00');
    });

    test('should verify specific audit entries', async () => {
      const result1 = await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication'
      });

      const result2 = await auditService.recordClinicalDecision({
        userId: 'physician-456',
        patientId: 'patient-789',
        action: 'REVIEW_LABS',
        physicianDecision: 'Labs reviewed'
      });

      const verification = await auditService.verifyAuditTrailIntegrity([
        result1.auditId,
        result2.auditId
      ]);

      expect(verification.totalChecked).toBe(2);
      expect(verification.valid).toBe(2);
    });
  });

  describe('Audit Statistics', () => {
    beforeEach(async () => {
      await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication',
        riskLevel: 'LOW'
      });
      
      await auditService.recordSystemAccess({
        userId: 'physician-123',
        userRole: 'physician',
        action: 'LOGIN',
        accessGranted: true,
        sessionId: 'session-789',
        ipAddress: '192.168.1.1'
      });
      
      await auditService.recordClinicalDecision({
        userId: 'physician-456',
        patientId: 'patient-789',
        action: 'REVIEW_LABS',
        physicianDecision: 'Labs reviewed',
        riskLevel: 'HIGH'
      });
    });

    test('should generate audit statistics', async () => {
      const stats = await auditService.getAuditStatistics();

      expect(stats.totalEntries).toBe(3);
      expect(stats.eventTypeCounts).toHaveProperty('CLINICAL_DECISION');
      expect(stats.eventTypeCounts).toHaveProperty('SYSTEM_ACCESS');
      expect(stats.riskLevelCounts).toHaveProperty('LOW');
      expect(stats.riskLevelCounts).toHaveProperty('HIGH');
      expect(stats.disclaimer).toBe('For physician review only');
    });

    test('should filter statistics by user', async () => {
      const stats = await auditService.getAuditStatistics({
        userId: 'physician-123'
      });

      expect(stats.totalEntries).toBe(2);
    });

    test('should filter statistics by patient', async () => {
      const stats = await auditService.getAuditStatistics({
        patientId: 'patient-456'
      });

      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('Audit Trail Export', () => {
    beforeEach(async () => {
      await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication'
      });
    });

    test('should export audit trail', async () => {
      const exportData = await auditService.exportAuditTrail();

      expect(exportData.exportId).toBeDefined();
      expect(exportData.exportTimestamp).toBeDefined();
      expect(exportData.format).toBe('JSON');
      expect(exportData.totalEntries).toBe(1);
      expect(exportData.entries).toBeDefined();
      expect(exportData.integrityVerified).toBe(true);
      expect(exportData.disclaimer).toContain('For physician review only');
    });

    test('should export with filters', async () => {
      await auditService.recordClinicalDecision({
        userId: 'physician-456',
        patientId: 'patient-789',
        action: 'REVIEW_LABS',
        physicianDecision: 'Labs reviewed'
      });

      const exportData = await auditService.exportAuditTrail({
        patientId: 'patient-456'
      });

      expect(exportData.totalEntries).toBe(1);
      expect(exportData.filters.patientId).toBe('patient-456');
    });
  });

  describe('Service Statistics', () => {
    test('should return service statistics', async () => {
      await auditService.recordClinicalDecision({
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication'
      });

      const stats = auditService.getServiceStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.eventTypes).toContain('CLINICAL_DECISION');
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(stats.disclaimer).toBe('For physician review only');
    });
  });

  describe('Data Sanitization', () => {
    test('should hash sensitive data', async () => {
      const decisionData = {
        userId: 'physician-123',
        patientId: 'patient-456',
        action: 'PRESCRIBE_MEDICATION',
        physicianDecision: 'Prescribed medication',
        ipAddress: '192.168.1.1'
      };

      const result = await auditService.recordClinicalDecision(decisionData);
      const entry = await auditService.getAuditEntry(result.auditId);

      expect(entry.entry.ipAddress).not.toBe('192.168.1.1');
      expect(entry.entry.ipAddress).toContain('hashed_');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty audit trail', async () => {
      const trail = await auditService.getPatientAuditTrail('non-existent-patient');

      expect(trail.totalEntries).toBe(0);
      expect(trail.entries).toEqual([]);
    });

    test('should handle search with no results', async () => {
      const results = await auditService.searchAuditTrail({
        userId: 'non-existent-user'
      });

      expect(results.totalResults).toBe(0);
      expect(results.entries).toEqual([]);
    });
  });
});
