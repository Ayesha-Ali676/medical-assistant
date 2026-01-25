/**
 * Auto-Scaling Service
 * Kubernetes-based auto-scaling for microservices
 * Requirements: 6.3
 */

class ScalingService {
  constructor() {
    this.services = new Map();
    this.metrics = new Map();
    this.scalingPolicies = this.initializeScalingPolicies();
    this.scalingHistory = [];
  }

  /**
   * Initialize default scaling policies
   */
  initializeScalingPolicies() {
    return {
      'api-gateway': {
        minReplicas: 2,
        maxReplicas: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 75,
        scaleDownThreshold: 30,
        cooldownPeriod: 300, // 5 minutes
      },
      'triage-engine': {
        minReplicas: 2,
        maxReplicas: 8,
        targetCPU: 60,
        targetMemory: 75,
        scaleUpThreshold: 70,
        scaleDownThreshold: 25,
        cooldownPeriod: 300,
      },
      'ai-intelligence': {
        minReplicas: 3,
        maxReplicas: 12,
        targetCPU: 65,
        targetMemory: 80,
        scaleUpThreshold: 75,
        scaleDownThreshold: 30,
        cooldownPeriod: 600, // 10 minutes (AI models take longer to start)
      },
      'safety-engine': {
        minReplicas: 2,
        maxReplicas: 6,
        targetCPU: 60,
        targetMemory: 70,
        scaleUpThreshold: 70,
        scaleDownThreshold: 25,
        cooldownPeriod: 300,
      },
    };
  }

  /**
   * Register service for auto-scaling
   * @param {string} serviceName - Service name
   * @param {number} currentReplicas - Current number of replicas
   */
  registerService(serviceName, currentReplicas) {
    const policy = this.scalingPolicies[serviceName] || this.scalingPolicies['api-gateway'];

    this.services.set(serviceName, {
      name: serviceName,
      currentReplicas,
      desiredReplicas: currentReplicas,
      policy,
      lastScalingAction: null,
      status: 'stable',
    });

    this.metrics.set(serviceName, {
      cpu: 0,
      memory: 0,
      requestRate: 0,
      errorRate: 0,
      responseTime: 0,
    });
  }

  /**
   * Update service metrics
   * @param {string} serviceName - Service name
   * @param {Object} metrics - Service metrics
   */
  updateMetrics(serviceName, metrics) {
    const current = this.metrics.get(serviceName) || {};
    this.metrics.set(serviceName, { ...current, ...metrics });
  }

  /**
   * Evaluate scaling decision
   * @param {string} serviceName - Service name
   * @returns {Object} - Scaling decision
   */
  evaluateScaling(serviceName) {
    const service = this.services.get(serviceName);
    const metrics = this.metrics.get(serviceName);

    if (!service || !metrics) {
      return { action: 'none', reason: 'Service not found' };
    }

    // Check cooldown period
    if (service.lastScalingAction) {
      const timeSinceLastAction = Date.now() - service.lastScalingAction;
      if (timeSinceLastAction < service.policy.cooldownPeriod * 1000) {
        return { action: 'none', reason: 'In cooldown period' };
      }
    }

    // Evaluate scale up
    if (metrics.cpu > service.policy.scaleUpThreshold || 
        metrics.memory > service.policy.scaleUpThreshold) {
      if (service.currentReplicas < service.policy.maxReplicas) {
        return {
          action: 'scale-up',
          reason: `High resource usage: CPU ${metrics.cpu}%, Memory ${metrics.memory}%`,
          currentReplicas: service.currentReplicas,
          desiredReplicas: Math.min(
            service.currentReplicas + 1,
            service.policy.maxReplicas
          ),
        };
      }
    }

    // Evaluate scale down
    if (metrics.cpu < service.policy.scaleDownThreshold && 
        metrics.memory < service.policy.scaleDownThreshold) {
      if (service.currentReplicas > service.policy.minReplicas) {
        return {
          action: 'scale-down',
          reason: `Low resource usage: CPU ${metrics.cpu}%, Memory ${metrics.memory}%`,
          currentReplicas: service.currentReplicas,
          desiredReplicas: Math.max(
            service.currentReplicas - 1,
            service.policy.minReplicas
          ),
        };
      }
    }

    return { action: 'none', reason: 'Metrics within normal range' };
  }

  /**
   * Execute scaling action
   * @param {string} serviceName - Service name
   * @param {Object} decision - Scaling decision
   * @returns {Object} - Scaling result
   */
  executeScaling(serviceName, decision) {
    if (decision.action === 'none') {
      return { success: false, message: decision.reason };
    }

    const service = this.services.get(serviceName);
    
    service.currentReplicas = decision.desiredReplicas;
    service.desiredReplicas = decision.desiredReplicas;
    service.lastScalingAction = Date.now();
    service.status = decision.action === 'scale-up' ? 'scaling-up' : 'scaling-down';

    const historyEntry = {
      serviceName,
      action: decision.action,
      reason: decision.reason,
      fromReplicas: decision.currentReplicas,
      toReplicas: decision.desiredReplicas,
      timestamp: new Date().toISOString(),
    };

    this.scalingHistory.push(historyEntry);

    return {
      success: true,
      message: `Scaled ${serviceName} from ${decision.currentReplicas} to ${decision.desiredReplicas} replicas`,
      ...historyEntry,
    };
  }

  /**
   * Auto-scale all registered services
   * @returns {Array} - Scaling results
   */
  autoScaleAll() {
    const results = [];

    for (const serviceName of this.services.keys()) {
      const decision = this.evaluateScaling(serviceName);
      if (decision.action !== 'none') {
        const result = this.executeScaling(serviceName, decision);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get service status
   * @param {string} serviceName - Service name
   * @returns {Object} - Service status
   */
  getServiceStatus(serviceName) {
    const service = this.services.get(serviceName);
    const metrics = this.metrics.get(serviceName);

    if (!service) {
      return null;
    }

    return {
      ...service,
      metrics,
    };
  }

  /**
   * Get all services status
   * @returns {Array} - All services status
   */
  getAllServicesStatus() {
    const statuses = [];

    for (const serviceName of this.services.keys()) {
      statuses.push(this.getServiceStatus(serviceName));
    }

    return statuses;
  }

  /**
   * Get scaling history
   * @param {string} serviceName - Service name (optional)
   * @param {number} limit - Number of entries to return
   * @returns {Array} - Scaling history
   */
  getScalingHistory(serviceName = null, limit = 50) {
    let history = this.scalingHistory;

    if (serviceName) {
      history = history.filter(entry => entry.serviceName === serviceName);
    }

    return history.slice(-limit);
  }

  /**
   * Update scaling policy
   * @param {string} serviceName - Service name
   * @param {Object} policy - New policy
   */
  updateScalingPolicy(serviceName, policy) {
    const service = this.services.get(serviceName);
    if (service) {
      service.policy = { ...service.policy, ...policy };
    }
  }

  /**
   * Calculate optimal replica count based on load
   * @param {string} serviceName - Service name
   * @param {number} targetLoad - Target load percentage
   * @returns {number} - Optimal replica count
   */
  calculateOptimalReplicas(serviceName, targetLoad = 70) {
    const service = this.services.get(serviceName);
    const metrics = this.metrics.get(serviceName);

    if (!service || !metrics) {
      return null;
    }

    const currentLoad = Math.max(metrics.cpu, metrics.memory);
    const optimalReplicas = Math.ceil(
      (service.currentReplicas * currentLoad) / targetLoad
    );

    return Math.max(
      service.policy.minReplicas,
      Math.min(optimalReplicas, service.policy.maxReplicas)
    );
  }

  /**
   * Predict scaling needs based on trends
   * @param {string} serviceName - Service name
   * @returns {Object} - Scaling prediction
   */
  predictScalingNeeds(serviceName) {
    const service = this.services.get(serviceName);
    const metrics = this.metrics.get(serviceName);

    if (!service || !metrics) {
      return null;
    }

    const currentLoad = Math.max(metrics.cpu, metrics.memory);
    const optimalReplicas = this.calculateOptimalReplicas(serviceName);

    return {
      serviceName,
      currentReplicas: service.currentReplicas,
      optimalReplicas,
      currentLoad,
      recommendation: optimalReplicas > service.currentReplicas ? 'scale-up' : 
                     optimalReplicas < service.currentReplicas ? 'scale-down' : 'maintain',
    };
  }
}

module.exports = ScalingService;
