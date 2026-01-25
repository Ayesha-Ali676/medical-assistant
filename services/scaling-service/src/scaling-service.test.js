/**
 * Unit tests for Auto-Scaling Service
 * Requirements: 6.3
 */

const ScalingService = require('./scaling-service');

describe('ScalingService', () => {
  let scalingService;

  beforeEach(() => {
    scalingService = new ScalingService();
  });

  describe('Service Registration', () => {
    it('should register service for auto-scaling', () => {
      scalingService.registerService('api-gateway', 2);

      const service = scalingService.services.get('api-gateway');

      expect(service).toBeDefined();
      expect(service.currentReplicas).toBe(2);
      expect(service.policy).toBeDefined();
    });

    it('should initialize metrics for registered service', () => {
      scalingService.registerService('api-gateway', 2);

      const metrics = scalingService.metrics.get('api-gateway');

      expect(metrics).toBeDefined();
      expect(metrics.cpu).toBe(0);
      expect(metrics.memory).toBe(0);
    });
  });

  describe('Metrics Update', () => {
    it('should update service metrics', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 80, memory: 70 });

      const metrics = scalingService.metrics.get('api-gateway');

      expect(metrics.cpu).toBe(80);
      expect(metrics.memory).toBe(70);
    });
  });

  describe('Scaling Evaluation', () => {
    it('should recommend scale-up for high CPU usage', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 60 });

      const decision = scalingService.evaluateScaling('api-gateway');

      expect(decision.action).toBe('scale-up');
      expect(decision.desiredReplicas).toBe(3);
    });

    it('should recommend scale-down for low resource usage', () => {
      scalingService.registerService('api-gateway', 5);
      scalingService.updateMetrics('api-gateway', { cpu: 20, memory: 15 });

      const decision = scalingService.evaluateScaling('api-gateway');

      expect(decision.action).toBe('scale-down');
      expect(decision.desiredReplicas).toBe(4);
    });

    it('should not scale beyond max replicas', () => {
      scalingService.registerService('api-gateway', 10);
      scalingService.updateMetrics('api-gateway', { cpu: 90, memory: 85 });

      const decision = scalingService.evaluateScaling('api-gateway');

      expect(decision.action).toBe('none');
      // At max replicas, cannot scale up further
    });

    it('should not scale below min replicas', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 10, memory: 10 });

      const decision = scalingService.evaluateScaling('api-gateway');

      expect(decision.action).toBe('none');
    });

    it('should respect cooldown period', (done) => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 70 });

      // First scaling action
      const decision1 = scalingService.evaluateScaling('api-gateway');
      scalingService.executeScaling('api-gateway', decision1);

      // Immediate second evaluation should be in cooldown
      const decision2 = scalingService.evaluateScaling('api-gateway');

      expect(decision2.action).toBe('none');
      expect(decision2.reason).toContain('cooldown');
      done();
    });
  });

  describe('Scaling Execution', () => {
    it('should execute scale-up action', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 70 });

      const decision = scalingService.evaluateScaling('api-gateway');
      const result = scalingService.executeScaling('api-gateway', decision);

      expect(result.success).toBe(true);
      expect(result.toReplicas).toBe(3);
      expect(scalingService.services.get('api-gateway').currentReplicas).toBe(3);
    });

    it('should record scaling history', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 70 });

      const decision = scalingService.evaluateScaling('api-gateway');
      scalingService.executeScaling('api-gateway', decision);

      expect(scalingService.scalingHistory.length).toBe(1);
      expect(scalingService.scalingHistory[0].action).toBe('scale-up');
    });
  });

  describe('Auto-Scale All', () => {
    it('should auto-scale multiple services', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.registerService('triage-engine', 2);

      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 70 });
      scalingService.updateMetrics('triage-engine', { cpu: 80, memory: 75 });

      const results = scalingService.autoScaleAll();

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Service Status', () => {
    it('should get service status', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 50, memory: 45 });

      const status = scalingService.getServiceStatus('api-gateway');

      expect(status.name).toBe('api-gateway');
      expect(status.currentReplicas).toBe(2);
      expect(status.metrics.cpu).toBe(50);
    });

    it('should get all services status', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.registerService('triage-engine', 3);

      const statuses = scalingService.getAllServicesStatus();

      expect(statuses.length).toBe(2);
    });
  });

  describe('Scaling History', () => {
    it('should get scaling history', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 70 });

      const decision = scalingService.evaluateScaling('api-gateway');
      scalingService.executeScaling('api-gateway', decision);

      const history = scalingService.getScalingHistory();

      expect(history.length).toBe(1);
      expect(history[0].serviceName).toBe('api-gateway');
    });

    it('should filter history by service name', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.registerService('triage-engine', 2);

      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 70 });
      scalingService.updateMetrics('triage-engine', { cpu: 80, memory: 75 });

      scalingService.autoScaleAll();

      const history = scalingService.getScalingHistory('api-gateway');

      expect(history.length).toBe(1);
      expect(history[0].serviceName).toBe('api-gateway');
    });
  });

  describe('Optimal Replicas Calculation', () => {
    it('should calculate optimal replica count', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 90, memory: 85 });

      const optimal = scalingService.calculateOptimalReplicas('api-gateway', 70);

      expect(optimal).toBeGreaterThan(2);
      expect(optimal).toBeLessThanOrEqual(10); // max replicas
    });
  });

  describe('Scaling Prediction', () => {
    it('should predict scaling needs', () => {
      scalingService.registerService('api-gateway', 2);
      scalingService.updateMetrics('api-gateway', { cpu: 85, memory: 80 });

      const prediction = scalingService.predictScalingNeeds('api-gateway');

      expect(prediction.recommendation).toBe('scale-up');
      expect(prediction.optimalReplicas).toBeGreaterThan(2);
    });
  });

  describe('Policy Update', () => {
    it('should update scaling policy', () => {
      scalingService.registerService('api-gateway', 2);

      scalingService.updateScalingPolicy('api-gateway', {
        maxReplicas: 15,
        targetCPU: 80,
      });

      const service = scalingService.services.get('api-gateway');

      expect(service.policy.maxReplicas).toBe(15);
      expect(service.policy.targetCPU).toBe(80);
    });
  });
});
