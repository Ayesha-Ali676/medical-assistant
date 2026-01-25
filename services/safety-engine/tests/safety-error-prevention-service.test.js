/**
 * Tests for Safety Error Prevention Service
 * For physician review only
 */

const SafetyErrorPreventionService = require('../src/services/safety-error-prevention-service');

describe('Safety Error Prevention Service', () => {
  let safetyService;
  
  beforeEach(() => {
    safetyService = new SafetyErrorPreventionService();
  });

  describe('Medication Order Validation', () => {
    test('should detect duplicate medication', async () => {
      const medicationOrder = {
        name: 'Aspirin',
        dose: '81mg',
        frequency: 'daily'
      };
      
      const patientContext = {
        currentMedications: [
          { name: 'Aspirin', dose: '81mg', frequency: 'daily' }
        ],
        allergies: []
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result.safe).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].ruleName).toContain('Duplicate');
      expect(result.requiresPhysicianConfirmation).toBe(true);
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should detect excessive dose', async () => {
      const medicationOrder = {
        name: 'Warfarin',
        dose: '15mg',
        frequency: 'daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: []
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result.safe).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.violations[0].severity).toBe('CRITICAL');
      expect(result.violations[0].message).toContain('exceeds maximum');
    });

    test('should detect patient allergy', async () => {
      const medicationOrder = {
        name: 'Penicillin',
        dose: '500mg',
        frequency: 'three times daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: [
          { allergen: 'Penicillin', reaction: 'Anaphylaxis' }
        ]
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result.safe).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.violations[0].severity).toBe('CRITICAL');
      expect(result.violations[0].message).toContain('allergy');
    });

    test('should allow safe medication order', async () => {
      const medicationOrder = {
        name: 'Metformin',
        dose: '500mg',
        frequency: 'twice daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: []
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result.safe).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Lab Order Validation', () => {
    test('should detect duplicate lab order', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      const labOrder = {
        testName: 'Complete Blood Count',
        orderTime: now.toISOString()
      };
      
      const patientContext = {
        recentLabOrders: [
          {
            testName: 'Complete Blood Count',
            orderTime: twoHoursAgo.toISOString()
          }
        ]
      };

      const result = await safetyService.validateLabOrder(labOrder, patientContext);

      // MEDIUM severity creates warnings, not violations, so safe=true but warnings exist
      expect(result.safe).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('already ordered');
      expect(result.requiresPhysicianConfirmation).toBe(true);
    });

    test('should allow lab order after time window', async () => {
      const labOrder = {
        testName: 'Complete Blood Count',
        orderTime: new Date().toISOString()
      };
      
      const patientContext = {
        recentLabOrders: [
          {
            testName: 'Complete Blood Count',
            orderTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 48 hours ago
          }
        ]
      };

      const result = await safetyService.validateLabOrder(labOrder, patientContext);

      expect(result.safe).toBe(true);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Vital Signs Validation', () => {
    test('should detect critical high blood pressure', async () => {
      const vitals = {
        systolicBP: 190,
        diastolicBP: 110,
        heartRate: 75,
        oxygenSat: 98,
        temperature: 98.6
      };

      const result = await safetyService.validateVitalSigns(vitals);

      expect(result.safe).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.violations[0].severity).toBe('CRITICAL');
      expect(result.violations[0].message).toContain('Systolic BP');
    });

    test('should detect critical low oxygen saturation', async () => {
      const vitals = {
        systolicBP: 120,
        diastolicBP: 80,
        heartRate: 75,
        oxygenSat: 85,
        temperature: 98.6
      };

      const result = await safetyService.validateVitalSigns(vitals);

      expect(result.safe).toBe(false);
      expect(result.violations[0].message).toContain('O2 saturation');
      expect(result.violations[0].recommendation).toContain('Immediate');
    });

    test('should detect tachycardia', async () => {
      const vitals = {
        systolicBP: 120,
        diastolicBP: 80,
        heartRate: 135,
        oxygenSat: 98,
        temperature: 98.6
      };

      const result = await safetyService.validateVitalSigns(vitals);

      expect(result.safe).toBe(false);
      expect(result.violations[0].message).toContain('tachycardia');
    });

    test('should detect bradycardia', async () => {
      const vitals = {
        systolicBP: 120,
        diastolicBP: 80,
        heartRate: 45,
        oxygenSat: 98,
        temperature: 98.6
      };

      const result = await safetyService.validateVitalSigns(vitals);

      expect(result.safe).toBe(false);
      expect(result.violations[0].message).toContain('bradycardia');
    });

    test('should allow normal vital signs', async () => {
      const vitals = {
        systolicBP: 120,
        diastolicBP: 80,
        heartRate: 75,
        oxygenSat: 98,
        temperature: 98.6
      };

      const result = await safetyService.validateVitalSigns(vitals);

      expect(result.safe).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Discharge Validation', () => {
    test('should prevent discharge with low oxygen saturation', async () => {
      const patientContext = {
        currentVitals: {
          oxygenSat: 88
        },
        latestLabResults: {},
        currentSymptoms: []
      };

      const result = await safetyService.validateDischarge(patientContext);

      expect(result.safe).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.violations[0].message).toContain('unstable');
      expect(result.violations[0].message).toContain('oxygen');
    });

    test('should prevent discharge with active chest pain', async () => {
      const patientContext = {
        currentVitals: {
          oxygenSat: 98
        },
        latestLabResults: {},
        currentSymptoms: ['chest pain', 'shortness of breath']
      };

      const result = await safetyService.validateDischarge(patientContext);

      expect(result.safe).toBe(false);
      expect(result.violations[0].message).toContain('chest pain');
    });

    test('should prevent discharge with elevated troponin', async () => {
      const patientContext = {
        currentVitals: {
          oxygenSat: 98
        },
        latestLabResults: {
          troponin: 0.08
        },
        currentSymptoms: []
      };

      const result = await safetyService.validateDischarge(patientContext);

      expect(result.safe).toBe(false);
      expect(result.violations[0].message).toContain('troponin');
    });

    test('should allow discharge for stable patient', async () => {
      const patientContext = {
        currentVitals: {
          oxygenSat: 98
        },
        latestLabResults: {
          troponin: 0.01
        },
        currentSymptoms: []
      };

      const result = await safetyService.validateDischarge(patientContext);

      expect(result.safe).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Physician Confirmation', () => {
    test('should create confirmation request for unsafe action', async () => {
      const medicationOrder = {
        name: 'Warfarin',
        dose: '15mg',
        frequency: 'daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: []
      };

      const safetyCheck = await safetyService.validateMedicationOrder(medicationOrder, patientContext);
      const confirmationRequest = await safetyService.requestPhysicianConfirmation(
        safetyCheck,
        'physician-123'
      );

      expect(confirmationRequest.requestId).toBeDefined();
      expect(confirmationRequest.safetyCheckId).toBe(safetyCheck.checkId);
      expect(confirmationRequest.physicianId).toBe('physician-123');
      expect(confirmationRequest.status).toBe('PENDING');
      expect(confirmationRequest.requiresJustification).toBe(true);
      expect(confirmationRequest.disclaimer).toBe('For physician review only');
    });

    test('should record physician override', async () => {
      const confirmationRequest = {
        requestId: 'request-123',
        safetyCheckId: 'check-456'
      };
      
      const overrideData = {
        physicianId: 'physician-123',
        approved: true,
        justification: 'Patient has unique circumstances requiring this dose'
      };

      const override = await safetyService.recordPhysicianOverride(
        confirmationRequest,
        overrideData
      );

      expect(override.overrideId).toBeDefined();
      expect(override.approved).toBe(true);
      expect(override.justification).toBeDefined();
      expect(override.disclaimer).toBe('For physician review only');
    });
  });

  describe('Risk Level Calculation', () => {
    test('should calculate CRITICAL risk for critical violations', async () => {
      const medicationOrder = {
        name: 'Penicillin',
        dose: '500mg',
        frequency: 'three times daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: [
          { allergen: 'Penicillin', reaction: 'Anaphylaxis' }
        ]
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result.overallRisk).toBe('CRITICAL');
    });

    test('should calculate NONE risk for safe actions', async () => {
      const medicationOrder = {
        name: 'Metformin',
        dose: '500mg',
        frequency: 'twice daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: []
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result.overallRisk).toBe('NONE');
    });
  });

  describe('Prevention Statistics', () => {
    beforeEach(async () => {
      // Create test data
      await safetyService.validateMedicationOrder(
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' },
        { currentMedications: [{ name: 'Aspirin', dose: '81mg' }], allergies: [] }
      );
      
      await safetyService.validateMedicationOrder(
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
        { currentMedications: [], allergies: [] }
      );
    });

    test('should generate prevention statistics', () => {
      const stats = safetyService.getPreventionStatistics();

      expect(stats.totalChecks).toBe(2);
      expect(stats.safeActions).toBe(1);
      expect(stats.unsafeActions).toBe(1);
      expect(stats.preventionRate).toBeDefined();
      expect(stats.disclaimer).toBe('For physician review only');
    });

    test('should filter statistics by action type', () => {
      const stats = safetyService.getPreventionStatistics({
        actionType: 'medication'
      });

      expect(stats.totalChecks).toBe(2);
    });
  });

  describe('Recent Violations', () => {
    test('should retrieve recent violations', async () => {
      await safetyService.validateMedicationOrder(
        { name: 'Warfarin', dose: '15mg', frequency: 'daily' },
        { currentMedications: [], allergies: [] }
      );

      const recent = safetyService.getRecentViolations(5);

      expect(recent.count).toBeGreaterThan(0);
      expect(recent.violations.length).toBeGreaterThan(0);
      expect(recent.disclaimer).toBe('For physician review only');
    });
  });

  describe('Custom Safety Rules', () => {
    test('should add custom safety rule', () => {
      const customRule = {
        ruleId: 'CUSTOM-001',
        name: 'Custom Test Rule',
        severity: 'HIGH',
        check: (context) => ({
          violated: false,
          message: null,
          recommendation: 'Test recommendation'
        })
      };

      const result = safetyService.addSafetyRule('medication', customRule);

      expect(result.success).toBe(true);
      expect(result.disclaimer).toBe('For physician review only');
    });
  });

  describe('Service Statistics', () => {
    test('should return service statistics', () => {
      const stats = safetyService.getServiceStats();

      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.rulesByType).toHaveProperty('medication');
      expect(stats.rulesByType).toHaveProperty('vitalSigns');
      expect(stats.disclaimer).toBe('For physician review only');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty patient context', async () => {
      const medicationOrder = {
        name: 'Metformin',
        dose: '500mg',
        frequency: 'twice daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: []
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result).toBeDefined();
      expect(result.checkId).toBeDefined();
    });

    test('should handle medication without dose information', async () => {
      const medicationOrder = {
        name: 'Aspirin',
        dose: 'as needed',
        frequency: 'prn'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: []
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result).toBeDefined();
    });
  });

  describe('Result Structure', () => {
    test('should return complete safety check structure', async () => {
      const medicationOrder = {
        name: 'Aspirin',
        dose: '81mg',
        frequency: 'daily'
      };
      
      const patientContext = {
        currentMedications: [],
        allergies: []
      };

      const result = await safetyService.validateMedicationOrder(medicationOrder, patientContext);

      expect(result).toHaveProperty('checkId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('actionType');
      expect(result).toHaveProperty('actionDescription');
      expect(result).toHaveProperty('safe');
      expect(result).toHaveProperty('blocked');
      expect(result).toHaveProperty('requiresPhysicianConfirmation');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('overallRisk');
      expect(result).toHaveProperty('disclaimer');
    });
  });
});
