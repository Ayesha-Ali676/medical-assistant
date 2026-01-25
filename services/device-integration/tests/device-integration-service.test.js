/**
 * Device Integration Service Tests
 * For physician review only
 */

const DeviceIntegrationService = require('../src/services/device-integration-service');

describe('Device Integration Service', () => {
  let service;

  beforeEach(() => {
    service = new DeviceIntegrationService();
  });

  describe('Device Registration', () => {
    test('should register a device successfully', async () => {
      const config = {
        deviceType: 'vital_signs_monitor',
        manufacturer: 'Philips',
        model: 'IntelliVue MX800',
        serialNumber: 'SN123456',
        patientId: 'patient-123',
        protocol: 'websocket',
        connectionConfig: {
          url: 'ws://device.example.com',
          apiKey: 'test-api-key'
        },
        capabilities: ['heart_rate', 'blood_pressure', 'spo2']
      };

      const result = await service.registerDevice(config);

      expect(result).toHaveProperty('deviceId');
      expect(result.status).toBe('registered');
      expect(result.message).toBe('Device successfully registered');
    });

    test('should fail registration with missing required fields', async () => {
      const config = {
        deviceType: 'vital_signs_monitor',
        manufacturer: 'Philips'
        // Missing required fields
      };

      await expect(service.registerDevice(config)).rejects.toThrow();
    });

    test('should fail registration with invalid protocol', async () => {
      const config = {
        deviceType: 'vital_signs_monitor',
        manufacturer: 'Philips',
        model: 'IntelliVue MX800',
        serialNumber: 'SN123456',
        patientId: 'patient-123',
        protocol: 'invalid-protocol',
        connectionConfig: {}
      };

      await expect(service.registerDevice(config)).rejects.toThrow('Invalid protocol');
    });
  });

  describe('Manual Reading Processing', () => {
    test('should process valid manual reading', async () => {
      const reading = {
        patientId: 'patient-123',
        deviceType: 'blood_pressure',
        systolic: 120,
        diastolic: 80,
        heartRate: 72,
        timestamp: new Date().toISOString()
      };

      const result = await service.processManualReading(reading);

      expect(result).toHaveProperty('patientId', 'patient-123');
      expect(result).toHaveProperty('readings');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('alerts');
      expect(result.source).toBe('manual');
    });

    test('should reject invalid manual reading', async () => {
      const reading = {
        patientId: 'patient-123',
        deviceType: 'blood_pressure',
        systolic: 300, // Invalid value
        diastolic: 80
      };

      await expect(service.processManualReading(reading)).rejects.toThrow();
    });
  });

  describe('Device Management', () => {
    test('should get all devices', () => {
      const devices = service.getAllDevices();
      expect(Array.isArray(devices)).toBe(true);
    });

    test('should filter devices by patient ID', async () => {
      // Register two devices for different patients
      await service.registerDevice({
        deviceType: 'heart_rate_monitor',
        manufacturer: 'Garmin',
        model: 'HRM-Pro',
        serialNumber: 'SN111',
        patientId: 'patient-1',
        protocol: 'http',
        connectionConfig: { url: 'http://device1.example.com' }
      });

      await service.registerDevice({
        deviceType: 'heart_rate_monitor',
        manufacturer: 'Garmin',
        model: 'HRM-Pro',
        serialNumber: 'SN222',
        patientId: 'patient-2',
        protocol: 'http',
        connectionConfig: { url: 'http://device2.example.com' }
      });

      const devices = service.getAllDevices({ patientId: 'patient-1' });
      expect(devices.length).toBe(1);
      expect(devices[0].patientId).toBe('patient-1');
    });

    test('should remove device successfully', async () => {
      const { deviceId } = await service.registerDevice({
        deviceType: 'thermometer',
        manufacturer: 'Braun',
        model: 'ThermoScan',
        serialNumber: 'SN333',
        patientId: 'patient-3',
        protocol: 'http',
        connectionConfig: { url: 'http://device3.example.com' }
      });

      const result = await service.removeDevice(deviceId);
      expect(result.status).toBe('removed');
      expect(result.deviceId).toBe(deviceId);

      const status = service.getDeviceStatus(deviceId);
      expect(status).toBeNull();
    });
  });

  describe('Vital Signs History', () => {
    test('should return empty history for new device', async () => {
      const { deviceId } = await service.registerDevice({
        deviceType: 'pulse_oximeter',
        manufacturer: 'Masimo',
        model: 'Rad-97',
        serialNumber: 'SN444',
        patientId: 'patient-4',
        protocol: 'http',
        connectionConfig: { url: 'http://device4.example.com' }
      });

      const history = service.getVitalsHistory(deviceId);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    test('should return null for latest vitals when no data', async () => {
      const { deviceId } = await service.registerDevice({
        deviceType: 'pulse_oximeter',
        manufacturer: 'Masimo',
        model: 'Rad-97',
        serialNumber: 'SN555',
        patientId: 'patient-5',
        protocol: 'http',
        connectionConfig: { url: 'http://device5.example.com' }
      });

      const latest = service.getLatestVitals(deviceId);
      expect(latest).toBeNull();
    });
  });

  describe('Device Status', () => {
    test('should get device status', async () => {
      const { deviceId } = await service.registerDevice({
        deviceType: 'vital_signs_monitor',
        manufacturer: 'GE Healthcare',
        model: 'CARESCAPE B850',
        serialNumber: 'SN666',
        patientId: 'patient-6',
        protocol: 'http',
        connectionConfig: { url: 'http://device6.example.com' }
      });

      const status = service.getDeviceStatus(deviceId);
      expect(status).not.toBeNull();
      expect(status.deviceId).toBe(deviceId);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('connectionQuality');
      expect(status).toHaveProperty('batteryLevel');
    });

    test('should return null for non-existent device', () => {
      const status = service.getDeviceStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });
});
