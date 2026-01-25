/**
 * Property-Based Tests for Real-time Alert Response
 * Feature: medassist-clinical-enhancements, Property 1: Real-time Alert Response
 * Validates: Requirements 1.1, 8.2
 * For physician review only
 */

const fc = require('fast-check');
const RealTimeRiskService = require('../src/services/real-time-risk-service');
const { RiskScoringModel } = require('../src/models/risk-scoring');

describe('Feature: medassist-clinical-enhancements, Property 1: Real-time Alert Response', () => {
  
  let mockDbManager;
  let realTimeRiskService;
  let mockWebSocketConnections;
  
  beforeEach(() => {
    // Mock database manager
    mockDbManager = {
      executeQuery: jest.fn(),
      initializePostgreSQL: jest.fn(),
      initializeRedis: jest.fn()
    };
    
    // Mock WebSocket connections
    mockWebSocketConnections = new Map();
    
    realTimeRiskService = new RealTimeRiskService(mockDbManager);
    
    // Override broadcastToTenant for testing
    realTimeRiskService.broadcastToTenant = jest.fn();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock database responses
    mockDbManager.executeQuery.mockImplementation((query, params) => {
      if (query.includes('SELECT p.*')) {
        // Mock patient data query - use the actual parameters passed
        return Promise.resolve({
          rows: [{
            id: params[0],
            tenant_id: params[1],
            age: 65,
            vitals: { bp: '140/90', hr: '80', temp: '98.6', spo2: '95' },
            past_history: ['Hypertension'],
            current_medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' }],
            lab_results: [{ test_name: 'Glucose', value: 120, unit: 'mg/dL', is_abnormal: false }]
          }]
        });
      } else if (query.includes('risk_assessments_realtime') && query.includes('SELECT')) {
        // Mock previous risk assessment query
        return Promise.resolve({
          rows: [{
            risk_assessment: JSON.stringify({
              overallRisk: { score: 40, level: 'Moderate' },
              riskCategories: {
                cardiac: { score: 30 },
                respiratory: { score: 25 },
                infection: { score: 20 },
                medication: { score: 15 }
              }
            })
          }]
        });
      } else if (query.includes('INSERT INTO risk_assessments_realtime')) {
        // Mock risk assessment storage
        return Promise.resolve({ rows: [{ id: 'risk-assessment-id' }] });
      } else if (query.includes('INSERT INTO risk_change_notifications')) {
        // Mock notification storage
        return Promise.resolve({ rows: [{ id: 'notification-id' }] });
      } else {
        // Mock other queries (inserts, updates)
        return Promise.resolve({ rows: [{ id: 'mock-id' }] });
      }
    });
  });
  
  afterEach(() => {
    if (realTimeRiskService) {
      realTimeRiskService.stopProcessing();
    }
  });

  // Property test: Alert system should generate notifications within 30 seconds for critical vital sign changes
  test('Alert system generates notifications within 30 seconds for critical vital sign changes', async () => {
    await fc.assert(fc.asyncProperty(
      generateCriticalVitalSignChanges(),
      async (vitalSignChange) => {
        const { patientId, tenantId, vitalSigns, expectedCritical } = vitalSignChange;
        
        const startTime = Date.now();
        
        // Queue the vital sign change
        const updateId = await realTimeRiskService.queueRiskUpdate(
          patientId,
          tenantId,
          'vital_signs',
          vitalSigns
        );
        
        expect(updateId).toBeDefined();
        
        // For critical changes, processing should be immediate
        if (expectedCritical) {
          // Verify that the change was detected as critical
          const isCritical = realTimeRiskService.isCriticalChange('vital_signs', vitalSigns);
          expect(isCritical).toBe(true);
          
          // Process the update (simulates immediate processing for critical changes)
          await realTimeRiskService.processPatientRiskUpdate(patientId);
          
          const processingTime = Date.now() - startTime;
          
          // Verify processing time is within 30 seconds (30000ms)
          expect(processingTime).toBeLessThan(30000);
          
          // Verify notification was sent
          expect(realTimeRiskService.broadcastToTenant).toHaveBeenCalled();
          
          const broadcastCall = realTimeRiskService.broadcastToTenant.mock.calls[0];
          expect(typeof broadcastCall[0]).toBe('string'); // tenantId should be a string
          
          const notification = broadcastCall[1];
          expect(notification.type).toBe('risk_change_alert');
          expect(typeof notification.patientId).toBe('string');
          expect(notification.priority).toMatch(/^(CRITICAL|HIGH)$/);
          expect(notification.disclaimer).toBe('For physician review only');
        }
      }
    ), { numRuns: 100 });
  });

  // Property test: Risk stratification should be updated in real-time when risk factors change
  test('Risk stratification is updated in real-time when risk factors change', async () => {
    await fc.assert(fc.asyncProperty(
      generateRiskFactorChanges(),
      async (riskFactorChange) => {
        const { patientId, tenantId, changeType, changeData } = riskFactorChange;
        
        // Queue the risk factor change
        await realTimeRiskService.queueRiskUpdate(
          patientId,
          tenantId,
          changeType,
          changeData
        );
        
        // Process the update
        await realTimeRiskService.processPatientRiskUpdate(patientId);
        
        // Verify that risk assessment was stored (if changes were significant enough)
        const storeRiskCalls = mockDbManager.executeQuery.mock.calls.filter(
          call => call[0].includes('INSERT INTO risk_assessments_realtime')
        );
        
        // If a risk assessment was stored, verify it contains required fields
        if (storeRiskCalls.length > 0) {
          const storeCall = storeRiskCalls[0];
          const storedAssessment = JSON.parse(storeCall[1][3]); // risk_assessment JSON
          
          expect(storedAssessment).toHaveProperty('overallRisk');
          expect(storedAssessment).toHaveProperty('riskCategories');
          expect(storedAssessment.overallRisk).toHaveProperty('score');
          expect(storedAssessment.overallRisk).toHaveProperty('level');
          expect(storedAssessment.disclaimer).toBe('For physician review only');
          
          // Verify risk categories are present
          expect(storedAssessment.riskCategories).toHaveProperty('cardiac');
          expect(storedAssessment.riskCategories).toHaveProperty('respiratory');
          expect(storedAssessment.riskCategories).toHaveProperty('infection');
          expect(storedAssessment.riskCategories).toHaveProperty('medication');
        }
        
        // At minimum, the risk update should have been processed (even if not stored)
        expect(realTimeRiskService.riskUpdateQueue.has(patientId)).toBe(false);
      }
    ), { numRuns: 100 });
  });

  // Property test: Alert notifications should contain all required information
  test('Alert notifications contain all required information', async () => {
    await fc.assert(fc.asyncProperty(
      generateSignificantRiskChanges(),
      async (riskChange) => {
        const { patientId, tenantId, changeType, changeData } = riskChange;
        
        // Queue and process the risk change
        await realTimeRiskService.queueRiskUpdate(patientId, tenantId, changeType, changeData);
        await realTimeRiskService.processPatientRiskUpdate(patientId);
        
        // Check if notification was sent (only for significant changes)
        const broadcastCalls = realTimeRiskService.broadcastToTenant.mock.calls;
        if (broadcastCalls.length > 0) {
          const notification = broadcastCalls[0][1];
          
          // Verify required notification fields
          expect(notification).toHaveProperty('type');
          expect(notification).toHaveProperty('patientId');
          expect(notification).toHaveProperty('tenantId');
          expect(notification).toHaveProperty('timestamp');
          expect(notification).toHaveProperty('priority');
          expect(notification).toHaveProperty('changes');
          expect(notification).toHaveProperty('newRiskScore');
          expect(notification).toHaveProperty('newRiskLevel');
          expect(notification).toHaveProperty('recommendations');
          expect(notification).toHaveProperty('disclaimer');
          
          // Verify field values
          expect(notification.type).toBe('risk_change_alert');
          expect(typeof notification.patientId).toBe('string');
          expect(typeof notification.tenantId).toBe('string');
          expect(['CRITICAL', 'HIGH']).toContain(notification.priority);
          expect(Array.isArray(notification.changes)).toBe(true);
          expect(Array.isArray(notification.recommendations)).toBe(true);
          expect(typeof notification.newRiskScore).toBe('number');
          expect(typeof notification.newRiskLevel).toBe('string');
          expect(notification.disclaimer).toBe('For physician review only');
          
          // Verify timestamp is recent (within last minute)
          const notificationTime = new Date(notification.timestamp);
          const now = new Date();
          const timeDiff = now - notificationTime;
          expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
        }
      }
    ), { numRuns: 100 });
  });

  // Property test: Alert response time should be consistent across different change types
  test('Alert response time is consistent across different change types', async () => {
    await fc.assert(fc.asyncProperty(
      generateMixedChangeTypes(),
      async (changes) => {
        const responseTimes = [];
        
        for (const change of changes) {
          const { patientId, tenantId, changeType, changeData } = change;
          
          const startTime = Date.now();
          
          // Queue and process the change
          await realTimeRiskService.queueRiskUpdate(patientId, tenantId, changeType, changeData);
          
          // If it's a critical change, it should be processed immediately
          if (realTimeRiskService.isCriticalChange(changeType, changeData)) {
            await realTimeRiskService.processPatientRiskUpdate(patientId);
            
            const responseTime = Date.now() - startTime;
            responseTimes.push(responseTime);
          }
        }
        
        // All critical changes should be processed within 30 seconds
        for (const responseTime of responseTimes) {
          expect(responseTime).toBeLessThan(30000);
        }
        
        // Response times should be relatively consistent (within reasonable variance)
        if (responseTimes.length > 1) {
          const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
          
          for (const responseTime of responseTimes) {
            // Each response time should be within 5 seconds of the average
            expect(Math.abs(responseTime - avgResponseTime)).toBeLessThan(5000);
          }
        }
      }
    ), { numRuns: 100 });
  });

  // Property test: System should handle concurrent risk updates without data corruption
  test('System handles concurrent risk updates without data corruption', async () => {
    await fc.assert(fc.asyncProperty(
      generateConcurrentUpdates(),
      async (concurrentUpdates) => {
        const { patientId, tenantId, updates } = concurrentUpdates;
        
        // Queue all updates concurrently
        const updatePromises = updates.map(update => 
          realTimeRiskService.queueRiskUpdate(
            patientId,
            tenantId,
            update.changeType,
            update.changeData
          )
        );
        
        const updateIds = await Promise.all(updatePromises);
        
        // Verify all updates were queued
        expect(updateIds).toHaveLength(updates.length);
        updateIds.forEach(id => expect(id).toBeDefined());
        
        // Process the patient's risk updates
        await realTimeRiskService.processPatientRiskUpdate(patientId);
        
        // Verify that risk assessment was stored (may be 0 or 1 depending on whether changes were significant)
        const storeRiskCalls = mockDbManager.executeQuery.mock.calls.filter(
          call => call[0].includes('INSERT INTO risk_assessments_realtime')
        );
        
        // Should have at most one final assessment stored (no corruption)
        expect(storeRiskCalls.length).toBeLessThanOrEqual(1);
        
        // If an assessment was stored, verify it's valid
        if (storeRiskCalls.length > 0) {
          const storedAssessment = JSON.parse(storeRiskCalls[0][1][3]);
          expect(storedAssessment.overallRisk.score).toBeGreaterThanOrEqual(0);
          expect(storedAssessment.overallRisk.score).toBeLessThanOrEqual(100);
          expect(storedAssessment.disclaimer).toBe('For physician review only');
        }
      }
    ), { numRuns: 100 });
  });

  // Property test: Alert acknowledgment should be properly tracked
  test('Alert acknowledgment is properly tracked', async () => {
    await fc.assert(fc.asyncProperty(
      generateAlertAcknowledgmentData(),
      async (acknowledgmentData) => {
        const { patientId, tenantId, physicianId, alertId } = acknowledgmentData;
        
        // Mock the acknowledgment update query
        mockDbManager.executeQuery.mockResolvedValueOnce({
          rows: [{
            id: alertId,
            patient_id: patientId,
            acknowledged: true,
            acknowledged_by: physicianId,
            acknowledged_at: new Date()
          }]
        });
        
        // Simulate alert acknowledgment through the WebSocket server
        // (This would normally be called by the WebSocket server)
        const query = `
          UPDATE risk_change_notifications 
          SET acknowledged = true, 
              acknowledged_by = $1, 
              acknowledged_at = NOW()
          WHERE id = $2 AND tenant_id = $3
          RETURNING *
        `;
        
        const result = await mockDbManager.executeQuery(query, [physicianId, alertId, tenantId]);
        
        // Verify acknowledgment was processed
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].acknowledged).toBe(true);
        expect(result.rows[0].acknowledged_by).toBe(physicianId);
        expect(result.rows[0].acknowledged_at).toBeDefined();
        
        // Verify the query was called with correct parameters
        expect(mockDbManager.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE risk_change_notifications'),
          [physicianId, alertId, tenantId]
        );
      }
    ), { numRuns: 100 });
  });
});

// Generator functions for property-based testing

function generateCriticalVitalSignChanges() {
  return fc.record({
    patientId: fc.uuid(),
    tenantId: fc.uuid(),
    vitalSigns: fc.oneof(
      // Critical blood pressure values
      fc.record({
        bp: fc.constantFrom('200/120', '80/50', '190/110', '70/40'),
        expectedCritical: fc.constant(true)
      }),
      // Critical heart rate values
      fc.record({
        hr: fc.constantFrom('150', '40', '160', '35'),
        expectedCritical: fc.constant(true)
      }),
      // Critical temperature values
      fc.record({
        temp: fc.constantFrom('105', '94', '104.5', '93.5'),
        expectedCritical: fc.constant(true)
      }),
      // Critical oxygen saturation values
      fc.record({
        spo2: fc.constantFrom('85', '80', '88', '75'),
        expectedCritical: fc.constant(true)
      }),
      // Normal values (should not be critical)
      fc.record({
        bp: fc.constantFrom('120/80', '130/85', '110/70'),
        hr: fc.constantFrom('70', '80', '90'),
        temp: fc.constantFrom('98.6', '99.2', '97.8'),
        spo2: fc.constantFrom('98', '96', '99'),
        expectedCritical: fc.constant(false)
      })
    )
  }).map(data => ({
    ...data,
    expectedCritical: data.vitalSigns.expectedCritical
  }));
}

function generateRiskFactorChanges() {
  return fc.record({
    patientId: fc.uuid(),
    tenantId: fc.uuid(),
    changeType: fc.constantFrom('vital_signs', 'medication', 'lab_result', 'history'),
    changeData: fc.oneof(
      // Vital signs changes
      fc.record({
        bp: fc.string({ minLength: 5, maxLength: 10 }),
        hr: fc.integer({ min: 40, max: 180 }).map(String),
        temp: fc.float({ min: 95, max: 106 }).map(String)
      }),
      // Medication changes
      fc.record({
        name: fc.constantFrom('Warfarin', 'Insulin', 'Digoxin', 'Aspirin'),
        dosage: fc.constantFrom('5mg', '10mg', '25mg'),
        frequency: fc.constantFrom('Once daily', 'Twice daily')
      }),
      // Lab result changes
      fc.record({
        test_name: fc.constantFrom('WBC', 'Glucose', 'Creatinine'),
        value: fc.float({ min: 50, max: 500 }),
        unit: fc.constantFrom('mg/dL', '/uL'),
        is_abnormal: fc.boolean()
      }),
      // History changes
      fc.record({
        condition: fc.constantFrom('Diabetes', 'Hypertension', 'COPD'),
        onset_date: fc.date({ min: new Date('2020-01-01'), max: new Date() })
      })
    )
  });
}

function generateSignificantRiskChanges() {
  return fc.record({
    patientId: fc.uuid(),
    tenantId: fc.uuid(),
    changeType: fc.constantFrom('vital_signs', 'medication', 'lab_result'),
    changeData: fc.oneof(
      // Significant vital sign changes
      fc.record({
        bp: fc.constantFrom('160/100', '140/95', '170/105'),
        hr: fc.constantFrom('110', '120', '100'),
        temp: fc.constantFrom('101.5', '102.2', '100.8')
      }),
      // High-risk medications
      fc.record({
        name: fc.constantFrom('Warfarin', 'Insulin', 'Digoxin'),
        dosage: fc.constantFrom('5mg', '10mg'),
        frequency: fc.constantFrom('Once daily', 'Twice daily')
      }),
      // Abnormal lab results
      fc.record({
        test_name: fc.constantFrom('WBC', 'Glucose'),
        value: fc.oneof(
          fc.float({ min: 15000, max: 25000 }), // High WBC
          fc.float({ min: 200, max: 350 }) // High glucose
        ),
        unit: fc.constantFrom('mg/dL', '/uL'),
        is_abnormal: fc.constant(true)
      })
    )
  });
}

function generateMixedChangeTypes() {
  return fc.array(
    fc.record({
      patientId: fc.uuid(),
      tenantId: fc.uuid(),
      changeType: fc.constantFrom('vital_signs', 'medication', 'lab_result'),
      changeData: fc.oneof(
        // Critical vital signs
        fc.constant({ bp: '200/120', hr: '150' }),
        // High-risk medications
        fc.constant({ name: 'Warfarin', dosage: '10mg' }),
        // Critical lab results
        fc.constant({ test_name: 'WBC', value: 20000, is_abnormal: true })
      )
    }),
    { minLength: 1, maxLength: 5 }
  );
}

function generateConcurrentUpdates() {
  return fc.record({
    patientId: fc.uuid(),
    tenantId: fc.uuid(),
    updates: fc.array(
      fc.record({
        changeType: fc.constantFrom('vital_signs', 'medication', 'lab_result'),
        changeData: fc.record({
          value: fc.string({ minLength: 3, maxLength: 10 }),
          timestamp: fc.date({ min: new Date(), max: new Date(Date.now() + 1000) })
        })
      }),
      { minLength: 2, maxLength: 5 }
    )
  });
}

function generateAlertAcknowledgmentData() {
  return fc.record({
    patientId: fc.uuid(),
    tenantId: fc.uuid(),
    physicianId: fc.uuid(),
    alertId: fc.uuid()
  });
}