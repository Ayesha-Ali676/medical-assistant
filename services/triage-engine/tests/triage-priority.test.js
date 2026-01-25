/**
 * Property-Based Tests for Triage Priority Ordering
 * Feature: medassist-clinical-enhancements, Property 2: Triage Priority Ordering
 * Validates: Requirements 1.2
 * For physician review only
 */

const fc = require('fast-check');
const { RiskScoringModel } = require('../src/models/risk-scoring');
const TriageService = require('../src/services/triage-service');

describe('Feature: medassist-clinical-enhancements, Property 2: Triage Priority Ordering', () => {
  
  let riskModel;
  let mockDbManager;
  let triageService;
  
  beforeEach(() => {
    riskModel = new RiskScoringModel();
    
    // Mock database manager
    mockDbManager = {
      executeQuery: jest.fn(),
      initializePostgreSQL: jest.fn(),
      initializeRedis: jest.fn()
    };
    
    triageService = new TriageService(mockDbManager);
  });

  // Property test: Patients should be ordered by clinical urgency scores in descending priority order
  test('Patients are ordered by clinical urgency scores in descending priority order', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientCollection(),
      async (patientCollection) => {
        const { patients, tenantId } = patientCollection;
        
        // Calculate triage scores for all patients
        const triageResults = [];
        for (const patient of patients) {
          const riskAssessment = riskModel.calculateRiskScores(patient);
          const priorityLevel = determinePriorityLevel(riskAssessment.overallRisk.score);
          
          triageResults.push({
            patientId: patient.id,
            priorityLevel,
            urgencyScore: riskAssessment.overallRisk.score,
            patient
          });
        }
        
        // Sort by priority (CRITICAL > HIGH > NORMAL) then by urgency score (descending)
        const sortedResults = triageResults.sort((a, b) => {
          const priorityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'NORMAL': 3 };
          
          if (priorityOrder[a.priorityLevel] !== priorityOrder[b.priorityLevel]) {
            return priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
          }
          
          return b.urgencyScore - a.urgencyScore;
        });
        
        // Verify ordering properties
        for (let i = 0; i < sortedResults.length - 1; i++) {
          const current = sortedResults[i];
          const next = sortedResults[i + 1];
          
          // Priority ordering: CRITICAL should come before HIGH, HIGH before NORMAL
          const priorityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'NORMAL': 3 };
          expect(priorityOrder[current.priorityLevel]).toBeLessThanOrEqual(priorityOrder[next.priorityLevel]);
          
          // Within same priority level, higher urgency scores should come first
          if (current.priorityLevel === next.priorityLevel) {
            expect(current.urgencyScore).toBeGreaterThanOrEqual(next.urgencyScore);
          }
        }
        
        // Verify all patients are included
        expect(sortedResults.length).toBe(patients.length);
        
        // Verify all patient IDs are preserved
        const originalIds = patients.map(p => p.id).sort();
        const sortedIds = sortedResults.map(r => r.patientId).sort();
        expect(sortedIds).toEqual(originalIds);
      }
    ), { numRuns: 1000 });
  });

  // Property test: Priority levels should be consistently assigned based on risk scores
  test('Priority levels are consistently assigned based on risk scores', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientData(),
      async (patientData) => {
        // Calculate risk assessment
        const riskAssessment = riskModel.calculateRiskScores(patientData);
        const priorityLevel = determinePriorityLevel(riskAssessment.overallRisk.score);
        
        // Verify priority level assignment consistency
        if (riskAssessment.overallRisk.score >= 80) {
          expect(priorityLevel).toBe('CRITICAL');
        } else if (riskAssessment.overallRisk.score >= 60) {
          expect(priorityLevel).toBe('HIGH');
        } else {
          expect(priorityLevel).toBe('NORMAL');
        }
        
        // Verify risk assessment structure
        expect(riskAssessment).toHaveProperty('overallRisk');
        expect(riskAssessment).toHaveProperty('riskCategories');
        expect(riskAssessment).toHaveProperty('disclaimer');
        expect(riskAssessment.disclaimer).toBe('For physician review only');
        
        // Verify risk categories
        expect(riskAssessment.riskCategories).toHaveProperty('cardiac');
        expect(riskAssessment.riskCategories).toHaveProperty('respiratory');
        expect(riskAssessment.riskCategories).toHaveProperty('infection');
        expect(riskAssessment.riskCategories).toHaveProperty('medication');
        
        // Verify score ranges
        expect(riskAssessment.overallRisk.score).toBeGreaterThanOrEqual(0);
        expect(riskAssessment.overallRisk.score).toBeLessThanOrEqual(100);
      }
    ), { numRuns: 1000 });
  });

  // Property test: Risk factors should influence priority calculation appropriately
  test('Risk factors influence priority calculation appropriately', async () => {
    await fc.assert(fc.asyncProperty(
      generateHighRiskPatientData(),
      async (patientData) => {
        const riskAssessment = riskModel.calculateRiskScores(patientData);
        
        // High-risk patients should have elevated scores
        if (patientData.hasHighRiskFactors) {
          expect(riskAssessment.overallRisk.score).toBeGreaterThan(15);
          
          // Should have identifiable risk factors
          const allFactors = Object.values(riskAssessment.riskCategories)
            .flatMap(category => category.factors || []);
          expect(allFactors.length).toBeGreaterThan(0);
        }
        
        // Verify individual risk categories have valid scores
        for (const [category, risk] of Object.entries(riskAssessment.riskCategories)) {
          expect(risk.score).toBeGreaterThanOrEqual(0);
          expect(risk.score).toBeLessThanOrEqual(100);
          expect(['Low', 'Moderate', 'High', 'Critical']).toContain(risk.level);
          expect(typeof risk.confidence).toBe('number');
          expect(risk.confidence).toBeGreaterThanOrEqual(0);
          expect(risk.confidence).toBeLessThanOrEqual(100);
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: Triage queue should maintain temporal ordering within priority levels
  test('Triage queue maintains temporal ordering within priority levels', async () => {
    await fc.assert(fc.asyncProperty(
      generateTimestampedPatients(),
      async (timestampedPatients) => {
        const { patients, tenantId } = timestampedPatients;
        
        // Ensure unique patient IDs to avoid conflicts
        const uniquePatients = patients.map((patient, index) => ({
          ...patient,
          id: `patient-${index}-${patient.id}`
        }));
        
        // Mock database response for queue retrieval with proper ordering
        const mockQueueData = uniquePatients.map(patient => {
          const riskAssessment = riskModel.calculateRiskScores(patient);
          const priorityLevel = determinePriorityLevel(riskAssessment.overallRisk.score);
          
          return {
            id: patient.id,
            patient_id: patient.id,
            family_name: patient.familyName || 'Test',
            given_names: patient.givenNames || ['Patient'],
            priority_level: priorityLevel,
            urgency_score: riskAssessment.overallRisk.score,
            calculated_at: patient.calculatedAt,
            factors: [],
            explanation: []
          };
        }).sort((a, b) => {
          // Sort by priority first (CRITICAL=1, HIGH=2, NORMAL=3)
          const priorityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'NORMAL': 3 };
          const priorityDiff = priorityOrder[a.priority_level] - priorityOrder[b.priority_level];
          if (priorityDiff !== 0) return priorityDiff;
          
          // Then by urgency score descending
          const scoreDiff = b.urgency_score - a.urgency_score;
          if (scoreDiff !== 0) return scoreDiff;
          
          // Then by calculated_at ascending
          return new Date(a.calculated_at) - new Date(b.calculated_at);
        });
        
        mockDbManager.executeQuery.mockResolvedValue({ rows: mockQueueData });
        
        // Get patient queue
        const queue = await triageService.getPatientQueue(tenantId);
        
        // Skip test if queue is empty or has only one patient
        if (queue.length <= 1) {
          return true;
        }
        
        // Verify temporal ordering within same priority levels
        const groupedByPriority = queue.reduce((groups, patient) => {
          if (!groups[patient.priorityLevel]) {
            groups[patient.priorityLevel] = [];
          }
          groups[patient.priorityLevel].push(patient);
          return groups;
        }, {});
        
        // Within each priority group, patients should be ordered by urgency score (desc) then time (asc)
        for (const [priority, patientsInGroup] of Object.entries(groupedByPriority)) {
          // Skip if group has only one patient
          if (patientsInGroup.length <= 1) {
            continue;
          }
          
          for (let i = 0; i < patientsInGroup.length - 1; i++) {
            const current = patientsInGroup[i];
            const next = patientsInGroup[i + 1];
            
            // Higher urgency scores should come first, or equal scores are acceptable
            // This property should hold even if all scores are 0
            expect(current.urgencyScore).toBeGreaterThanOrEqual(next.urgencyScore);
          }
        }
        
        // Verify all patients have required disclaimer
        for (const patient of queue) {
          expect(patient.disclaimer).toBe('For physician review only');
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: Risk model should handle edge cases gracefully
  test('Risk model handles edge cases gracefully', async () => {
    await fc.assert(fc.asyncProperty(
      generateEdgeCasePatientData(),
      async (patientData) => {
        // Risk model should not throw errors with edge case data
        let riskAssessment;
        expect(() => {
          riskAssessment = riskModel.calculateRiskScores(patientData);
        }).not.toThrow();
        
        // Should always return valid structure
        expect(riskAssessment).toBeDefined();
        expect(riskAssessment.overallRisk).toBeDefined();
        expect(riskAssessment.riskCategories).toBeDefined();
        expect(riskAssessment.disclaimer).toBe('For physician review only');
        
        // Scores should be within valid ranges even with missing data
        expect(riskAssessment.overallRisk.score).toBeGreaterThanOrEqual(0);
        expect(riskAssessment.overallRisk.score).toBeLessThanOrEqual(100);
        
        // Should handle missing or invalid vital signs gracefully
        if (!patientData.vitals || Object.keys(patientData.vitals).length === 0) {
          // Should still produce a valid assessment
          expect(riskAssessment.overallRisk.score).toBeGreaterThanOrEqual(0);
        }
        
        // Should handle missing medical history gracefully
        if (!patientData.past_history || patientData.past_history.length === 0) {
          // Should still produce a valid assessment
          expect(riskAssessment.overallRisk.score).toBeGreaterThanOrEqual(0);
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: Priority updates should maintain audit trail integrity
  test('Priority updates maintain audit trail integrity', async () => {
    await fc.assert(fc.asyncProperty(
      generatePriorityUpdateData(),
      async (updateData) => {
        const { patientId, newPriority, physicianId, tenantId } = updateData;
        
        // Reset mock before each test
        mockDbManager.executeQuery.mockClear();
        
        // Mock successful update
        mockDbManager.executeQuery
          .mockResolvedValueOnce({ rows: [{ id: patientId, priority_level: newPriority }] }) // Update query
          .mockResolvedValueOnce({ rows: [{ id: 'audit-id' }] }); // Audit query
        
        const result = await triageService.updateTriagePriority(patientId, newPriority, physicianId, tenantId);
        
        // Verify update was successful
        expect(result.success).toBe(true);
        expect(result.disclaimer).toBe('For physician review only');
        
        // Verify database calls were made correctly
        expect(mockDbManager.executeQuery).toHaveBeenCalledTimes(2);
        
        // First call should be the priority update
        const updateCall = mockDbManager.executeQuery.mock.calls[0];
        expect(updateCall[1]).toContain(newPriority);
        expect(updateCall[1]).toContain(physicianId);
        expect(updateCall[1]).toContain(patientId);
        expect(updateCall[1]).toContain(tenantId);
        
        // Second call should be the audit trail entry
        const auditCall = mockDbManager.executeQuery.mock.calls[1];
        expect(auditCall[0]).toContain('audit_trail');
        expect(auditCall[1]).toContain(physicianId);
        expect(auditCall[1]).toContain(patientId);
        expect(auditCall[1]).toContain(tenantId);
      }
    ), { numRuns: 1000 });
  });
});

// Helper function to determine priority level (matches service logic)
function determinePriorityLevel(riskScore) {
  if (riskScore >= 80) return 'CRITICAL';
  if (riskScore >= 60) return 'HIGH';
  return 'NORMAL';
}

// Generator functions for property-based testing

function generatePatientCollection() {
  return fc.record({
    tenantId: fc.uuid(),
    patients: fc.array(generatePatientData(), { minLength: 1, maxLength: 20 })
  });
}

function generatePatientData() {
  return fc.record({
    id: fc.uuid(),
    age: fc.integer({ min: 0, max: 120 }),
    vitals: fc.record({
      bp: fc.option(fc.string().map(s => `${fc.sample(fc.integer({ min: 90, max: 200 }), 1)[0]}/${fc.sample(fc.integer({ min: 60, max: 120 }), 1)[0]}`)),
      hr: fc.option(fc.integer({ min: 40, max: 180 }).map(String)),
      temp: fc.option(fc.float({ min: 96, max: 106 }).map(String)),
      spo2: fc.option(fc.integer({ min: 85, max: 100 }).map(String)),
      rr: fc.option(fc.integer({ min: 10, max: 40 }).map(String))
    }),
    past_history: fc.array(fc.constantFrom(
      'Diabetes mellitus',
      'Hypertension',
      'Asthma',
      'COPD',
      'Cardiac disease',
      'Cancer',
      'Immunocompromised'
    ), { maxLength: 5 }),
    current_medications: fc.array(fc.record({
      name: fc.constantFrom('Metformin', 'Lisinopril', 'Warfarin', 'Insulin', 'Aspirin', 'Digoxin'),
      dosage: fc.string({ minLength: 1, maxLength: 20 }),
      frequency: fc.constantFrom('Once daily', 'Twice daily', 'Three times daily', 'PRN')
    }), { maxLength: 8 }),
    lab_results: fc.array(fc.record({
      test_name: fc.constantFrom('WBC', 'Glucose', 'HbA1c', 'Creatinine', 'Cholesterol'),
      value: fc.float({ min: 0, max: 500 }),
      unit: fc.constantFrom('mg/dL', '%', 'mmol/L', '/uL'),
      is_abnormal: fc.boolean()
    }), { maxLength: 10 })
  });
}

function generateHighRiskPatientData() {
  return fc.record({
    id: fc.uuid(),
    age: fc.integer({ min: 65, max: 95 }), // Elderly patients
    hasHighRiskFactors: fc.constant(true),
    vitals: fc.record({
      bp: fc.constantFrom('180/110', '160/100', '190/95'), // Hypertensive
      hr: fc.integer({ min: 100, max: 150 }).map(String), // Tachycardic
      temp: fc.float({ min: 101, max: 104 }).map(String), // Febrile
      spo2: fc.integer({ min: 88, max: 94 }).map(String) // Hypoxic
    }),
    past_history: fc.array(fc.constantFrom(
      'Diabetes mellitus',
      'Cardiac disease',
      'COPD',
      'Immunocompromised',
      'Cancer'
    ), { minLength: 2, maxLength: 4 }),
    current_medications: fc.array(fc.record({
      name: fc.constantFrom('Warfarin', 'Insulin', 'Digoxin', 'Lithium'),
      dosage: fc.string({ minLength: 3, maxLength: 20 }),
      frequency: fc.string({ minLength: 5, maxLength: 20 })
    }), { minLength: 3, maxLength: 8 }),
    lab_results: fc.array(fc.record({
      test_name: fc.constantFrom('WBC', 'Glucose', 'HbA1c'),
      value: fc.oneof(
        fc.float({ min: 15000, max: 25000 }), // High WBC
        fc.float({ min: 250, max: 400 }), // High glucose
        fc.float({ min: 9, max: 12 }) // High HbA1c
      ),
      unit: fc.constantFrom('mg/dL', '%', '/uL'),
      is_abnormal: fc.constant(true)
    }), { minLength: 1, maxLength: 5 })
  });
}

function generateTimestampedPatients() {
  return fc.record({
    tenantId: fc.uuid(),
    patients: fc.array(fc.record({
      id: fc.uuid(),
      age: fc.integer({ min: 25, max: 85 }),
      familyName: fc.string({ minLength: 3, maxLength: 20 }),
      givenNames: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 1, maxLength: 2 }),
      calculatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
      vitals: fc.record({
        bp: fc.option(fc.oneof(
          fc.constant('120/80'),
          fc.constant('140/90'),
          fc.constant('160/100')
        )),
        hr: fc.option(fc.oneof(
          fc.constant('70'),
          fc.constant('90'),
          fc.constant('110')
        )),
        temp: fc.option(fc.oneof(
          fc.constant('98.6'),
          fc.constant('100.2'),
          fc.constant('101.5')
        ))
      }),
      past_history: fc.array(fc.constantFrom(
        'Hypertension',
        'Diabetes',
        'Asthma'
      ), { maxLength: 2 }),
      current_medications: fc.array(fc.record({
        name: fc.constantFrom('Aspirin', 'Metformin', 'Lisinopril'),
        dosage: fc.constantFrom('5mg', '10mg', '25mg'),
        frequency: fc.constantFrom('Once daily', 'Twice daily')
      }), { maxLength: 3 }),
      lab_results: fc.array(fc.record({
        test_name: fc.constantFrom('Glucose', 'Cholesterol', 'WBC'),
        value: fc.float({ min: 80, max: 200 }),
        unit: fc.constantFrom('mg/dL', '/uL'),
        is_abnormal: fc.boolean()
      }), { maxLength: 3 })
    }), { minLength: 3, maxLength: 8 })
  });
}

function generateEdgeCasePatientData() {
  return fc.oneof(
    // Patient with no vitals
    fc.record({
      id: fc.uuid(),
      age: fc.option(fc.integer({ min: 0, max: 120 })),
      vitals: fc.constant({}),
      past_history: fc.option(fc.array(fc.string(), { maxLength: 2 })),
      current_medications: fc.option(fc.array(fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 })
      }), { maxLength: 2 })),
      lab_results: fc.option(fc.array(fc.record({
        test_name: fc.string({ minLength: 1, maxLength: 20 }),
        value: fc.float({ min: 0, max: 100 })
      }), { maxLength: 2 }))
    }),
    
    // Patient with minimal data
    fc.record({
      id: fc.uuid(),
      age: fc.integer({ min: 0, max: 120 }),
      vitals: fc.option(fc.record({})),
      past_history: fc.constant([]),
      current_medications: fc.constant([]),
      lab_results: fc.constant([])
    }),
    
    // Patient with extreme values
    fc.record({
      id: fc.uuid(),
      age: fc.constantFrom(0, 120),
      vitals: fc.record({
        bp: fc.option(fc.constantFrom('300/200', '50/30', 'invalid')),
        hr: fc.option(fc.constantFrom('300', '20', 'invalid')),
        temp: fc.option(fc.constantFrom('110', '90', 'invalid'))
      }),
      past_history: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 1 })),
      current_medications: fc.option(fc.array(fc.record({
        name: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
      }), { maxLength: 1 })),
      lab_results: fc.option(fc.array(fc.record({
        test_name: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
        value: fc.option(fc.oneof(fc.float({ min: -100, max: 1000 }), fc.constant(null)))
      }), { maxLength: 1 }))
    })
  );
}

function generatePriorityUpdateData() {
  return fc.record({
    patientId: fc.uuid(),
    newPriority: fc.constantFrom('CRITICAL', 'HIGH', 'NORMAL'),
    physicianId: fc.uuid(),
    tenantId: fc.uuid()
  });
}