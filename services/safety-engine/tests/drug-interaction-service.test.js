/**
 * Tests for Drug Interaction Service
 * For physician review only
 */

const DrugInteractionService = require('../src/services/drug-interaction-service');

describe('Drug Interaction Service', () => {
  let drugService;
  
  beforeEach(() => {
    drugService = new DrugInteractionService();
  });

  describe('Drug Interaction Detection', () => {
    test('should detect critical warfarin-aspirin interaction', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.interactionsFound).toBe(1);
      expect(result.interactions[0].severity).toBe('HIGH');
      expect(result.interactions[0].drug1).toBe('Warfarin');
      expect(result.interactions[0].drug2).toBe('Aspirin');
      expect(result.interactions[0].clinicalSignificance).toContain('bleeding');
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should detect simvastatin-clarithromycin critical interaction', async () => {
      const medications = [
        { name: 'Simvastatin', dose: '40mg', frequency: 'daily' },
        { name: 'Clarithromycin', dose: '500mg', frequency: 'twice daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.interactionsFound).toBe(1);
      expect(result.interactions[0].severity).toBe('CRITICAL');
      expect(result.interactions[0].clinicalSignificance).toContain('rhabdomyolysis');
      expect(result.requiresPhysicianReview).toBe(true);
    });

    test('should detect multiple interactions in complex regimen', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' },
        { name: 'Ibuprofen', dose: '400mg', frequency: 'as needed' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.interactionsFound).toBeGreaterThan(1);
      expect(result.overallRisk).toBe('HIGH');
    });

    test('should return no interactions for safe combination', async () => {
      const medications = [
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
        { name: 'Lisinopril', dose: '10mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.interactionsFound).toBe(0);
      expect(result.overallRisk).toBe('NONE');
      expect(result.requiresPhysicianReview).toBe(false);
    });

    test('should handle case-insensitive drug names', async () => {
      const medications = [
        { name: 'WARFARIN', dose: '5mg', frequency: 'daily' },
        { name: 'aspirin', dose: '81mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.interactionsFound).toBe(1);
      expect(result.interactions[0].severity).toBe('HIGH');
    });
  });

  describe('Contraindication Detection', () => {
    test('should detect metformin contraindication with renal impairment', async () => {
      const medications = [
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' }
      ];
      const conditions = ['severe renal impairment', 'diabetes'];

      const result = await drugService.checkDrugInteractions(medications, conditions);

      expect(result.contraindicationsFound).toBe(1);
      expect(result.contraindications[0].severity).toBe('CRITICAL');
      expect(result.contraindications[0].reason).toContain('lactic acidosis');
    });

    test('should detect warfarin contraindication in pregnancy', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' }
      ];
      const conditions = ['pregnancy', 'atrial fibrillation'];

      const result = await drugService.checkDrugInteractions(medications, conditions);

      expect(result.contraindicationsFound).toBe(1);
      expect(result.contraindications[0].severity).toBe('CRITICAL');
      expect(result.contraindications[0].recommendation).toContain('heparin');
    });

    test('should detect lisinopril contraindication in pregnancy', async () => {
      const medications = [
        { name: 'Lisinopril', dose: '10mg', frequency: 'daily' }
      ];
      const conditions = ['pregnancy', 'hypertension'];

      const result = await drugService.checkDrugInteractions(medications, conditions);

      expect(result.contraindicationsFound).toBe(1);
      expect(result.contraindications[0].severity).toBe('CRITICAL');
    });

    test('should handle multiple contraindications', async () => {
      const medications = [
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' }
      ];
      const conditions = ['severe renal impairment', 'acute heart failure'];

      const result = await drugService.checkDrugInteractions(medications, conditions);

      expect(result.contraindicationsFound).toBe(2);
      expect(result.overallRisk).toBe('CRITICAL');
    });
  });

  describe('Severity Classification', () => {
    test('should classify overall risk as CRITICAL for critical interactions', async () => {
      const medications = [
        { name: 'Simvastatin', dose: '40mg', frequency: 'daily' },
        { name: 'Clarithromycin', dose: '500mg', frequency: 'twice daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.overallRisk).toBe('CRITICAL');
      expect(result.requiresPhysicianReview).toBe(true);
    });

    test('should classify overall risk as HIGH for high severity interactions', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.overallRisk).toBe('HIGH');
      expect(result.requiresPhysicianReview).toBe(true);
    });

    test('should sort interactions by severity', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' },
        { name: 'Ibuprofen', dose: '400mg', frequency: 'as needed' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      // First interaction should be highest severity
      for (let i = 0; i < result.interactions.length - 1; i++) {
        const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        expect(severityOrder[result.interactions[i].severity])
          .toBeLessThanOrEqual(severityOrder[result.interactions[i + 1].severity]);
      }
    });
  });

  describe('Clinical Recommendations', () => {
    test('should provide specific recommendations for interactions', async () => {
      const medications = [
        { name: 'Lisinopril', dose: '10mg', frequency: 'daily' },
        { name: 'Spironolactone', dose: '25mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.interactions[0].recommendation).toBeDefined();
      expect(result.interactions[0].recommendation).toContain('potassium');
      expect(result.interactions[0].mechanism).toBeDefined();
    });

    test('should include mechanism of interaction', async () => {
      const medications = [
        { name: 'Metoprolol', dose: '50mg', frequency: 'twice daily' },
        { name: 'Verapamil', dose: '80mg', frequency: 'three times daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.interactions[0].mechanism).toBeDefined();
      expect(result.interactions[0].mechanism.length).toBeGreaterThan(0);
    });
  });

  describe('Interaction Details', () => {
    test('should get detailed interaction information', async () => {
      const details = await drugService.getInteractionDetails('Warfarin', 'Aspirin');

      expect(details.found).toBe(true);
      expect(details.severity).toBe('HIGH');
      expect(details.mechanism).toBeDefined();
      expect(details.recommendation).toBeDefined();
      expect(details.disclaimer).toBe('For physician review only');
    });

    test('should handle non-existent interaction', async () => {
      const details = await drugService.getInteractionDetails('Metformin', 'Lisinopril');

      expect(details.found).toBe(false);
      expect(details.message).toContain('No known interaction');
    });
  });

  describe('Clinical Alert Generation', () => {
    test('should generate alert for critical interactions', async () => {
      const medications = [
        { name: 'Simvastatin', dose: '40mg', frequency: 'daily' },
        { name: 'Clarithromycin', dose: '500mg', frequency: 'twice daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);
      const alert = drugService.generateClinicalAlert(result);

      expect(alert).not.toBeNull();
      expect(alert.alertType).toBe('DRUG_INTERACTION');
      expect(alert.severity).toBe('CRITICAL');
      expect(alert.requiresAcknowledgment).toBe(true);
      expect(alert.issues.length).toBeGreaterThan(0);
    });

    test('should not generate alert for low-risk combinations', async () => {
      const medications = [
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
        { name: 'Lisinopril', dose: '10mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);
      const alert = drugService.generateClinicalAlert(result);

      expect(alert).toBeNull();
    });

    test('should include all critical and high severity issues in alert', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' },
        { name: 'Amiodarone', dose: '200mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);
      const alert = drugService.generateClinicalAlert(result);

      expect(alert).not.toBeNull();
      expect(alert.issues.length).toBeGreaterThan(0);
      alert.issues.forEach(issue => {
        expect(['CRITICAL', 'HIGH']).toContain(issue.severity);
      });
    });
  });

  describe('Severity Statistics', () => {
    test('should calculate severity statistics', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' },
        { name: 'Ibuprofen', dose: '400mg', frequency: 'as needed' }
      ];

      const result = await drugService.checkDrugInteractions(medications);
      const stats = drugService.getSeverityStatistics(result);

      expect(stats).toHaveProperty('critical');
      expect(stats).toHaveProperty('high');
      expect(stats).toHaveProperty('medium');
      expect(stats).toHaveProperty('low');
      expect(stats.total).toBe(result.interactionsFound + result.contraindicationsFound);
    });
  });

  describe('Database Management', () => {
    test('should add custom interaction', () => {
      const interactionData = {
        drug: 'newdrug',
        severity: 'HIGH',
        mechanism: 'Test mechanism',
        recommendation: 'Test recommendation',
        clinicalSignificance: 'Test significance'
      };

      const result = drugService.addInteraction('testdrug', interactionData);

      expect(result.success).toBe(true);
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should get database statistics', () => {
      const stats = drugService.getDatabaseStats();

      expect(stats.drugsInDatabase).toBeGreaterThan(0);
      expect(stats.totalInteractions).toBeGreaterThan(0);
      expect(stats.contraindicationsTracked).toBeGreaterThan(0);
      expect(stats.disclaimer).toBe('For physician review only');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty medication list', async () => {
      const result = await drugService.checkDrugInteractions([]);

      expect(result.medicationsChecked).toBe(0);
      expect(result.interactionsFound).toBe(0);
      expect(result.overallRisk).toBe('NONE');
    });

    test('should handle single medication', async () => {
      const medications = [
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result.medicationsChecked).toBe(1);
      expect(result.interactionsFound).toBe(0);
    });

    test('should handle medications with special characters', async () => {
      const medications = [
        { name: 'Warfarin 5mg', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin-81', dose: '81mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      // After normalization: "warfarin5mg" -> "warfarin" and "aspirin81" -> "aspirin"
      // These should match the database entries
      expect(result.interactionsFound).toBe(1);
      expect(result.interactions[0].severity).toBe('HIGH');
    });
  });

  describe('Result Structure', () => {
    test('should return complete result structure', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      expect(result).toHaveProperty('checkId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('medicationsChecked');
      expect(result).toHaveProperty('interactionsFound');
      expect(result).toHaveProperty('contraindicationsFound');
      expect(result).toHaveProperty('overallRisk');
      expect(result).toHaveProperty('interactions');
      expect(result).toHaveProperty('contraindications');
      expect(result).toHaveProperty('requiresPhysicianReview');
      expect(result).toHaveProperty('disclaimer');
    });

    test('should include unique IDs for each interaction', async () => {
      const medications = [
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' },
        { name: 'Ibuprofen', dose: '400mg', frequency: 'as needed' }
      ];

      const result = await drugService.checkDrugInteractions(medications);

      result.interactions.forEach(interaction => {
        expect(interaction).toHaveProperty('interactionId');
        expect(interaction.interactionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });
  });
});
