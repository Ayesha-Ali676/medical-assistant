/**
 * Property-Based Tests for Drug Interaction Detection
 * Feature: medassist-clinical-enhancements, Property 11: Drug Interaction Detection
 * Validates: Requirements 3.1
 * 
 * Property: For any medication combination with known interactions, 
 * the Safety_Engine should generate alerts with appropriate severity levels 
 * and clinical recommendations
 * 
 * For physician review only
 */

const fc = require('fast-check');
const DrugInteractionService = require('../src/services/drug-interaction-service');

describe('Feature: medassist-clinical-enhancements, Property 11: Drug Interaction Detection', () => {
  let drugService;
  
  beforeEach(() => {
    drugService = new DrugInteractionService();
  });

  // Known drug pairs with interactions from the database
  const knownInteractions = [
    { drug1: 'warfarin', drug2: 'aspirin', expectedSeverity: 'HIGH' },
    { drug1: 'warfarin', drug2: 'ibuprofen', expectedSeverity: 'MEDIUM' },
    { drug1: 'warfarin', drug2: 'amiodarone', expectedSeverity: 'HIGH' },
    { drug1: 'metoprolol', drug2: 'verapamil', expectedSeverity: 'HIGH' },
    { drug1: 'metoprolol', drug2: 'insulin', expectedSeverity: 'MEDIUM' },
    { drug1: 'lisinopril', drug2: 'spironolactone', expectedSeverity: 'HIGH' },
    { drug1: 'lisinopril', drug2: 'ibuprofen', expectedSeverity: 'MEDIUM' },
    { drug1: 'simvastatin', drug2: 'amiodarone', expectedSeverity: 'HIGH' },
    { drug1: 'simvastatin', drug2: 'clarithromycin', expectedSeverity: 'CRITICAL' },
    { drug1: 'clarithromycin', drug2: 'warfarin', expectedSeverity: 'HIGH' },
    { drug1: 'sertraline', drug2: 'tramadol', expectedSeverity: 'HIGH' },
    { drug1: 'sertraline', drug2: 'aspirin', expectedSeverity: 'MEDIUM' }
  ];

  // Known contraindications
  const knownContraindications = [
    { drug: 'metformin', condition: 'severe renal impairment', expectedSeverity: 'CRITICAL' },
    { drug: 'metformin', condition: 'acute heart failure', expectedSeverity: 'CRITICAL' },
    { drug: 'warfarin', condition: 'active bleeding', expectedSeverity: 'CRITICAL' },
    { drug: 'warfarin', condition: 'pregnancy', expectedSeverity: 'CRITICAL' },
    { drug: 'lisinopril', condition: 'pregnancy', expectedSeverity: 'CRITICAL' },
    { drug: 'lisinopril', condition: 'bilateral renal artery stenosis', expectedSeverity: 'CRITICAL' }
  ];

  // Generators for property-based testing
  const medicationArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    dose: fc.string({ minLength: 1, maxLength: 20 }),
    frequency: fc.oneof(
      fc.constant('daily'),
      fc.constant('twice daily'),
      fc.constant('three times daily'),
      fc.constant('as needed')
    )
  });

  const knownDrugArbitrary = fc.oneof(
    ...knownInteractions.map(interaction => 
      fc.constant(interaction.drug1)
    )
  );

  const knownInteractionPairArbitrary = fc.oneof(
    ...knownInteractions.map(interaction =>
      fc.constant(interaction)
    )
  );

  const knownContraindicationArbitrary = fc.oneof(
    ...knownContraindications.map(contraindication =>
      fc.constant(contraindication)
    )
  );

  describe('Core Property: Known Interactions Always Detected', () => {
    test('Property: Any known drug interaction pair should be detected with correct severity', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownInteractionPairArbitrary,
          fc.string({ minLength: 1, maxLength: 20 }), // dose1
          fc.string({ minLength: 1, maxLength: 20 }), // dose2
          async (interactionPair, dose1, dose2) => {
            const medications = [
              { name: interactionPair.drug1, dose: dose1, frequency: 'daily' },
              { name: interactionPair.drug2, dose: dose2, frequency: 'daily' }
            ];

            const result = await drugService.checkDrugInteractions(medications);

            // Property assertions
            expect(result.interactionsFound).toBeGreaterThanOrEqual(1);
            expect(result.interactions.length).toBeGreaterThanOrEqual(1);
            
            // Find the specific interaction
            const foundInteraction = result.interactions.find(
              int => 
                (int.drug1.toLowerCase().includes(interactionPair.drug1) && 
                 int.drug2.toLowerCase().includes(interactionPair.drug2)) ||
                (int.drug1.toLowerCase().includes(interactionPair.drug2) && 
                 int.drug2.toLowerCase().includes(interactionPair.drug1))
            );

            expect(foundInteraction).toBeDefined();
            expect(foundInteraction.severity).toBe(interactionPair.expectedSeverity);
            
            // Verify clinical recommendations are provided
            expect(foundInteraction.recommendation).toBeDefined();
            expect(foundInteraction.recommendation.length).toBeGreaterThan(0);
            
            // Verify mechanism is provided
            expect(foundInteraction.mechanism).toBeDefined();
            expect(foundInteraction.mechanism.length).toBeGreaterThan(0);
            
            // Verify clinical significance is provided
            expect(foundInteraction.clinicalSignificance).toBeDefined();
            expect(foundInteraction.clinicalSignificance.length).toBeGreaterThan(0);
            
            // Verify disclaimer is present
            expect(result.disclaimer).toBe('For physician review only');
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Interaction detection is order-independent', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownInteractionPairArbitrary,
          async (interactionPair) => {
            // Test both orders
            const medications1 = [
              { name: interactionPair.drug1, dose: '10mg', frequency: 'daily' },
              { name: interactionPair.drug2, dose: '20mg', frequency: 'daily' }
            ];

            const medications2 = [
              { name: interactionPair.drug2, dose: '20mg', frequency: 'daily' },
              { name: interactionPair.drug1, dose: '10mg', frequency: 'daily' }
            ];

            const result1 = await drugService.checkDrugInteractions(medications1);
            const result2 = await drugService.checkDrugInteractions(medications2);

            // Both orders should detect the same interaction
            expect(result1.interactionsFound).toBe(result2.interactionsFound);
            expect(result1.overallRisk).toBe(result2.overallRisk);
            
            if (result1.interactions.length > 0 && result2.interactions.length > 0) {
              expect(result1.interactions[0].severity).toBe(result2.interactions[0].severity);
            }
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Severity Level Properties', () => {
    test('Property: All detected interactions must have valid severity levels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 2, maxLength: 10 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
            
            result.interactions.forEach(interaction => {
              expect(validSeverities).toContain(interaction.severity);
            });

            result.contraindications.forEach(contraindication => {
              expect(validSeverities).toContain(contraindication.severity);
            });
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Overall risk level must match highest individual severity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 2, maxLength: 10 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'NONE': 0 };
            
            const allIssues = [...result.interactions, ...result.contraindications];
            
            if (allIssues.length === 0) {
              expect(result.overallRisk).toBe('NONE');
            } else {
              const highestSeverity = allIssues.reduce((max, issue) => {
                return severityOrder[issue.severity] > severityOrder[max] ? issue.severity : max;
              }, 'LOW');
              
              expect(result.overallRisk).toBe(highestSeverity);
            }
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Interactions are sorted by severity (highest first)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 2, maxLength: 10 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
            
            for (let i = 0; i < result.interactions.length - 1; i++) {
              const currentSeverity = severityOrder[result.interactions[i].severity];
              const nextSeverity = severityOrder[result.interactions[i + 1].severity];
              expect(currentSeverity).toBeLessThanOrEqual(nextSeverity);
            }
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Clinical Recommendation Properties', () => {
    test('Property: All detected interactions must include clinical recommendations', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownInteractionPairArbitrary,
          async (interactionPair) => {
            const medications = [
              { name: interactionPair.drug1, dose: '10mg', frequency: 'daily' },
              { name: interactionPair.drug2, dose: '20mg', frequency: 'daily' }
            ];

            const result = await drugService.checkDrugInteractions(medications);

            result.interactions.forEach(interaction => {
              // Must have recommendation
              expect(interaction.recommendation).toBeDefined();
              expect(typeof interaction.recommendation).toBe('string');
              expect(interaction.recommendation.length).toBeGreaterThan(0);
              
              // Must have mechanism
              expect(interaction.mechanism).toBeDefined();
              expect(typeof interaction.mechanism).toBe('string');
              expect(interaction.mechanism.length).toBeGreaterThan(0);
              
              // Must have clinical significance
              expect(interaction.clinicalSignificance).toBeDefined();
              expect(typeof interaction.clinicalSignificance).toBe('string');
              expect(interaction.clinicalSignificance.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: High and critical severity interactions require physician review', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownInteractionPairArbitrary,
          async (interactionPair) => {
            const medications = [
              { name: interactionPair.drug1, dose: '10mg', frequency: 'daily' },
              { name: interactionPair.drug2, dose: '20mg', frequency: 'daily' }
            ];

            const result = await drugService.checkDrugInteractions(medications);

            if (result.overallRisk === 'CRITICAL' || result.overallRisk === 'HIGH') {
              expect(result.requiresPhysicianReview).toBe(true);
            }
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Contraindication Properties', () => {
    test('Property: Known contraindications are always detected with correct severity', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownContraindicationArbitrary,
          async (contraindication) => {
            const medications = [
              { name: contraindication.drug, dose: '10mg', frequency: 'daily' }
            ];
            const conditions = [contraindication.condition, 'other condition'];

            const result = await drugService.checkDrugInteractions(medications, conditions);

            expect(result.contraindicationsFound).toBeGreaterThanOrEqual(1);
            
            const foundContraindication = result.contraindications.find(
              c => c.medication.toLowerCase().includes(contraindication.drug) &&
                   c.condition.toLowerCase().includes(contraindication.condition)
            );

            expect(foundContraindication).toBeDefined();
            expect(foundContraindication.severity).toBe(contraindication.expectedSeverity);
            expect(foundContraindication.reason).toBeDefined();
            expect(foundContraindication.recommendation).toBeDefined();
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Contraindications include reason and recommendation', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownContraindicationArbitrary,
          async (contraindication) => {
            const medications = [
              { name: contraindication.drug, dose: '10mg', frequency: 'daily' }
            ];
            const conditions = [contraindication.condition];

            const result = await drugService.checkDrugInteractions(medications, conditions);

            result.contraindications.forEach(c => {
              expect(c.reason).toBeDefined();
              expect(typeof c.reason).toBe('string');
              expect(c.reason.length).toBeGreaterThan(0);
              
              expect(c.recommendation).toBeDefined();
              expect(typeof c.recommendation).toBe('string');
              expect(c.recommendation.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Result Structure Properties', () => {
    test('Property: All results must include required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 1, maxLength: 10 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            // Required fields
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
            
            // Field types
            expect(typeof result.checkId).toBe('string');
            expect(typeof result.timestamp).toBe('string');
            expect(typeof result.medicationsChecked).toBe('number');
            expect(typeof result.interactionsFound).toBe('number');
            expect(typeof result.contraindicationsFound).toBe('number');
            expect(typeof result.overallRisk).toBe('string');
            expect(Array.isArray(result.interactions)).toBe(true);
            expect(Array.isArray(result.contraindications)).toBe(true);
            expect(typeof result.requiresPhysicianReview).toBe('boolean');
            expect(result.disclaimer).toBe('For physician review only');
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Each interaction must have unique ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 2, maxLength: 10 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            const interactionIds = result.interactions.map(i => i.interactionId);
            const uniqueIds = new Set(interactionIds);
            
            expect(uniqueIds.size).toBe(interactionIds.length);
            
            // Verify UUID format
            interactionIds.forEach(id => {
              expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
            });
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Medications checked count matches input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 0, maxLength: 20 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            expect(result.medicationsChecked).toBe(medications.length);
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Interactions found matches array length', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 0, maxLength: 10 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            expect(result.interactionsFound).toBe(result.interactions.length);
            expect(result.contraindicationsFound).toBe(result.contraindications.length);
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Case Insensitivity Properties', () => {
    test('Property: Drug name matching is case-insensitive', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownInteractionPairArbitrary,
          fc.oneof(
            fc.constant('lower'),
            fc.constant('upper'),
            fc.constant('mixed')
          ),
          async (interactionPair, caseType) => {
            let drug1Name, drug2Name;
            
            switch (caseType) {
              case 'lower':
                drug1Name = interactionPair.drug1.toLowerCase();
                drug2Name = interactionPair.drug2.toLowerCase();
                break;
              case 'upper':
                drug1Name = interactionPair.drug1.toUpperCase();
                drug2Name = interactionPair.drug2.toUpperCase();
                break;
              case 'mixed':
                drug1Name = interactionPair.drug1.charAt(0).toUpperCase() + 
                           interactionPair.drug1.slice(1).toLowerCase();
                drug2Name = interactionPair.drug2.charAt(0).toUpperCase() + 
                           interactionPair.drug2.slice(1).toLowerCase();
                break;
            }

            const medications = [
              { name: drug1Name, dose: '10mg', frequency: 'daily' },
              { name: drug2Name, dose: '20mg', frequency: 'daily' }
            ];

            const result = await drugService.checkDrugInteractions(medications);

            // Should detect interaction regardless of case
            expect(result.interactionsFound).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Clinical Alert Properties', () => {
    test('Property: Critical and high-risk interactions generate clinical alerts', async () => {
      await fc.assert(
        fc.asyncProperty(
          knownInteractionPairArbitrary,
          async (interactionPair) => {
            const medications = [
              { name: interactionPair.drug1, dose: '10mg', frequency: 'daily' },
              { name: interactionPair.drug2, dose: '20mg', frequency: 'daily' }
            ];

            const result = await drugService.checkDrugInteractions(medications);
            const alert = drugService.generateClinicalAlert(result);

            if (result.overallRisk === 'CRITICAL' || result.overallRisk === 'HIGH') {
              expect(alert).not.toBeNull();
              expect(alert.alertType).toBe('DRUG_INTERACTION');
              expect(alert.severity).toBe(result.overallRisk);
              expect(alert.requiresAcknowledgment).toBe(true);
              expect(alert.issues.length).toBeGreaterThan(0);
              expect(alert.disclaimer).toBe('For physician review only');
            }
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('Property: Low-risk combinations do not generate alerts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 1, maxLength: 5 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);
            const alert = drugService.generateClinicalAlert(result);

            if (result.overallRisk === 'NONE' || result.overallRisk === 'LOW') {
              expect(alert).toBeNull();
            }
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Disclaimer Properties', () => {
    test('Property: All results must include physician review disclaimer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(medicationArbitrary, { minLength: 0, maxLength: 10 }),
          async (medications) => {
            const result = await drugService.checkDrugInteractions(medications);

            expect(result.disclaimer).toBe('For physician review only');
          }
        ),
        { numRuns: 1000 }
      );
    });
  });
});
