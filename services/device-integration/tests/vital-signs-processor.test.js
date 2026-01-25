/**
 * Vital Signs Processor Tests
 * For physician review only
 */

const VitalSignsProcessor = require('../src/services/vital-signs-processor');

describe('Vital Signs Processor', () => {
  let processor;

  beforeEach(() => {
    processor = new VitalSignsProcessor();
  });

  describe('Process Vital Signs', () => {
    test('should process normal vital signs without alerts', async () => {
      const rawData = {
        heartRate: 75,
        systolic: 120,
        diastolic: 80,
        spo2: 98,
        temperature: 36.8,
        respiratoryRate: 16
      };

      const result = await processor.process(rawData, 'vital_signs_monitor');

      expect(result).toHaveProperty('readings');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('alerts');
      expect(result.alerts.length).toBe(0);
    });

    test('should generate critical alert for low heart rate', async () => {
      const rawData = {
        heartRate: 35 // Critical bradycardia
      };

      const result = await processor.process(rawData, 'heart_rate_monitor');

      expect(result.alerts.length).toBeGreaterThan(0);
      const hrAlert = result.alerts.find(a => a.type === 'heart_rate');
      expect(hrAlert).toBeDefined();
      expect(hrAlert.severity).toBe('CRITICAL');
    });

    test('should generate critical alert for high heart rate', async () => {
      const rawData = {
        heartRate: 160 // Critical tachycardia
      };

      const result = await processor.process(rawData, 'heart_rate_monitor');

      expect(result.alerts.length).toBeGreaterThan(0);
      const hrAlert = result.alerts.find(a => a.type === 'heart_rate');
      expect(hrAlert).toBeDefined();
      expect(hrAlert.severity).toBe('CRITICAL');
    });

    test('should generate alert for low blood pressure', async () => {
      const rawData = {
        systolic: 85,
        diastolic: 55
      };

      const result = await processor.process(rawData, 'blood_pressure');

      expect(result.alerts.length).toBeGreaterThan(0);
      const bpAlert = result.alerts.find(a => a.type === 'blood_pressure');
      expect(bpAlert).toBeDefined();
    });

    test('should generate alert for high blood pressure', async () => {
      const rawData = {
        systolic: 160,
        diastolic: 100
      };

      const result = await processor.process(rawData, 'blood_pressure');

      expect(result.alerts.length).toBeGreaterThan(0);
      const bpAlert = result.alerts.find(a => a.type === 'blood_pressure');
      expect(bpAlert).toBeDefined();
    });

    test('should generate critical alert for low SpO2', async () => {
      const rawData = {
        spo2: 85,
        heartRate: 75
      };

      const result = await processor.process(rawData, 'pulse_oximeter');

      expect(result.alerts.length).toBeGreaterThan(0);
      const spo2Alert = result.alerts.find(a => a.type === 'spo2');
      expect(spo2Alert).toBeDefined();
      expect(spo2Alert.severity).toBe('CRITICAL');
    });

    test('should generate alert for high temperature', async () => {
      const rawData = {
        temperature: 38.5
      };

      const result = await processor.process(rawData, 'thermometer');

      expect(result.alerts.length).toBeGreaterThan(0);
      const tempAlert = result.alerts.find(a => a.type === 'temperature');
      expect(tempAlert).toBeDefined();
    });

    test('should generate alert for abnormal respiratory rate', async () => {
      const rawData = {
        respiratoryRate: 25
      };

      const result = await processor.process(rawData, 'respiratory_monitor');

      expect(result.alerts.length).toBeGreaterThan(0);
      const rrAlert = result.alerts.find(a => a.type === 'respiratory_rate');
      expect(rrAlert).toBeDefined();
    });
  });

  describe('Extract Readings', () => {
    test('should extract readings from vital signs monitor', () => {
      const rawData = {
        hr: 75,
        sbp: 120,
        dbp: 80,
        oxygenSaturation: 98,
        temp: 36.8,
        rr: 16
      };

      const readings = processor.extractReadings(rawData, 'vital_signs_monitor');

      expect(readings.heartRate).toBe(75);
      expect(readings.bloodPressure.systolic).toBe(120);
      expect(readings.bloodPressure.diastolic).toBe(80);
      expect(readings.spo2).toBe(98);
      expect(readings.temperature).toBe(36.8);
      expect(readings.respiratoryRate).toBe(16);
    });

    test('should handle alternative field names', () => {
      const rawData = {
        pulse: 72,
        bloodPressure: {
          systolic: 118,
          diastolic: 78
        }
      };

      const readings = processor.extractReadings(rawData, 'vital_signs_monitor');

      expect(readings.heartRate).toBe(72);
      expect(readings.bloodPressure.systolic).toBe(118);
      expect(readings.bloodPressure.diastolic).toBe(78);
    });
  });

  describe('Assess Quality', () => {
    test('should assess high quality for complete data', () => {
      const rawData = {
        heartRate: 75,
        systolic: 120,
        diastolic: 80,
        spo2: 98,
        temperature: 36.8,
        signalQuality: 95
      };

      const readings = {
        heartRate: 75,
        bloodPressure: { systolic: 120, diastolic: 80 },
        spo2: 98,
        temperature: 36.8
      };

      const quality = processor.assessQuality(rawData, readings);

      expect(quality.signalQuality).toBe(95);
      expect(quality.confidence).toBeGreaterThan(0.8);
    });

    test('should reduce quality for missing readings', () => {
      const rawData = {
        heartRate: 75
      };

      const readings = {
        heartRate: 75
      };

      const quality = processor.assessQuality(rawData, readings);

      expect(quality.confidence).toBeLessThan(1.0);
      expect(quality.issues.length).toBeGreaterThan(0);
    });

    test('should reduce quality for out-of-range values', () => {
      const rawData = {
        heartRate: 300 // Implausible value
      };

      const readings = {
        heartRate: 300
      };

      const quality = processor.assessQuality(rawData, readings);

      expect(quality.confidence).toBeLessThan(1.0);
      expect(quality.signalQuality).toBeLessThan(100);
      expect(quality.issues.length).toBeGreaterThan(0);
    });
  });
});
