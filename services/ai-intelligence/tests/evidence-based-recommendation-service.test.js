/**
 * Unit Tests for Evidence-Based Recommendation Service
 */

const EvidenceBasedRecommendationService = require('../src/services/evidence-based-recommendation-service');

describe('Evidence-Based Recommendation Service', () => {
  let service;

  beforeEach(() => {
    service = new EvidenceBasedRecommendationService();
  });

  describe('Guideline Management', () => {
    test('should initialize with default guidelines', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalGuidelines).toBeGreaterThan(0);
      expect(stats.totalRecommendations).toBeGreaterThan(0);
      expect(stats.categoryCounts).toBeDefined();
    });

    test('should add new guideline', () => {
      const initialStats = service.getStatistics();
      
      service.addGuideline({
        guidelineId: 'test-001',
        category: 'test_category',
        condition: 'test_condition',
        title: 'Test Guideline',
        recommendations: [
          {
            id: 'test-001-r1',
            text: 'Test recommendation',
            strength: 'STRONG',
            evidenceLevel: 'A',
            sources: ['Test Source']
          }
        ],
        lastUpdated: new Date()
      });

      const newStats = service.getStatistics();
      expect(newStats.totalGuidelines).toBe(initialStats.totalGuidelines + 1);
    });

    test('should retrieve guideline details by ID', () => {
      const guideline = service.getGuidelineDetails('cv-001');
      
      expect(guideline).toBeDefined();
      expect(guideline.guidelineId).toBe('cv-001');
      expect(guideline.title).toBeDefined();
      expect(guideline.recommendations).toBeDefined();
      expect(guideline.disclaimer).toContain('For physician review only');
    });

    test('should return null for non-existent guideline', () => {
      const guideline = service.getGuidelineDetails('non-existent');
      expect(guideline).toBeNull();
    });
  });

  describe('Recommendation Generation', () => {
    test('should generate recommendations for hypertension', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 55,
        comorbidities: ['diabetes'],
        currentMedications: ['metformin'],
        vitalSigns: {
          systolicBP: 145,
          diastolicBP: 92
        }
      };

      const result = service.getRecommendations(clinicalScenario);

      expect(result.condition).toBe('hypertension');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.guidelinesConsulted.length).toBeGreaterThan(0);
      expect(result.disclaimer).toContain('For physician review only');
    });

    test('should generate recommendations for type 2 diabetes', () => {
      const clinicalScenario = {
        condition: 'type2_diabetes',
        patientAge: 48,
        comorbidities: [],
        labResults: {
          a1c: 8.5
        }
      };

      const result = service.getRecommendations(clinicalScenario);

      expect(result.condition).toBe('type2_diabetes');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].strength).toBeDefined();
      expect(result.recommendations[0].evidenceLevel).toBeDefined();
      expect(result.recommendations[0].sources).toBeDefined();
    });

    test('should include source citations in recommendations', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 60
      };

      const result = service.getRecommendations(clinicalScenario);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].sources).toBeDefined();
      expect(result.recommendations[0].sources.length).toBeGreaterThan(0);
    });

    test('should return empty recommendations for unknown condition', () => {
      const clinicalScenario = {
        condition: 'unknown_condition',
        patientAge: 45
      };

      const result = service.getRecommendations(clinicalScenario);

      expect(result.recommendations.length).toBe(0);
      expect(result.message).toContain('No specific guidelines found');
    });

    test('should throw error when condition is missing', () => {
      const clinicalScenario = {
        patientAge: 45
      };

      expect(() => {
        service.getRecommendations(clinicalScenario);
      }).toThrow('Clinical condition is required');
    });

    test('should include patient context in recommendations', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 55,
        comorbidities: ['diabetes', 'ckd'],
        currentMedications: ['metformin', 'lisinopril']
      };

      const result = service.getRecommendations(clinicalScenario);

      expect(result.patientContext).toBeDefined();
      expect(result.patientContext.age).toBe(55);
      expect(result.patientContext.comorbidities).toEqual(expect.arrayContaining(['diabetes', 'ckd']));
      expect(result.patientContext.comorbidities.length).toBe(2);
      expect(result.patientContext.currentMedications).toBe(2);
    });
  });

  describe('Recommendation Ranking', () => {
    test('should rank recommendations by strength and evidence level', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 55
      };

      const result = service.getRecommendations(clinicalScenario);

      if (result.recommendations.length > 1) {
        const strengthOrder = { 'STRONG': 0, 'MODERATE': 1, 'WEAK': 2 };
        
        for (let i = 1; i < result.recommendations.length; i++) {
          const prevStrength = strengthOrder[result.recommendations[i-1].strength];
          const currStrength = strengthOrder[result.recommendations[i].strength];
          expect(prevStrength).toBeLessThanOrEqual(currStrength);
        }
      }
    });
  });

  describe('Contextualization', () => {
    test('should add pediatric notes for young patients', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 12
      };

      const result = service.getRecommendations(clinicalScenario);

      if (result.recommendations.length > 0) {
        const hasNote = result.recommendations.some(rec => 
          rec.clinicalNotes && rec.clinicalNotes.some(note => 
            note.includes('Pediatric')
          )
        );
        expect(hasNote).toBe(true);
      }
    });

    test('should add geriatric notes for elderly patients', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 75
      };

      const result = service.getRecommendations(clinicalScenario);

      if (result.recommendations.length > 0) {
        const hasNote = result.recommendations.some(rec => 
          rec.clinicalNotes && rec.clinicalNotes.some(note => 
            note.includes('Geriatric')
          )
        );
        expect(hasNote).toBe(true);
      }
    });

    test('should add comorbidity notes when present', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 55,
        comorbidities: ['diabetes', 'ckd']
      };

      const result = service.getRecommendations(clinicalScenario);

      if (result.recommendations.length > 0) {
        const hasNote = result.recommendations.some(rec => 
          rec.clinicalNotes && rec.clinicalNotes.some(note => 
            note.includes('comorbidities')
          )
        );
        expect(hasNote).toBe(true);
      }
    });
  });

  describe('Guideline Search', () => {
    test('should search guidelines by keyword', () => {
      const results = service.searchGuidelines('hypertension');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].guidelineId).toBeDefined();
      expect(results[0].title).toBeDefined();
    });

    test('should search guidelines by category', () => {
      const results = service.searchGuidelines('cardiovascular');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.category === 'cardiovascular')).toBe(true);
    });

    test('should return empty array for non-matching keyword', () => {
      const results = service.searchGuidelines('nonexistent');
      expect(results.length).toBe(0);
    });

    test('should be case-insensitive', () => {
      const results1 = service.searchGuidelines('HYPERTENSION');
      const results2 = service.searchGuidelines('hypertension');

      expect(results1.length).toBe(results2.length);
    });
  });

  describe('Category Filtering', () => {
    test('should get guidelines by category', () => {
      const results = service.getGuidelinesByCategory('cardiovascular');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.guidelineId)).toBe(true);
      expect(results.every(r => r.title)).toBe(true);
    });

    test('should return empty array for non-existent category', () => {
      const results = service.getGuidelinesByCategory('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('Evidence Sources', () => {
    test('should get PubMed source details', () => {
      const source = service.getEvidenceSource('PMID: 29146535');

      expect(source.sourceId).toBe('PMID: 29146535');
      expect(source.type).toBe('PubMed');
      expect(source.url).toContain('pubmed.ncbi.nlm.nih.gov');
      expect(source.citation).toBeDefined();
    });

    test('should get guideline source details', () => {
      const source = service.getEvidenceSource('ACC/AHA 2017');

      expect(source.sourceId).toBe('ACC/AHA 2017');
      expect(source.type).toBe('Clinical Guideline');
      expect(source.citation).toBeDefined();
    });
  });

  describe('Recommendation Validation', () => {
    test('should validate recommendation with warnings', () => {
      const recommendation = {
        id: 'test-r1',
        text: 'Test recommendation'
      };

      const patientData = {
        allergies: ['penicillin'],
        renalFunction: 25
      };

      const result = service.validateRecommendation(recommendation, patientData);

      expect(result.recommendationId).toBe('test-r1');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.disclaimer).toContain('For physician review only');
    });

    test('should check for renal function warnings', () => {
      const recommendation = {
        id: 'test-r1',
        text: 'Test recommendation'
      };

      const patientData = {
        renalFunction: 20
      };

      const result = service.validateRecommendation(recommendation, patientData);

      expect(result.warnings.some(w => w.includes('Renal'))).toBe(true);
    });

    test('should check for hepatic function warnings', () => {
      const recommendation = {
        id: 'test-r1',
        text: 'Test recommendation'
      };

      const patientData = {
        hepaticFunction: 'impaired'
      };

      const result = service.validateRecommendation(recommendation, patientData);

      expect(result.warnings.some(w => w.includes('Hepatic'))).toBe(true);
    });
  });

  describe('Caching', () => {
    test('should cache recommendation results', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 55,
        comorbidities: ['diabetes']
      };

      const result1 = service.getRecommendations(clinicalScenario);
      const result2 = service.getRecommendations(clinicalScenario);

      // Results should be identical (from cache)
      expect(result1).toBe(result2);
    });

    test('should clear cache', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 55
      };

      service.getRecommendations(clinicalScenario);
      
      const statsBefore = service.getStatistics();
      expect(statsBefore.cacheSize).toBeGreaterThan(0);

      service.clearCache();

      const statsAfter = service.getStatistics();
      expect(statsAfter.cacheSize).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should provide accurate statistics', () => {
      const stats = service.getStatistics();

      expect(stats.totalGuidelines).toBeGreaterThan(0);
      expect(stats.totalRecommendations).toBeGreaterThan(0);
      expect(stats.categoryCounts).toBeDefined();
      expect(typeof stats.cacheSize).toBe('number');
    });
  });

  describe('Medical Disclaimer', () => {
    test('should include disclaimer in all recommendation results', () => {
      const clinicalScenario = {
        condition: 'hypertension',
        patientAge: 55
      };

      const result = service.getRecommendations(clinicalScenario);

      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('For physician review only');
    });

    test('should include disclaimer in guideline details', () => {
      const guideline = service.getGuidelineDetails('cv-001');

      expect(guideline.disclaimer).toBeDefined();
      expect(guideline.disclaimer).toContain('For physician review only');
    });
  });
});
