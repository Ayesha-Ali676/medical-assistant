/**
 * Property-Based Tests for Multi-dimensional Risk Calculation
 * Feature: medassist-clinical-enhancements, Property 28: Multi-dimensional Risk Calculation
 * Validates: Requirements 8.1
 * For physician review only
 */

const fc = require('fast-check');
const { RiskScoringModel } = require('../src/models/risk-scoring');

describe('Feature: medassist-clinical-enhancements, Property 28: Multi-dimensional Risk Calculation', () => {
  
  let riskModel;
  
  beforeEach(() => {
    riskModel = new RiskScoringModel();
  });

  // Property test: Multi-dimensional risk scores should include all required risk categories
  test('Multi-dimensional risk scores include all required risk categories', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientData(),
      async (patientData) => {
        const riskAssessment = riskModel.calculateRiskScores(patientData);
        
        // Verify all required risk categories are present
        expect(riskAssessment.riskCategories).toHaveProperty('cardiac');
        expect(riskAssessment.riskCategories).toHaveProperty('respiratory');
        expect(riskAssessment.riskCategories).toHaveProperty('infection');
        expect(riskAssessment.riskCategories).toHaveProperty('medication');
        
        // Verify each category has required structure
        const requiredCategories = ['cardiac', 'respiratory', 'infection', 'medication'];
        for (const category of requiredCategories) {
          const risk = riskAssessment.riskCategories[category];
          
          expect(risk).toHaveProperty('score');
          expect(risk).toHaveProperty('level');
          expect(risk).toHaveProperty('factors');
          expect(risk).toHaveProperty('recommendations');
          expect(risk).toHaveProperty('confidence');
          
          // Verify score is within valid range
          expect(risk.score).toBeGreaterThanOrEqual(0);
          expect(risk.score).toBeLessThanOrEqual(100);
          
          // Verify level is valid
          expect(['Low', 'Moderate', 'High', 'Critical']).toContain(risk.level);
          
          // Verify confidence is within valid range
          expect(risk.confidence).toBeGreaterThanOrEqual(0);
          expect(risk.confidence).toBeLessThanOrEqual(100);
          
          // Verify factors and recommendations are arrays
          expect(Array.isArray(risk.factors)).toBe(true);
          expect(Array.isArray(risk.recommendations)).toBe(true);
        }
        
        // Verify overall risk assessment
        expect(riskAssessment.overallRisk).toHaveProperty('score');
        expect(riskAssessment.overallRisk).toHaveProperty('level');
        expect(riskAssessment.overallRisk).toHaveProperty('confidence');
        
        // Verify disclaimer is present
        expect(riskAssessment.disclaimer).toBe('For physician review only');
      }
    ), { numRuns: 1000 });
  });

  // Property test: Risk scores should be influenced by relevant clinical factors
  test('Risk scores are influenced by relevant clinical factors', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientWithSpecificRisks(),
      async (patientData) => {
        const riskAssessment = riskModel.calculateRiskScores(patientData);
        
        // Cardiac risk should be elevated for patients with cardiac risk factors
        if (patientData.hasCardiacRisk) {
          const cardiacRisk = riskAssessment.riskCategories.cardiac;
          expect(cardiacRisk.score).toBeGreaterThan(10);
          expect(cardiacRisk.factors.length).toBeGreaterThan(0);
        }
        
        // Respiratory risk should be elevated for patients with respiratory risk factors
        if (patientData.hasRespiratoryRisk) {
          const respiratoryRisk = riskAssessment.riskCategories.respiratory;
          expect(respiratoryRisk.score).toBeGreaterThan(10);
          expect(respiratoryRisk.factors.length).toBeGreaterThan(0);
        }
        
        // Infection risk should be elevated for patients with infection risk factors
        if (patientData.hasInfectionRisk) {
          const infectionRisk = riskAssessment.riskCategories.infection;
          expect(infectionRisk.score).toBeGreaterThan(10);
          expect(infectionRisk.factors.length).toBeGreaterThan(0);
        }
        
        // Medication risk should be elevated for patients with medication risk factors
        if (patientData.hasMedicationRisk) {
          const medicationRisk = riskAssessment.riskCategories.medication;
          expect(medicationRisk.score).toBeGreaterThan(10);
          expect(medicationRisk.factors.length).toBeGreaterThan(0);
        }
        
        // Overall risk should reflect individual category risks
        const maxCategoryScore = Math.max(
          riskAssessment.riskCategories.cardiac.score,
          riskAssessment.riskCategories.respiratory.score,
          riskAssessment.riskCategories.infection.score,
          riskAssessment.riskCategories.medication.score
        );
        
        // Overall score should be reasonable relative to category scores
        expect(riskAssessment.overallRisk.score).toBeLessThanOrEqual(100);
        expect(riskAssessment.overallRisk.score).toBeGreaterThanOrEqual(0);
      }
    ), { numRuns: 1000 });
  });

  // Property test: Risk calculation should be consistent for identical inputs
  test('Risk calculation is consistent for identical inputs', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientData(),
      async (patientData) => {
        const riskAssessment1 = riskModel.calculateRiskScores(patientData);
        const riskAssessment2 = riskModel.calculateRiskScores(patientData);
        
        // Overall risk should be identical
        expect(riskAssessment1.overallRisk.score).toBe(riskAssessment2.overallRisk.score);
        expect(riskAssessment1.overallRisk.level).toBe(riskAssessment2.overallRisk.level);
        
        // Individual category scores should be identical
        const categories = ['cardiac', 'respiratory', 'infection', 'medication'];
        for (const category of categories) {
          expect(riskAssessment1.riskCategories[category].score)
            .toBe(riskAssessment2.riskCategories[category].score);
          expect(riskAssessment1.riskCategories[category].level)
            .toBe(riskAssessment2.riskCategories[category].level);
        }
        
        // Disclaimers should be identical
        expect(riskAssessment1.disclaimer).toBe(riskAssessment2.disclaimer);
      }
    ), { numRuns: 1000 });
  });

  // Property test: Risk levels should correspond to score ranges
  test('Risk levels correspond to appropriate score ranges', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientData(),
      async (patientData) => {
        const riskAssessment = riskModel.calculateRiskScores(patientData);
        
        // Check overall risk level consistency
        const overallScore = riskAssessment.overallRisk.score;
        const overallLevel = riskAssessment.overallRisk.level;
        
        if (overallScore >= 80) {
          expect(overallLevel).toBe('Critical');
        } else if (overallScore >= 60) {
          expect(overallLevel).toBe('High');
        } else if (overallScore >= 40) {
          expect(overallLevel).toBe('Moderate');
        } else {
          expect(overallLevel).toBe('Low');
        }
        
        // Check individual category level consistency
        const categories = ['cardiac', 'respiratory', 'infection', 'medication'];
        for (const category of categories) {
          const categoryRisk = riskAssessment.riskCategories[category];
          const score = categoryRisk.score;
          const level = categoryRisk.level;
          
          if (score >= 80) {
            expect(level).toBe('Critical');
          } else if (score >= 60) {
            expect(level).toBe('High');
          } else if (score >= 40) {
            expect(level).toBe('Moderate');
          } else {
            expect(level).toBe('Low');
          }
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: Risk factors should provide meaningful explanations
  test('Risk factors provide meaningful explanations', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientWithKnownRisks(),
      async (patientData) => {
        const riskAssessment = riskModel.calculateRiskScores(patientData);
        
        // When risk factors are present, they should be identified
        const categories = ['cardiac', 'respiratory', 'infection', 'medication'];
        for (const category of categories) {
          const categoryRisk = riskAssessment.riskCategories[category];
          
          // If score is elevated, there should be identifiable factors
          if (categoryRisk.score > 20) {
            expect(categoryRisk.factors.length).toBeGreaterThan(0);
            
            // Factors should be non-empty strings
            for (const factor of categoryRisk.factors) {
              expect(typeof factor).toBe('string');
              expect(factor.length).toBeGreaterThan(0);
            }
          }
          
          // If recommendations are provided, they should be meaningful
          if (categoryRisk.recommendations.length > 0) {
            for (const recommendation of categoryRisk.recommendations) {
              expect(typeof recommendation).toBe('string');
              expect(recommendation.length).toBeGreaterThan(0);
            }
          }
        }
        
        // Explanations should be present for each category
        expect(riskAssessment.explanations).toBeDefined();
        for (const category of categories) {
          expect(riskAssessment.explanations[category]).toBeDefined();
          expect(typeof riskAssessment.explanations[category]).toBe('string');
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: Confidence scores should reflect data quality
  test('Confidence scores reflect data quality and completeness', async () => {
    await fc.assert(fc.asyncProperty(
      fc.oneof(
        generateCompletePatientData(),
        generateIncompletePatientData()
      ),
      async (patientData) => {
        const riskAssessment = riskModel.calculateRiskScores(patientData);
        
        // Overall confidence should be within valid range
        expect(riskAssessment.overallRisk.confidence).toBeGreaterThanOrEqual(0);
        expect(riskAssessment.overallRisk.confidence).toBeLessThanOrEqual(100);
        
        // Individual category confidences should be within valid range
        const categories = ['cardiac', 'respiratory', 'infection', 'medication'];
        for (const category of categories) {
          const confidence = riskAssessment.riskCategories[category].confidence;
          expect(confidence).toBeGreaterThanOrEqual(0);
          expect(confidence).toBeLessThanOrEqual(100);
        }
        
        // Patients with more complete data should generally have higher confidence
        if (patientData.dataCompleteness === 'complete') {
          // Complete data should result in reasonable confidence levels
          expect(riskAssessment.overallRisk.confidence).toBeGreaterThan(50);
        }
        
        // Confidence should be consistent with available data
        const hasVitals = patientData.vitals && Object.keys(patientData.vitals).length > 0;
        const hasHistory = patientData.past_history && patientData.past_history.length > 0;
        const hasMedications = patientData.current_medications && patientData.current_medications.length > 0;
        const hasLabs = patientData.lab_results && patientData.lab_results.length > 0;
        
        const dataPoints = [hasVitals, hasHistory, hasMedications, hasLabs].filter(Boolean).length;
        
        // More data points should generally lead to higher confidence
        if (dataPoints >= 3) {
          expect(riskAssessment.overallRisk.confidence).toBeGreaterThan(60);
        }
      }
    ), { numRuns: 1000 });
  });
});

// Generator functions for property-based testing

function generatePatientData() {
  return fc.record({
    id: fc.uuid(),
    age: fc.integer({ min: 18, max: 95 }),
    vitals: fc.record({
      bp: fc.option(fc.string().map(() => `${fc.sample(fc.integer({ min: 90, max: 200 }), 1)[0]}/${fc.sample(fc.integer({ min: 60, max: 120 }), 1)[0]}`)),
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
      dosage: fc.string({ minLength: 3, maxLength: 20 }),
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

function generatePatientWithSpecificRisks() {
  return fc.record({
    id: fc.uuid(),
    age: fc.integer({ min: 18, max: 95 }),
    hasCardiacRisk: fc.boolean(),
    hasRespiratoryRisk: fc.boolean(),
    hasInfectionRisk: fc.boolean(),
    hasMedicationRisk: fc.boolean(),
    vitals: fc.record({
      bp: fc.option(fc.string()),
      hr: fc.option(fc.string()),
      temp: fc.option(fc.string()),
      spo2: fc.option(fc.string())
    }),
    past_history: fc.array(fc.string(), { maxLength: 5 }),
    current_medications: fc.array(fc.record({
      name: fc.string({ minLength: 3, maxLength: 20 }),
      dosage: fc.string({ minLength: 2, maxLength: 15 }),
      frequency: fc.string({ minLength: 5, maxLength: 20 })
    }), { maxLength: 8 }),
    lab_results: fc.array(fc.record({
      test_name: fc.string({ minLength: 3, maxLength: 15 }),
      value: fc.float({ min: 0, max: 500 }),
      unit: fc.string({ minLength: 2, maxLength: 10 }),
      is_abnormal: fc.boolean()
    }), { maxLength: 10 })
  }).map(patient => {
    // Add specific risk factors based on flags
    if (patient.hasCardiacRisk) {
      patient.age = Math.max(patient.age, 65);
      patient.vitals.bp = '160/100';
      patient.vitals.hr = '110';
      patient.past_history.push('Cardiac disease', 'Hypertension');
    }
    
    if (patient.hasRespiratoryRisk) {
      patient.vitals.spo2 = '90';
      patient.vitals.rr = '25';
      patient.past_history.push('COPD', 'Asthma');
    }
    
    if (patient.hasInfectionRisk) {
      patient.vitals.temp = '102.5';
      patient.past_history.push('Immunocompromised', 'Diabetes mellitus');
      patient.lab_results.push({
        test_name: 'WBC',
        value: 15000,
        unit: '/uL',
        is_abnormal: true
      });
    }
    
    if (patient.hasMedicationRisk) {
      patient.current_medications.push(
        { name: 'Warfarin', dosage: '5mg', frequency: 'Once daily' },
        { name: 'Digoxin', dosage: '0.25mg', frequency: 'Once daily' },
        { name: 'Insulin', dosage: '10 units', frequency: 'Twice daily' }
      );
    }
    
    return patient;
  });
}

function generatePatientWithKnownRisks() {
  return fc.record({
    id: fc.uuid(),
    age: fc.integer({ min: 50, max: 85 }),
    vitals: fc.record({
      bp: fc.constantFrom('140/90', '160/100', '180/110'),
      hr: fc.constantFrom('90', '100', '110'),
      temp: fc.constantFrom('99.5', '100.8', '102.2'),
      spo2: fc.constantFrom('92', '94', '96')
    }),
    past_history: fc.array(fc.constantFrom(
      'Diabetes mellitus',
      'Hypertension',
      'Cardiac disease',
      'COPD',
      'Immunocompromised'
    ), { minLength: 1, maxLength: 3 }),
    current_medications: fc.array(fc.record({
      name: fc.constantFrom('Warfarin', 'Insulin', 'Digoxin', 'Metformin'),
      dosage: fc.constantFrom('5mg', '10mg', '25mg'),
      frequency: fc.constantFrom('Once daily', 'Twice daily')
    }), { minLength: 1, maxLength: 5 }),
    lab_results: fc.array(fc.record({
      test_name: fc.constantFrom('WBC', 'Glucose', 'HbA1c'),
      value: fc.oneof(
        fc.float({ min: 12000, max: 20000 }), // High WBC
        fc.float({ min: 200, max: 350 }), // High glucose
        fc.float({ min: 8, max: 12 }) // High HbA1c
      ),
      unit: fc.constantFrom('mg/dL', '%', '/uL'),
      is_abnormal: fc.constant(true)
    }), { minLength: 1, maxLength: 3 })
  });
}

function generateCompletePatientData() {
  return fc.record({
    id: fc.uuid(),
    age: fc.integer({ min: 18, max: 95 }),
    dataCompleteness: fc.constant('complete'),
    vitals: fc.record({
      bp: fc.string().map(() => `${fc.sample(fc.integer({ min: 100, max: 180 }), 1)[0]}/${fc.sample(fc.integer({ min: 60, max: 110 }), 1)[0]}`),
      hr: fc.integer({ min: 60, max: 120 }).map(String),
      temp: fc.float({ min: 97, max: 102 }).map(String),
      spo2: fc.integer({ min: 92, max: 100 }).map(String),
      rr: fc.integer({ min: 12, max: 25 }).map(String)
    }),
    past_history: fc.array(fc.constantFrom(
      'Diabetes mellitus',
      'Hypertension',
      'Asthma'
    ), { minLength: 1, maxLength: 3 }),
    current_medications: fc.array(fc.record({
      name: fc.constantFrom('Metformin', 'Lisinopril', 'Aspirin'),
      dosage: fc.constantFrom('5mg', '10mg', '25mg'),
      frequency: fc.constantFrom('Once daily', 'Twice daily')
    }), { minLength: 1, maxLength: 5 }),
    lab_results: fc.array(fc.record({
      test_name: fc.constantFrom('Glucose', 'Cholesterol', 'WBC'),
      value: fc.float({ min: 50, max: 300 }),
      unit: fc.constantFrom('mg/dL', '/uL'),
      is_abnormal: fc.boolean()
    }), { minLength: 2, maxLength: 5 })
  });
}

function generateIncompletePatientData() {
  return fc.record({
    id: fc.uuid(),
    age: fc.option(fc.integer({ min: 18, max: 95 })),
    dataCompleteness: fc.constant('incomplete'),
    vitals: fc.option(fc.record({
      bp: fc.option(fc.string()),
      hr: fc.option(fc.string())
    })),
    past_history: fc.option(fc.array(fc.string(), { maxLength: 1 })),
    current_medications: fc.option(fc.array(fc.record({
      name: fc.option(fc.string({ minLength: 3, maxLength: 15 }))
    }), { maxLength: 2 })),
    lab_results: fc.option(fc.array(fc.record({
      test_name: fc.option(fc.string({ minLength: 3, maxLength: 10 })),
      value: fc.option(fc.float({ min: 0, max: 200 }))
    }), { maxLength: 1 }))
  });
}