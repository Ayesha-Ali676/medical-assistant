/**
 * Tests for Real-time Risk Update Service
 * For physician review only
 */

const RealTimeRiskService = require('../src/services/real-time-risk-service');
const { RiskScoringModel } = require('../src/models/risk-scoring');

describe('Real-time Risk Update Service', () => {
  let mockDbManager;
  let realTimeRiskService;
  
  beforeEach(() => {
    // Mock database manager
    mockDbManager = {
      executeQuery: jest.fn(),
      initializePostgreSQL: jest.fn(),
      initializeRedis: jest.fn()
    };
    
    realTimeRiskService = new RealTimeRiskService(mockDbManager);
  });
  
  afterEach(() => {
    if (realTimeRiskService) {
      realTimeRiskService.stopProcessing();
    }
  });

  test('should initialize with correct default settings', () => {
    expect(realTimeRiskService.riskModel).toBeInstanceOf(RiskScoringModel);
    expect(realTimeRiskService.riskThresholds.significantChange).toBe(10);
    expect(realTimeRiskService.riskThresholds.criticalChange).toBe(20);
    expect(realTimeRiskService.activeConnections).toBeInstanceOf(Map);
    expect(realTimeRiskService.riskUpdateQueue).toBeInstanceOf(Map);
  });

  test('should queue risk updates correctly', async () => {
    const patientId = 'patient-123';
    const tenantId = 'tenant-456';
    const changeType = 'vital_signs';
    const changeData = { bp: '180/110', hr: '120' };
    
    const updateId = await realTimeRiskService.queueRiskUpdate(
      patientId, 
      tenantId, 
      changeType, 
      changeData
    );
    
    expect(updateId).toBeDefined();
    expect(typeof updateId).toBe('string');
    expect(realTimeRiskService.riskUpdateQueue.has(patientId)).toBe(true);
    
    const queuedUpdates = realTimeRiskService.riskUpdateQueue.get(patientId);
    expect(queuedUpdates).toHaveLength(1);
    expect(queuedUpdates[0].changeType).toBe(changeType);
    expect(queuedUpdates[0].changeData).toEqual(changeData);
  });

  test('should detect critical vital sign changes', () => {
    // Critical blood pressure
    expect(realTimeRiskService.isCriticalVitalChange({ bp: '200/120' })).toBe(true);
    expect(realTimeRiskService.isCriticalVitalChange({ bp: '80/50' })).toBe(true);
    
    // Critical heart rate
    expect(realTimeRiskService.isCriticalVitalChange({ hr: '150' })).toBe(true);
    expect(realTimeRiskService.isCriticalVitalChange({ hr: '40' })).toBe(true);
    
    // Critical temperature
    expect(realTimeRiskService.isCriticalVitalChange({ temp: '105' })).toBe(true);
    expect(realTimeRiskService.isCriticalVitalChange({ temp: '94' })).toBe(true);
    
    // Critical oxygen saturation
    expect(realTimeRiskService.isCriticalVitalChange({ spo2: '85' })).toBe(true);
    
    // Normal values should not be critical
    expect(realTimeRiskService.isCriticalVitalChange({ bp: '120/80' })).toBe(false);
    expect(realTimeRiskService.isCriticalVitalChange({ hr: '80' })).toBe(false);
  });

  test('should compare risk assessments correctly', () => {
    const previousRisk = {
      overallRisk: { score: 50, level: 'Moderate' },
      riskCategories: {
        cardiac: { score: 40 },
        respiratory: { score: 30 },
        infection: { score: 20 },
        medication: { score: 10 }
      }
    };
    
    const newRisk = {
      overallRisk: { score: 75, level: 'High' },
      riskCategories: {
        cardiac: { score: 60 },
        respiratory: { score: 50 },
        infection: { score: 40 },
        medication: { score: 30 }
      }
    };
    
    const changes = realTimeRiskService.compareRiskAssessments(previousRisk, newRisk);
    
    expect(changes.significantChange).toBe(true);
    expect(changes.priorityChanged).toBe(true);
    expect(changes.shouldNotify).toBe(true);
    expect(changes.scoreDifference).toBe(25);
    expect(changes.changes).toContain('Priority changed from Moderate to High');
  });

  test('should handle first-time risk assessment', () => {
    const newRisk = {
      overallRisk: { score: 60, level: 'High' },
      riskCategories: {
        cardiac: { score: 50 },
        respiratory: { score: 40 },
        infection: { score: 30 },
        medication: { score: 20 }
      }
    };
    
    const changes = realTimeRiskService.compareRiskAssessments(null, newRisk);
    
    expect(changes.significantChange).toBe(true);
    expect(changes.shouldNotify).toBe(true);
    expect(changes.changes).toContain('Initial risk assessment');
    expect(changes.scoreDifference).toBe(60);
  });

  test('should generate appropriate recommendations', () => {
    const criticalChanges = {
      criticalChange: true,
      significantChange: true,
      priorityChanged: true
    };
    
    const riskAssessment = {
      overallRisk: { level: 'Critical' },
      riskCategories: {
        cardiac: { score: 80, recommendations: ['Cardiology consultation'] },
        respiratory: { score: 70, recommendations: ['Oxygen therapy'] }
      }
    };
    
    const recommendations = realTimeRiskService.generateRiskChangeRecommendations(
      criticalChanges, 
      riskAssessment
    );
    
    expect(recommendations).toContain('Immediate physician evaluation recommended');
    expect(recommendations).toContain('Consider continuous monitoring');
    expect(recommendations).toContain('Patient priority updated to Critical');
    expect(recommendations).toContain('Cardiology consultation');
    expect(recommendations).toContain('Oxygen therapy');
  });

  test('should determine priority levels correctly', () => {
    expect(realTimeRiskService.determinePriorityLevel(85)).toBe('CRITICAL');
    expect(realTimeRiskService.determinePriorityLevel(70)).toBe('HIGH');
    expect(realTimeRiskService.determinePriorityLevel(50)).toBe('NORMAL');
    expect(realTimeRiskService.determinePriorityLevel(0)).toBe('NORMAL');
  });

  test('should detect critical medication changes', () => {
    expect(realTimeRiskService.isCriticalMedicationChange({ name: 'Warfarin' })).toBe(true);
    expect(realTimeRiskService.isCriticalMedicationChange({ name: 'Insulin' })).toBe(true);
    expect(realTimeRiskService.isCriticalMedicationChange({ name: 'Digoxin' })).toBe(true);
    expect(realTimeRiskService.isCriticalMedicationChange({ name: 'Aspirin' })).toBe(false);
  });

  test('should detect critical lab changes', () => {
    expect(realTimeRiskService.isCriticalLabChange({ 
      test_name: 'WBC', 
      is_abnormal: true 
    })).toBe(true);
    
    expect(realTimeRiskService.isCriticalLabChange({ 
      test_name: 'Glucose', 
      is_abnormal: true 
    })).toBe(true);
    
    expect(realTimeRiskService.isCriticalLabChange({ 
      test_name: 'Cholesterol', 
      is_abnormal: true 
    })).toBe(false);
    
    expect(realTimeRiskService.isCriticalLabChange({ 
      test_name: 'WBC', 
      is_abnormal: false 
    })).toBe(false);
  });

  test('should handle processing start and stop', () => {
    expect(realTimeRiskService.processingInterval).toBeDefined();
    
    realTimeRiskService.stopProcessing();
    expect(realTimeRiskService.processingInterval).toBeNull();
    
    realTimeRiskService.startProcessing();
    expect(realTimeRiskService.processingInterval).toBeDefined();
  });
});