/**
 * Unit tests for Alert Management Service
 * Requirements: 1.1, 8.2
 */

const AlertService = require('./alert-service');

describe('AlertService', () => {
  let alertService;

  beforeEach(() => {
    alertService = new AlertService();
  });

  describe('Alert Generation', () => {
    it('should generate alert with unique ID', () => {
      const data = {
        patientId: 'P001',
        systolicBP: 185,
        diastolicBP: 95,
      };

      const alert = alertService.generateAlert(data, 'vitals');

      expect(alert.id).toBeDefined();
      expect(alert.id).toContain('ALERT-');
      expect(alert.patientId).toBe('P001');
      expect(alert.type).toBe('vitals');
    });

    it('should set timestamp on alert creation', () => {
      const data = { patientId: 'P001', systolicBP: 185 };
      const alert = alertService.generateAlert(data, 'vitals');

      expect(alert.timestamp).toBeDefined();
      expect(new Date(alert.timestamp)).toBeInstanceOf(Date);
    });

    it('should initialize alert as not acknowledged', () => {
      const data = { patientId: 'P001', systolicBP: 185 };
      const alert = alertService.generateAlert(data, 'vitals');

      expect(alert.acknowledged).toBe(false);
      expect(alert.resolvedAt).toBeNull();
    });
  });

  describe('Vital Signs Severity', () => {
    it('should classify critical high blood pressure', () => {
      const vitals = { patientId: 'P001', systolicBP: 185, diastolicBP: 95 };
      const alert = alertService.generateAlert(vitals, 'vitals');

      expect(alert.severity).toBe('CRITICAL');
    });

    it('should classify critical low blood pressure', () => {
      const vitals = { patientId: 'P001', systolicBP: 65, diastolicBP: 40 };
      const alert = alertService.generateAlert(vitals, 'vitals');

      expect(alert.severity).toBe('CRITICAL');
    });

    it('should classify critical heart rate', () => {
      const vitals = { patientId: 'P001', heartRate: 135 };
      const alert = alertService.generateAlert(vitals, 'vitals');

      expect(alert.severity).toBe('CRITICAL');
    });

    it('should classify critical oxygen saturation', () => {
      const vitals = { patientId: 'P001', oxygenSaturation: 85 };
      const alert = alertService.generateAlert(vitals, 'vitals');

      expect(alert.severity).toBe('CRITICAL');
    });

    it('should classify high priority for elevated BP', () => {
      const vitals = { patientId: 'P001', systolicBP: 165, diastolicBP: 95 };
      const alert = alertService.generateAlert(vitals, 'vitals');

      expect(alert.severity).toBe('HIGH');
    });
  });

  describe('Lab Results Severity', () => {
    it('should classify critical glucose levels', () => {
      const labs = { patientId: 'P001', glucose: 450 };
      const alert = alertService.generateAlert(labs, 'labs');

      expect(alert.severity).toBe('CRITICAL');
    });

    it('should classify critical potassium levels', () => {
      const labs = { patientId: 'P001', potassium: 6.5 };
      const alert = alertService.generateAlert(labs, 'labs');

      expect(alert.severity).toBe('CRITICAL');
    });

    it('should classify high priority for multiple abnormal results', () => {
      const labs = { 
        patientId: 'P001', 
        abnormalCount: 3,
        abnormalResults: ['Glucose', 'Creatinine', 'Sodium']
      };
      const alert = alertService.generateAlert(labs, 'labs');

      expect(alert.severity).toBe('HIGH');
    });
  });

  describe('Medication Severity', () => {
    it('should classify critical for allergy conflict', () => {
      const meds = {
        patientId: 'P001',
        allergyConflict: true,
        medication: 'Penicillin',
      };
      const alert = alertService.generateAlert(meds, 'medications');

      expect(alert.severity).toBe('CRITICAL');
    });

    it('should classify high for drug interaction', () => {
      const meds = {
        patientId: 'P001',
        drugInteraction: true,
        interactionSeverity: 'high',
        medication: 'Warfarin',
        interactsWith: 'Aspirin',
      };
      const alert = alertService.generateAlert(meds, 'medications');

      expect(alert.severity).toBe('HIGH');
    });
  });

  describe('Alert Messages', () => {
    it('should generate descriptive message for vital signs', () => {
      const vitals = { patientId: 'P001', systolicBP: 185, diastolicBP: 95 };
      const alert = alertService.generateAlert(vitals, 'vitals');

      expect(alert.message).toContain('Critical BP');
      expect(alert.message).toContain('185/95');
    });

    it('should generate message for lab results', () => {
      const labs = {
        patientId: 'P001',
        abnormalResults: ['Glucose', 'HbA1c'],
      };
      const alert = alertService.generateAlert(labs, 'labs');

      expect(alert.message).toContain('abnormal lab result');
      expect(alert.message).toContain('Glucose');
    });

    it('should generate message for allergy conflict', () => {
      const meds = {
        patientId: 'P001',
        allergyConflict: true,
        medication: 'Penicillin',
      };
      const alert = alertService.generateAlert(meds, 'medications');

      expect(alert.message).toContain('ALLERGY ALERT');
      expect(alert.message).toContain('Penicillin');
    });
  });

  describe('Alert Prioritization', () => {
    it('should prioritize by severity', () => {
      const alerts = [
        { id: '1', severity: 'MEDIUM', timestamp: new Date().toISOString() },
        { id: '2', severity: 'CRITICAL', timestamp: new Date().toISOString() },
        { id: '3', severity: 'HIGH', timestamp: new Date().toISOString() },
      ];

      const prioritized = alertService.prioritizeAlerts(alerts);

      expect(prioritized[0].severity).toBe('CRITICAL');
      expect(prioritized[1].severity).toBe('HIGH');
      expect(prioritized[2].severity).toBe('MEDIUM');
    });

    it('should prioritize by age within same severity', () => {
      const now = Date.now();
      const alerts = [
        { id: '1', severity: 'HIGH', timestamp: new Date(now).toISOString() },
        { id: '2', severity: 'HIGH', timestamp: new Date(now - 60000).toISOString() },
      ];

      const prioritized = alertService.prioritizeAlerts(alerts);

      expect(prioritized[0].id).toBe('2'); // Older alert first
    });
  });

  describe('Alert Acknowledgment', () => {
    it('should acknowledge alert', () => {
      const data = { patientId: 'P001', systolicBP: 185 };
      const alert = alertService.generateAlert(data, 'vitals');

      const acknowledged = alertService.acknowledgeAlert(alert.id, 'user123');

      expect(acknowledged.acknowledged).toBe(true);
      expect(acknowledged.acknowledgedBy).toBe('user123');
      expect(acknowledged.acknowledgedAt).toBeDefined();
    });

    it('should throw error for non-existent alert', () => {
      expect(() => {
        alertService.acknowledgeAlert('invalid-id', 'user123');
      }).toThrow('Alert invalid-id not found');
    });
  });

  describe('Alert Resolution', () => {
    it('should resolve alert', () => {
      const data = { patientId: 'P001', systolicBP: 185 };
      const alert = alertService.generateAlert(data, 'vitals');

      const resolved = alertService.resolveAlert(
        alert.id,
        'user123',
        'BP normalized after medication'
      );

      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolvedBy).toBe('user123');
      expect(resolved.resolution).toBe('BP normalized after medication');
    });
  });

  describe('Active Alerts', () => {
    it('should get active alerts for patient', () => {
      alertService.generateAlert({ patientId: 'P001', systolicBP: 185 }, 'vitals');
      alertService.generateAlert({ patientId: 'P001', glucose: 450 }, 'labs');
      alertService.generateAlert({ patientId: 'P002', systolicBP: 185 }, 'vitals');

      const alerts = alertService.getActiveAlerts('P001');

      expect(alerts.length).toBe(2);
      expect(alerts.every(a => a.patientId === 'P001')).toBe(true);
    });

    it('should exclude resolved alerts', () => {
      const alert1 = alertService.generateAlert({ patientId: 'P001', systolicBP: 185 }, 'vitals');
      alertService.generateAlert({ patientId: 'P001', glucose: 450 }, 'labs');

      alertService.resolveAlert(alert1.id, 'user123', 'Resolved');

      const alerts = alertService.getActiveAlerts('P001');

      expect(alerts.length).toBe(1);
    });

    it('should get all active alerts', () => {
      alertService.generateAlert({ patientId: 'P001', systolicBP: 185 }, 'vitals');
      alertService.generateAlert({ patientId: 'P002', glucose: 450 }, 'labs');

      const alerts = alertService.getAllActiveAlerts();

      expect(alerts.length).toBe(2);
    });
  });

  describe('Alert Escalation', () => {
    it('should determine if alert should escalate', () => {
      const alert = {
        id: 'test',
        severity: 'HIGH',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
        acknowledged: false,
        escalated: false,
        resolvedAt: null,
      };

      const shouldEscalate = alertService.shouldEscalate(alert);

      expect(shouldEscalate).toBe(true);
    });

    it('should not escalate acknowledged alerts', () => {
      const alert = {
        id: 'test',
        severity: 'HIGH',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        acknowledged: true,
        escalated: false,
        resolvedAt: null,
      };

      const shouldEscalate = alertService.shouldEscalate(alert);

      expect(shouldEscalate).toBe(false);
    });

    it('should escalate alert', () => {
      const data = { patientId: 'P001', systolicBP: 185 };
      const alert = alertService.generateAlert(data, 'vitals');

      const escalated = alertService.escalateAlert(alert.id);

      expect(escalated.escalated).toBe(true);
      expect(escalated.escalatedAt).toBeDefined();
    });
  });
});
