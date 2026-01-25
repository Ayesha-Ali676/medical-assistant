/**
 * Unit Tests for Predictive Analytics Service
 * For physician review only
 */

const PredictiveAnalyticsService = require('../src/services/predictive-analytics-service');

describe('PredictiveAnalyticsService', () => {
  let service;

  beforeEach(() => {
    service = new PredictiveAnalyticsService();
  });

  describe('predictDeterioration', () => {
    test('should predict high deterioration risk for critical vital signs', async () => {
      const patientData = {
        id: 'patient-001',
        age: 78,
        vitals: {
          bp: '180/110',
          hr: '125',
          spo2: '88',
          temp: '102.5',
          rr: '28'
        },
        past_history: ['heart failure', 'copd'],
        lab_results: [
          { test_name: 'Lactate', value: 3.5, unit: 'mmol/L' }
        ]
      };

      const result = await service.predictDeterioration(patientData, []);

      expect(result).toBeDefined();
      expect(result.patientId).toBe('patient-001');
      expect(result.deteriorationRisk.score).toBeGreaterThan(60);
      expect(result.deteriorationRisk.level).toMatch(/High|Critical/);
      expect(result.predictionWindow.hours).toBeLessThanOrEqual(6);
      expect(result.predictionWindow.hours).toBeGreaterThanOrEqual(2);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should predict low deterioration risk for stable patient', async () => {
      const patientData = {
        id: 'patient-002',
        age: 45,
        vitals: {
          bp: '120/80',
          hr: '75',
          spo2: '98',
          temp: '98.6',
          rr: '16'
        },
        past_history: [],
        lab_results: []
      };

      const result = await service.predictDeterioration(patientData, []);

      expect(result).toBeDefined();
      expect(result.deteriorationRisk.score).toBeLessThan(40);
      expect(result.deteriorationRisk.level).toBe('Low');
      expect(result.predictionWindow.hours).toBe(6);
    });

    test('should include confidence intervals in predictions', async () => {
      const patientData = {
        id: 'patient-003',
        age: 65,
        vitals: { bp: '140/90', hr: '85', spo2: '95' }
      };

      const historicalData = Array(10).fill({}).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        vitals: { bp: '135/85', hr: '82', spo2: '96' }
      }));

      const result = await service.predictDeterioration(patientData, historicalData);

      expect(result.deteriorationRisk.confidenceInterval).toBeDefined();
      expect(result.deteriorationRisk.confidenceInterval.lower).toBeLessThanOrEqual(result.deteriorationRisk.score);
      expect(result.deteriorationRisk.confidenceInterval.upper).toBeGreaterThanOrEqual(result.deteriorationRisk.score);
      expect(result.deteriorationRisk.confidenceInterval.confidence).toBeGreaterThan(0);
    });

    test('should generate appropriate recommendations for respiratory issues', async () => {
      const patientData = {
        id: 'patient-004',
        age: 70,
        vitals: {
          spo2: '89',
          rr: '26'
        },
        past_history: ['asthma']
      };

      const result = await service.predictDeterioration(patientData, []);

      const hasRespiratoryRecommendation = result.recommendations.some(rec => 
        rec.toLowerCase().includes('respiratory')
      );
      expect(hasRespiratoryRecommendation).toBe(true);
    });

    test('should handle missing vital signs gracefully', async () => {
      const patientData = {
        id: 'patient-005',
        age: 55,
        vitals: {},
        past_history: []
      };

      const result = await service.predictDeterioration(patientData, []);

      expect(result).toBeDefined();
      expect(result.deteriorationRisk.score).toBeGreaterThanOrEqual(0);
      expect(result.disclaimer).toBe('For physician review only');
    });
  });

  describe('analyzePopulationHealth', () => {
    test('should analyze patient cohort demographics', async () => {
      const patientCohort = [
        { id: 'p1', age: 25, gender: 'male', past_history: ['diabetes'] },
        { id: 'p2', age: 45, gender: 'female', past_history: ['hypertension'] },
        { id: 'p3', age: 70, gender: 'male', past_history: ['diabetes', 'heart failure'] },
        { id: 'p4', age: 80, gender: 'female', past_history: ['copd'] }
      ];

      const result = await service.analyzePopulationHealth(patientCohort);

      expect(result).toBeDefined();
      expect(result.cohortSize).toBe(4);
      expect(result.cohortAnalysis.demographics).toBeDefined();
      expect(result.cohortAnalysis.demographics.ageGroups).toBeDefined();
      expect(result.cohortAnalysis.demographics.genderDistribution).toBeDefined();
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should identify common conditions in cohort', async () => {
      const patientCohort = [
        { id: 'p1', age: 65, past_history: ['diabetes', 'hypertension'] },
        { id: 'p2', age: 70, past_history: ['diabetes', 'heart failure'] },
        { id: 'p3', age: 75, past_history: ['diabetes', 'copd'] },
        { id: 'p4', age: 68, past_history: ['hypertension'] }
      ];

      const result = await service.analyzePopulationHealth(patientCohort);

      expect(result.cohortAnalysis.conditions.topConditions).toBeDefined();
      expect(result.cohortAnalysis.conditions.topConditions.length).toBeGreaterThan(0);
      expect(result.cohortAnalysis.conditions.topConditions[0].condition).toBe('diabetes');
    });

    test('should identify population trends', async () => {
      const patientCohort = Array(20).fill({}).map((_, i) => ({
        id: `p${i}`,
        age: 70 + i,
        gender: i % 2 === 0 ? 'male' : 'female',
        past_history: ['diabetes', 'hypertension']
      }));

      const result = await service.analyzePopulationHealth(patientCohort);

      expect(result.trends).toBeDefined();
      expect(result.trends.length).toBeGreaterThan(0);
      expect(result.trends.some(t => t.type === 'demographic')).toBe(true);
    });

    test('should stratify risk across population', async () => {
      const patientCohort = [
        { id: 'p1', age: 30, vitals: { bp: '120/80', spo2: '98' }, past_history: [] },
        { id: 'p2', age: 75, vitals: { bp: '170/100', spo2: '90' }, past_history: ['heart failure', 'copd'] },
        { id: 'p3', age: 50, vitals: { bp: '130/85', spo2: '96' }, past_history: ['diabetes'] }
      ];

      const result = await service.analyzePopulationHealth(patientCohort);

      expect(result.riskStratification).toBeDefined();
      expect(result.riskStratification.distribution).toBeDefined();
      expect(result.riskStratification.percentages).toBeDefined();
      expect(result.riskStratification.highRiskCount).toBeGreaterThanOrEqual(0);
    });

    test('should predict population outcomes', async () => {
      const patientCohort = Array(15).fill({}).map((_, i) => ({
        id: `p${i}`,
        age: 60 + i * 2,
        vitals: { bp: '140/90', spo2: '94' },
        past_history: i % 2 === 0 ? ['diabetes'] : ['hypertension']
      }));

      const result = await service.analyzePopulationHealth(patientCohort);

      expect(result.outcomePredictions).toBeDefined();
      expect(result.outcomePredictions.predictedReadmissionRate).toBeDefined();
      expect(result.outcomePredictions.predictedComplicationRate).toBeDefined();
      expect(result.outcomePredictions.confidence).toBeGreaterThan(0);
    });
  });

  describe('analyzeTrends', () => {
    test('should analyze vital sign trends over time', async () => {
      const patientData = { id: 'patient-001', age: 65 };
      const timeSeriesData = [
        { vitalType: 'blood_pressure', value: 120, timestamp: '2024-01-01T08:00:00Z' },
        { vitalType: 'blood_pressure', value: 125, timestamp: '2024-01-01T12:00:00Z' },
        { vitalType: 'blood_pressure', value: 130, timestamp: '2024-01-01T16:00:00Z' },
        { vitalType: 'blood_pressure', value: 135, timestamp: '2024-01-01T20:00:00Z' }
      ];

      const result = await service.analyzeTrends(patientData, timeSeriesData);

      expect(result).toBeDefined();
      expect(result.vitalTrends).toBeDefined();
      expect(result.vitalTrends.length).toBeGreaterThan(0);
      expect(result.vitalTrends[0].direction).toBe('increasing');
      expect(result.disclaimer).toBe('For physician review only');
    });

    test('should detect anomalies in vital signs', async () => {
      const patientData = { id: 'patient-002', age: 55 };
      const timeSeriesData = [
        { vitalType: 'heart_rate', value: 75, timestamp: '2024-01-01T08:00:00Z' },
        { vitalType: 'heart_rate', value: 76, timestamp: '2024-01-01T09:00:00Z' },
        { vitalType: 'heart_rate', value: 77, timestamp: '2024-01-01T10:00:00Z' },
        { vitalType: 'heart_rate', value: 180, timestamp: '2024-01-01T11:00:00Z' }, // Anomaly
        { vitalType: 'heart_rate', value: 75, timestamp: '2024-01-01T12:00:00Z' },
        { vitalType: 'heart_rate', value: 76, timestamp: '2024-01-01T13:00:00Z' }
      ];

      const result = await service.analyzeTrends(patientData, timeSeriesData);

      expect(result.anomalies).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.anomalies[0].severity).toBeDefined();
    });

    test('should predict future trends', async () => {
      const patientData = { id: 'patient-003', age: 60 };
      const timeSeriesData = [
        { vitalType: 'oxygen_saturation', value: 98, timestamp: '2024-01-01T08:00:00Z' },
        { vitalType: 'oxygen_saturation', value: 96, timestamp: '2024-01-01T10:00:00Z' },
        { vitalType: 'oxygen_saturation', value: 94, timestamp: '2024-01-01T12:00:00Z' },
        { vitalType: 'oxygen_saturation', value: 92, timestamp: '2024-01-01T14:00:00Z' }
      ];

      const result = await service.analyzeTrends(patientData, timeSeriesData);

      expect(result.predictions).toBeDefined();
      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.predictions[0].predictedValue).toBeDefined();
      expect(result.predictions[0].confidence).toBeGreaterThan(0);
    });

    test('should calculate trend significance', async () => {
      const patientData = { id: 'patient-004', age: 70 };
      const timeSeriesData = [
        { vitalType: 'oxygen_saturation', value: 98, timestamp: '2024-01-01T08:00:00Z' },
        { vitalType: 'oxygen_saturation', value: 95, timestamp: '2024-01-01T10:00:00Z' },
        { vitalType: 'oxygen_saturation', value: 92, timestamp: '2024-01-01T12:00:00Z' },
        { vitalType: 'oxygen_saturation', value: 89, timestamp: '2024-01-01T14:00:00Z' }
      ];

      const result = await service.analyzeTrends(patientData, timeSeriesData);

      expect(result.significance).toBeDefined();
      expect(result.significance.length).toBeGreaterThan(0);
      expect(result.significance[0].significanceLevel).toBeDefined();
      expect(result.significance[0].clinicalImportance).toBeDefined();
    });

    test('should handle insufficient data points gracefully', async () => {
      const patientData = { id: 'patient-005', age: 50 };
      const timeSeriesData = [
        { vitalType: 'temperature', value: 98.6, timestamp: '2024-01-01T08:00:00Z' }
      ];

      const result = await service.analyzeTrends(patientData, timeSeriesData);

      expect(result).toBeDefined();
      expect(result.vitalTrends).toBeDefined();
      expect(result.disclaimer).toBe('For physician review only');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty patient data', async () => {
      const patientData = { id: 'patient-empty' };

      const result = await service.predictDeterioration(patientData, []);

      expect(result).toBeDefined();
      expect(result.deteriorationRisk.score).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty cohort gracefully', async () => {
      const result = await service.analyzePopulationHealth([]);

      expect(result).toBeDefined();
      expect(result.cohortSize).toBe(0);
    });

    test('should handle empty time series data', async () => {
      const patientData = { id: 'patient-001' };
      const result = await service.analyzeTrends(patientData, []);

      expect(result).toBeDefined();
      expect(result.vitalTrends).toBeDefined();
    });
  });

  describe('Disclaimer Compliance', () => {
    test('all outputs should include physician review disclaimer', async () => {
      const patientData = { id: 'patient-001', age: 65, vitals: { bp: '120/80' } };
      
      const deteriorationResult = await service.predictDeterioration(patientData, []);
      expect(deteriorationResult.disclaimer).toBe('For physician review only');

      const populationResult = await service.analyzePopulationHealth([patientData]);
      expect(populationResult.disclaimer).toBe('For physician review only');

      const trendResult = await service.analyzeTrends(patientData, []);
      expect(trendResult.disclaimer).toBe('For physician review only');
    });
  });
});
