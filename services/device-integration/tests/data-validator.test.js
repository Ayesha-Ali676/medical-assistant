/**
 * Data Validator Tests
 * For physician review only
 */

const DataValidator = require('../src/services/data-validator');

describe('Data Validator', () => {
  let validator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  describe('Validate Vital Signs Monitor', () => {
    test('should validate correct vital signs data', () => {
      const data = {
        heartRate: 75,
        systolic: 120,
        diastolic: 80,
        spo2: 98,
        temperature: 36.8,
        respiratoryRate: 16,
        timestamp: new Date().toISOString()
      };

      const result = validator.validate(data, 'vital_signs_monitor');

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should reject out-of-range heart rate', () => {
      const data = {
        heartRate: 300 // Out of range
      };

      const result = validator.validate(data, 'vital_signs_monitor');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject invalid blood pressure', () => {
      const data = {
        systolic: 300,
        diastolic: 200
      };

      const result = validator.validate(data, 'vital_signs_monitor');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject out-of-range SpO2', () => {
      const data = {
        spo2: 150 // Out of range
      };

      const result = validator.validate(data, 'vital_signs_monitor');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});