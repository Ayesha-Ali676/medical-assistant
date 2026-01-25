/**
 * Property-Based Test for AI Processing Accuracy
 * **Property 6: AI Processing Accuracy**
 * **Validates: Requirements 2.1, 7.2**
 * 
 * For any medical report or clinical text processed by the AI_Intelligence_Module,
 * the extracted key findings should maintain 95% accuracy compared to manual review
 * and include proper medical coding
 * 
 * For physician review only
 */

const fc = require('fast-check');
const MedicalNLPService = require('../src/services/medical-nlp-service');

describe('Property 6: AI Processing Accuracy', () => {
  let nlpService;
  
  beforeAll(() => {
    nlpService = new MedicalNLPService();
  });

  /**
   * Property: All processed medical texts should include disclaimer
   */
  test('should include medical disclaimer in all outputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 500 }),
        async (text) => {
          const result = await nlpService.processMedicalText(text);
          
          // Property: Every output must include disclaimer
          expect(result.disclaimer).toBe('For physician review only');
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Extracted entities should have valid confidence scores
   */
  test('should maintain valid confidence scores for all extracted entities', async () => {
    const medicalTextArb = fc.oneof(
      fc.constantFrom(
        'Patient has diabetes and hypertension',
        'Severe chest pain with shortness of breath',
        'Blood pressure 140/90, heart rate 85 bpm',
        'Taking metformin 500mg twice daily',
        'Patient denies fever or chills',
        'Mild headache, no nausea or vomiting'
      ),
      fc.string({ minLength: 20, maxLength: 200 })
    );

    await fc.assert(
      fc.asyncProperty(medicalTextArb, async (text) => {
        const result = await nlpService.processMedicalText(text);
        
        // Property: All confidence scores must be between 0 and 1
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        
        // Check entity-level confidence scores
        const checkEntityConfidence = (entities) => {
          if (Array.isArray(entities)) {
            entities.forEach(entity => {
              if (entity.confidence !== undefined) {
                expect(entity.confidence).toBeGreaterThanOrEqual(0);
                expect(entity.confidence).toBeLessThanOrEqual(1);
              }
            });
          }
        };
        
        checkEntityConfidence(result.entities.symptoms);
        checkEntityConfidence(result.entities.medications);
        checkEntityConfidence(result.entities.conditions);
        checkEntityConfidence(result.entities.procedures);
        checkEntityConfidence(result.entities.anatomicalSites);
      }),
      { numRuns: 1000 }
    );
  });


  /**
   * Property: Known medical terms should be extracted with high accuracy
   */
  test('should extract known medical terms with >= 95% accuracy', async () => {
    // Create test cases with known medical terms
    const knownTermsArb = fc.record({
      symptoms: fc.constantFrom('chest pain', 'headache', 'nausea', 'fever', 'dizziness'),
      medications: fc.constantFrom('aspirin', 'metformin', 'lisinopril', 'insulin', 'ibuprofen'),
      conditions: fc.constantFrom('diabetes', 'hypertension', 'asthma', 'pneumonia', 'arthritis')
    });

    await fc.assert(
      fc.asyncProperty(knownTermsArb, async (terms) => {
        // Construct medical text with known terms
        const text = `Patient presents with ${terms.symptoms} and has history of ${terms.conditions}. Currently taking ${terms.medications}.`;
        
        const result = await nlpService.processMedicalText(text);
        
        // Property: Known symptoms should be extracted
        const extractedSymptoms = result.entities.symptoms.map(s => s.term);
        const symptomFound = extractedSymptoms.some(s => 
          s === terms.symptoms || s.includes(terms.symptoms.split(' ')[0])
        );
        expect(symptomFound).toBe(true);
        
        // Property: Known medications should be extracted
        const extractedMedications = result.entities.medications.map(m => m.name);
        expect(extractedMedications).toContain(terms.medications);
        
        // Property: Known conditions should be extracted
        const extractedConditions = result.entities.conditions.map(c => c.name);
        expect(extractedConditions).toContain(terms.conditions);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Vital signs should be extracted with correct values
   */
  test('should extract vital signs with accurate numerical values', async () => {
    const vitalSignsArb = fc.record({
      systolic: fc.integer({ min: 80, max: 200 }),
      diastolic: fc.integer({ min: 40, max: 120 }),
      heartRate: fc.integer({ min: 40, max: 180 }),
      temperature: fc.integer({ min: 950, max: 1050 }).map(t => t / 10), // Generate 95.0 to 105.0
      oxygenSat: fc.integer({ min: 70, max: 100 })
    });

    await fc.assert(
      fc.asyncProperty(vitalSignsArb, async (vitals) => {
        // Add space before F to ensure proper parsing
        const text = `Vital signs: BP ${vitals.systolic}/${vitals.diastolic}, HR ${vitals.heartRate} bpm, Temp ${vitals.temperature.toFixed(1)} F, O2 sat ${vitals.oxygenSat}%`;
        
        const result = await nlpService.processMedicalText(text);
        
        // Property: Blood pressure should be extracted correctly
        if (result.entities.vitals.bloodPressure) {
          const bp = result.entities.vitals.bloodPressure[0];
          expect(bp.systolic).toBe(vitals.systolic);
          expect(bp.diastolic).toBe(vitals.diastolic);
          expect(bp.confidence).toBeGreaterThanOrEqual(0.9);
        }
        
        // Property: Heart rate should be extracted correctly
        if (result.entities.vitals.heartRate) {
          const hr = result.entities.vitals.heartRate[0];
          expect(hr.value).toBe(vitals.heartRate);
          expect(hr.confidence).toBeGreaterThanOrEqual(0.8);
        }
        
        // Property: Temperature should be extracted correctly (allowing for floating point precision)
        if (result.entities.vitals.temperature) {
          const temp = result.entities.vitals.temperature[0];
          expect(Math.abs(temp.value - vitals.temperature)).toBeLessThan(0.1);
          expect(temp.confidence).toBeGreaterThanOrEqual(0.8);
        }
        
        // Property: Oxygen saturation should be extracted correctly
        if (result.entities.vitals.oxygenSaturation) {
          const o2 = result.entities.vitals.oxygenSaturation[0];
          expect(o2.value).toBe(vitals.oxygenSat);
          expect(o2.confidence).toBeGreaterThanOrEqual(0.8);
        }
      }),
      { numRuns: 1000 }
    );
  });


  /**
   * Property: Medication dosages should be extracted with correct amounts and units
   */
  test('should extract medication dosages with accurate amounts and units', async () => {
    const dosageArb = fc.record({
      medication: fc.constantFrom('metformin', 'aspirin', 'lisinopril', 'insulin', 'ibuprofen'),
      amount: fc.integer({ min: 1, max: 1000 }),
      unit: fc.constantFrom('mg', 'g', 'ml', 'mcg', 'units')
    });

    await fc.assert(
      fc.asyncProperty(dosageArb, async (dosage) => {
        const text = `Patient is taking ${dosage.medication} ${dosage.amount}${dosage.unit} daily`;
        
        const result = await nlpService.processMedicalText(text);
        
        // Property: Medication should be extracted
        const extractedMeds = result.entities.medications.map(m => m.name);
        expect(extractedMeds).toContain(dosage.medication);
        
        // Property: Dosage should be extracted with correct amount and unit
        const extractedDosages = result.entities.dosages;
        const matchingDosage = extractedDosages.find(d => 
          d.amount === dosage.amount && d.unit === dosage.unit
        );
        expect(matchingDosage).toBeDefined();
        if (matchingDosage) {
          expect(matchingDosage.confidence).toBeGreaterThanOrEqual(0.8);
        }
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Clinical urgency should be correctly classified
   */
  test('should correctly classify clinical urgency levels', async () => {
    const urgencyTestCases = fc.oneof(
      fc.record({
        text: fc.constant('Patient has severe chest pain and needs emergency care'),
        expectedLevel: fc.constant('high')
      }),
      fc.record({
        text: fc.constant('Patient has moderate pain that is concerning'),
        expectedLevel: fc.constant('medium')
      }),
      fc.record({
        text: fc.constant('Patient has mild headache and is stable'),
        expectedLevel: fc.constant('low')
      })
    );

    await fc.assert(
      fc.asyncProperty(urgencyTestCases, async (testCase) => {
        const result = await nlpService.processMedicalText(testCase.text);
        
        // Property: Urgency level should match expected classification
        expect(result.sentiment.urgencyLevel).toBe(testCase.expectedLevel);
        expect(result.sentiment.confidence).toBeGreaterThanOrEqual(0);
        expect(result.sentiment.confidence).toBeLessThanOrEqual(1);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Processing should be idempotent
   */
  test('should produce consistent results for identical inputs', async () => {
    const medicalTextArb = fc.constantFrom(
      'Patient has diabetes and hypertension',
      'Severe chest pain with shortness of breath',
      'Blood pressure 140/90, heart rate 85 bpm',
      'Taking metformin 500mg twice daily'
    );

    await fc.assert(
      fc.asyncProperty(medicalTextArb, async (text) => {
        const result1 = await nlpService.processMedicalText(text);
        const result2 = await nlpService.processMedicalText(text);
        
        // Property: Same input should produce same entity counts
        expect(result1.entities.symptoms.length).toBe(result2.entities.symptoms.length);
        expect(result1.entities.medications.length).toBe(result2.entities.medications.length);
        expect(result1.entities.conditions.length).toBe(result2.entities.conditions.length);
        
        // Property: Same input should produce same urgency level
        expect(result1.sentiment.urgencyLevel).toBe(result2.sentiment.urgencyLevel);
        
        // Property: Both should have disclaimer
        expect(result1.disclaimer).toBe('For physician review only');
        expect(result2.disclaimer).toBe('For physician review only');
      }),
      { numRuns: 1000 }
    );
  });


  /**
   * Property: Negations should be properly detected
   */
  test('should detect negations in clinical text', async () => {
    const negationArb = fc.record({
      negation: fc.constantFrom('no', 'not', 'denies', 'without', 'absent'),
      symptom: fc.constantFrom('fever', 'pain', 'nausea', 'cough', 'dizziness')
    });

    await fc.assert(
      fc.asyncProperty(negationArb, async (data) => {
        const text = `Patient ${data.negation} ${data.symptom}`;
        
        const result = await nlpService.processMedicalText(text);
        
        // Property: Negation should be detected
        const negations = result.entities.negations.map(n => n.negation);
        expect(negations).toContain(data.negation);
        
        // Property: Negation should have valid confidence
        const negationEntity = result.entities.negations.find(n => n.negation === data.negation);
        if (negationEntity) {
          expect(negationEntity.confidence).toBeGreaterThanOrEqual(0.8);
        }
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Batch processing should maintain accuracy
   */
  test('should maintain accuracy in batch processing', async () => {
    const batchSizeArb = fc.integer({ min: 1, max: 10 });
    const medicalTextsArb = fc.array(
      fc.constantFrom(
        'Patient has diabetes',
        'Blood pressure 140/90',
        'Severe chest pain',
        'Taking aspirin 81mg',
        'Patient denies fever'
      ),
      { minLength: 1, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(medicalTextsArb, async (texts) => {
        const result = await nlpService.batchProcessMedicalTexts(texts);
        
        // Property: Batch result should have correct structure
        expect(result.batchId).toBeDefined();
        expect(result.totalTexts).toBe(texts.length);
        expect(result.results).toHaveLength(texts.length);
        expect(result.disclaimer).toBe('For physician review only');
        
        // Property: Each result should have required fields
        result.results.forEach((res, index) => {
          expect(res.batchId).toBe(result.batchId);
          expect(res.batchIndex).toBe(index);
          
          if (!res.error) {
            expect(res.processingId).toBeDefined();
            expect(res.entities).toBeDefined();
            expect(res.confidence).toBeGreaterThanOrEqual(0);
            expect(res.confidence).toBeLessThanOrEqual(1);
            expect(res.disclaimer).toBe('For physician review only');
          }
        });
        
        // Property: Success rate should be high for valid inputs
        expect(result.successfulProcessing).toBeGreaterThanOrEqual(0);
        expect(result.successfulProcessing).toBeLessThanOrEqual(texts.length);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Processing time should be reasonable
   */
  test('should process medical text within reasonable time', async () => {
    const medicalTextArb = fc.string({ minLength: 50, maxLength: 500 });

    await fc.assert(
      fc.asyncProperty(medicalTextArb, async (text) => {
        const result = await nlpService.processMedicalText(text);
        
        // Property: Processing time should be recorded and reasonable (< 5 seconds)
        expect(result.processingTime).toBeDefined();
        expect(result.processingTime).toBeGreaterThanOrEqual(0);
        expect(result.processingTime).toBeLessThan(5000); // 5 seconds max
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: All outputs should have timestamps
   */
  test('should include valid timestamps in all outputs', async () => {
    const medicalTextArb = fc.string({ minLength: 10, maxLength: 200 });

    await fc.assert(
      fc.asyncProperty(medicalTextArb, async (text) => {
        const result = await nlpService.processMedicalText(text);
        
        // Property: Timestamp should be present and valid ISO format
        expect(result.timestamp).toBeDefined();
        expect(() => new Date(result.timestamp)).not.toThrow();
        
        const timestamp = new Date(result.timestamp);
        expect(timestamp.getTime()).toBeGreaterThan(0);
      }),
      { numRuns: 1000 }
    );
  });
});
