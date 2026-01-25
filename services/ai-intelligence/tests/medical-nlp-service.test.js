/**
 * Tests for Medical NLP Service
 * For physician review only
 */

const MedicalNLPService = require('../src/services/medical-nlp-service');

describe('Medical NLP Service', () => {
  let nlpService;
  
  beforeAll(async () => {
    nlpService = new MedicalNLPService();
    // Wait for NLP manager to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Text Normalization', () => {
    test('should normalize medical text correctly', () => {
      const text = 'Patient COMPLAINS of severe CHEST PAIN!!! BP: 180/110 mmHg.';
      const normalized = nlpService.normalizeText(text);
      
      expect(normalized).toBe('patient complains of severe chest pain bp 180/110 mmhg.');
    });

    test('should handle special characters and extra whitespace', () => {
      const text = '  Patient   has   diabetes   &   hypertension.  ';
      const normalized = nlpService.normalizeText(text);
      
      expect(normalized).toBe('patient has diabetes hypertension.');
    });
  });

  describe('Symptom Extraction', () => {
    test('should extract common symptoms', () => {
      const text = 'patient complains of chest pain and shortness of breath';
      const symptoms = nlpService.extractSymptoms(text);
      
      expect(symptoms).toHaveLength(2);
      expect(symptoms.find(s => s.term === 'chest pain')).toBeDefined();
      expect(symptoms.find(s => s.term === 'shortness of breath')).toBeDefined();
    });

    test('should extract symptoms with synonyms', () => {
      const text = 'patient has difficulty breathing and stomach pain';
      const symptoms = nlpService.extractSymptoms(text);
      
      expect(symptoms.length).toBeGreaterThan(0);
      expect(symptoms.find(s => s.term === 'shortness of breath' && s.synonym === 'difficulty breathing')).toBeDefined();
      expect(symptoms.find(s => s.term === 'abdominal pain' && s.synonym === 'stomach pain')).toBeDefined();
    });

    test('should provide confidence scores for symptoms', () => {
      const text = 'severe headache and mild nausea';
      const symptoms = nlpService.extractSymptoms(text);
      
      symptoms.forEach(symptom => {
        expect(symptom.confidence).toBeGreaterThan(0);
        expect(symptom.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Medication Extraction', () => {
    test('should extract medication names', () => {
      const text = 'patient is taking metformin 500mg and lisinopril 10mg';
      const medications = nlpService.extractMedications(text);
      
      expect(medications).toHaveLength(2);
      expect(medications.find(m => m.name === 'metformin')).toBeDefined();
      expect(medications.find(m => m.name === 'lisinopril')).toBeDefined();
    });

    test('should have high confidence for medication extraction', () => {
      const text = 'prescribed aspirin and insulin';
      const medications = nlpService.extractMedications(text);
      
      medications.forEach(medication => {
        expect(medication.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('Condition Extraction', () => {
    test('should extract medical conditions', () => {
      const text = 'patient has diabetes and hypertension';
      const conditions = nlpService.extractConditions(text);
      
      expect(conditions).toHaveLength(2);
      expect(conditions.find(c => c.name === 'diabetes')).toBeDefined();
      expect(conditions.find(c => c.name === 'hypertension')).toBeDefined();
    });

    test('should extract complex condition names', () => {
      const text = 'diagnosed with coronary artery disease and heart failure';
      const conditions = nlpService.extractConditions(text);
      
      expect(conditions.find(c => c.name === 'coronary artery disease')).toBeDefined();
      expect(conditions.find(c => c.name === 'heart failure')).toBeDefined();
    });
  });

  describe('Vital Signs Extraction', () => {
    test('should extract blood pressure', () => {
      const text = 'blood pressure is 140/90 mmhg';
      const vitals = nlpService.extractVitalSigns(text);
      
      expect(vitals.bloodPressure).toBeDefined();
      expect(vitals.bloodPressure[0].systolic).toBe(140);
      expect(vitals.bloodPressure[0].diastolic).toBe(90);
      expect(vitals.bloodPressure[0].confidence).toBeGreaterThan(0.9);
    });

    test('should extract heart rate', () => {
      const text = 'heart rate 85 bpm';
      const vitals = nlpService.extractVitalSigns(text);
      
      expect(vitals.heartRate).toBeDefined();
      expect(vitals.heartRate[0].value).toBe(85);
      expect(vitals.heartRate[0].confidence).toBeGreaterThan(0.8);
    });

    test('should extract temperature', () => {
      const text = 'temperature 101.2 degrees fahrenheit';
      const vitals = nlpService.extractVitalSigns(text);
      
      expect(vitals.temperature).toBeDefined();
      expect(vitals.temperature[0].value).toBe(101.2);
    });

    test('should extract oxygen saturation', () => {
      const text = 'oxygen saturation 95%';
      const vitals = nlpService.extractVitalSigns(text);
      
      expect(vitals.oxygenSaturation).toBeDefined();
      expect(vitals.oxygenSaturation[0].value).toBe(95);
    });
  });

  describe('Dosage and Frequency Extraction', () => {
    test('should extract medication dosages', () => {
      const text = 'metformin 500mg twice daily and aspirin 81mg once daily';
      const dosages = nlpService.extractDosages(text);
      
      expect(dosages).toHaveLength(2);
      expect(dosages.find(d => d.amount === 500 && d.unit === 'mg')).toBeDefined();
      expect(dosages.find(d => d.amount === 81 && d.unit === 'mg')).toBeDefined();
    });

    test('should extract medication frequencies', () => {
      const text = 'take twice daily and once daily as needed';
      const frequencies = nlpService.extractFrequencies(text);
      
      expect(frequencies.length).toBeGreaterThan(0);
      frequencies.forEach(freq => {
        expect(freq.confidence).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Clinical Sentiment Analysis', () => {
    test('should detect high urgency keywords', () => {
      const text = 'patient has severe chest pain and needs emergency care';
      const sentiment = nlpService.analyzeClinicalSentiment(text);
      
      expect(sentiment.urgencyLevel).toBe('high');
      expect(sentiment.urgencyScore).toBeGreaterThan(3);
    });

    test('should detect low urgency keywords', () => {
      const text = 'patient has mild headache and is stable';
      const sentiment = nlpService.analyzeClinicalSentiment(text);
      
      expect(sentiment.urgencyLevel).toBe('low');
      expect(sentiment.urgencyScore).toBeLessThan(3);
    });

    test('should detect medium urgency keywords', () => {
      const text = 'patient has moderate pain that is concerning';
      const sentiment = nlpService.analyzeClinicalSentiment(text);
      
      expect(sentiment.urgencyLevel).toBe('medium');
    });
  });

  describe('Clinical Relationship Extraction', () => {
    test('should extract symptom-location relationships', () => {
      const text = 'patient has chest pain';
      const entities = {
        symptoms: [{ term: 'chest pain', positions: [{ start: 12, end: 22 }] }],
        anatomicalSites: [{ name: 'chest', positions: [{ start: 12, end: 17 }] }],
        medications: [],
        conditions: [],
        dosages: []
      };
      
      const relationships = nlpService.extractClinicalRelationships(text, entities);
      
      expect(relationships.find(r => r.type === 'symptom_location')).toBeDefined();
    });

    test('should extract medication-dosage relationships', () => {
      const text = 'metformin 500mg';
      const entities = {
        symptoms: [],
        anatomicalSites: [],
        medications: [{ name: 'metformin', positions: [{ start: 0, end: 8 }] }],
        conditions: [],
        dosages: [{ amount: 500, unit: 'mg', raw: '500mg' }]
      };
      
      const relationships = nlpService.extractClinicalRelationships(text, entities);
      
      expect(relationships.find(r => r.type === 'medication_dosage')).toBeDefined();
    });
  });

  describe('Full Medical Text Processing', () => {
    test('should process complex medical text', async () => {
      const text = `
        Patient is a 65-year-old male with diabetes and hypertension.
        He presents with severe chest pain and shortness of breath.
        Current medications include metformin 500mg twice daily and lisinopril 10mg once daily.
        Vital signs: BP 180/110, HR 95, Temp 98.6F, O2 sat 92%.
        Patient appears anxious and reports pain started 2 hours ago.
      `;
      
      const result = await nlpService.processMedicalText(text);
      
      expect(result).toHaveProperty('processingId');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('classification');
      expect(result).toHaveProperty('relationships');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('confidence');
      expect(result.disclaimer).toBe('For physician review only');
      
      // Check entities
      expect(result.entities.symptoms.length).toBeGreaterThan(0);
      expect(result.entities.medications.length).toBeGreaterThan(0);
      expect(result.entities.conditions.length).toBeGreaterThan(0);
      expect(Object.keys(result.entities.vitals).length).toBeGreaterThan(0);
      
      // Check vital signs
      expect(result.entities.vitals.bloodPressure).toBeDefined();
      expect(result.entities.vitals.heartRate).toBeDefined();
      expect(result.entities.vitals.temperature).toBeDefined();
      expect(result.entities.vitals.oxygenSaturation).toBeDefined();
      
      // Check confidence
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle empty or minimal text', async () => {
      const text = 'Patient is stable.';
      
      const result = await nlpService.processMedicalText(text);
      
      expect(result).toHaveProperty('processingId');
      expect(result).toHaveProperty('entities');
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should process text with negations', async () => {
      const text = 'Patient denies chest pain and has no shortness of breath.';
      
      const result = await nlpService.processMedicalText(text);
      
      expect(result.entities.negations.length).toBeGreaterThan(0);
      expect(result.entities.negations.find(n => n.negation === 'denies')).toBeDefined();
      expect(result.entities.negations.find(n => n.negation === 'no')).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple texts in batch', async () => {
      const texts = [
        'Patient has diabetes and takes metformin.',
        'Blood pressure is 140/90 and heart rate is 85.',
        'Severe chest pain with shortness of breath.'
      ];
      
      const result = await nlpService.batchProcessMedicalTexts(texts);
      
      expect(result).toHaveProperty('batchId');
      expect(result.totalTexts).toBe(3);
      expect(result.successfulProcessing).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.disclaimer).toBe('For physician review only');
      
      result.results.forEach((res, index) => {
        expect(res.batchId).toBe(result.batchId);
        expect(res.batchIndex).toBe(index);
        expect(res).toHaveProperty('processingId');
      });
    });

    test('should handle errors in batch processing gracefully', async () => {
      const texts = [
        'Valid medical text with diabetes.',
        '', // Empty text should cause error
        'Another valid text with hypertension.'
      ];
      
      const result = await nlpService.batchProcessMedicalTexts(texts);
      
      expect(result).toHaveProperty('batchId');
      expect(result.totalTexts).toBe(3);
      expect(result.results).toHaveLength(3);
    });
  });

  describe('Processing Statistics', () => {
    test('should return processing statistics', () => {
      const stats = nlpService.getProcessingStats();
      
      expect(stats).toHaveProperty('medicalTermsCount');
      expect(stats.medicalTermsCount).toHaveProperty('symptoms');
      expect(stats.medicalTermsCount).toHaveProperty('medications');
      expect(stats.medicalTermsCount).toHaveProperty('conditions');
      expect(stats.medicalTermsCount).toHaveProperty('anatomicalSites');
      expect(stats.medicalTermsCount).toHaveProperty('procedures');
      expect(stats).toHaveProperty('patternsCount');
      expect(stats.disclaimer).toBe('For physician review only');
      
      // Verify counts are reasonable
      expect(stats.medicalTermsCount.symptoms).toBeGreaterThan(0);
      expect(stats.medicalTermsCount.medications).toBeGreaterThan(0);
      expect(stats.medicalTermsCount.conditions).toBeGreaterThan(0);
    });
  });
});
