/**
 * Multi-Tenant Security Architecture Service
 * 
 * Implements secure data isolation between healthcare organizations,
 * tenant-specific access controls, and security monitoring.
 * 
 * Requirements: 6.1
 */

const crypto = require('crypto');

class MultiTenantSecurityService {
  constructor() {
    // Tenant registry
    this.tenants = new Map();
    
    // Tenant access policies
    this.accessPolicies = new Map();
    
    // Security events log
    this.securityEvents = [];
    
    // Tenant isolation rules
    this.isolationRules = {
      dataSeparation: true,
      networkIsolation: true,
      resourceQuotas: true,
      auditSeparation: true
    };
  }

  /**
   * Register a new tenant (healthcare organization)
   * @param {Object} tenantInfo - Tenant information
   * @returns {Object} Tenant registration result
   */
  registerTenant(tenantInfo) {
    const {
      organizationName,
      organizationType,
      contactEmail,
      adminUserId
    } = tenantInfo;

    // Validate required fields
    if (!organizationName || !organizationType || !contactEmail || !adminUserId) {
      throw new Error('Missing required tenant information');
    }

    // Generate unique tenant ID
    const tenantId = crypto.randomUUID();
    
    // Generate tenant-specific encryption key
    const encryptionKey = crypto.randomBytes(32).toString('base64');
    
    // Create tenant record
    const tenant = {
      tenantId,
      organizationName,
      organizationType,
      contactEmail,
      adminUserId,
      encryptionKey,
      status: 'ACTIVE',
      createdAt: new Date(),
      resourceQuota: this.getDefaultResourceQuota(organizationType),
      securitySettings: this.getDefaultSecuritySettings()
    };

    // Store tenant
    this.tenants.set(tenantId, tenant);
    
    // Initialize access policy
    this.initializeAccessPolicy(tenantId);
    
    // Log security event
    this.logSecurityEvent({
      type: 'TENANT_REGISTERED',
      tenantId,
      organizationName,
      timestamp: new Date()
    });

    return {
      tenantId,
      organizationName,
      status: 'ACTIVE',
      message: 'Tenant registered successfully'
    };
  }

  /**
   * Get default resource quota based on organization type
   * @param {string} organizationType - Type of organization
   * @returns {Object} Resource quota
   */
  getDefaultResourceQuota(organizationType) {
    const quotas = {
      'hospital': {
        maxUsers: 1000,
        maxPatients: 50000,
        maxStorageGB: 1000,
        maxAPICallsPerHour: 100000
      },
      'clinic': {
        maxUsers: 100,
        maxPatients: 5000,
        maxStorageGB: 100,
        maxAPICallsPerHour: 10000
      },
      'research': {
        maxUsers: 50,
        maxPatients: 10000,
        maxStorageGB: 500,
        maxAPICallsPerHour: 5000
      }
    };

    return quotas[organizationType] || quotas['clinic'];
  }

  /**
   * Get default security settings
   * @returns {Object} Security settings
   */
  getDefaultSecuritySettings() {
    return {
      mfaRequired: true,
      sessionTimeout: 30, // minutes
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      ipWhitelisting: false,
      auditLogRetention: 365 // days
    };
  }

  /**
   * Initialize access policy for tenant
   * @param {string} tenantId - Tenant ID
   */
  initializeAccessPolicy(tenantId) {
    const policy = {
      tenantId,
      allowedRoles: ['admin', 'physician', 'nurse', 'staff'],
      dataAccessRules: {
        ownTenantOnly: true,
        crossTenantAccess: false,
        sharedResourceAccess: false
      },
      apiAccessRules: {
        rateLimit: true,
        quotaEnforcement: true
      },
      createdAt: new Date()
    };

    this.accessPolicies.set(tenantId, policy);
  }

  /**
   * Validate tenant data isolation
   * @param {Object} request - Data access request
   * @returns {Object} Validation result
   */
  validateDataIsolation(request) {
    const {
      requestingTenantId,
      targetTenantId,
      resourceType,
      resourceId
    } = request;

    // Validate required fields
    if (!requestingTenantId || !targetTenantId || !resourceType) {
      return {
        allowed: false,
        reason: 'Missing required fields for data isolation validation',
        securityViolation: true
      };
    }

    // Check if tenant exists
    if (!this.tenants.has(requestingTenantId)) {
      this.logSecurityEvent({
        type: 'INVALID_TENANT_ACCESS',
        tenantId: requestingTenantId,
        reason: 'Tenant not found',
        timestamp: new Date()
      });

      return {
        allowed: false,
        reason: 'Requesting tenant not found',
        securityViolation: true
      };
    }

    // Get access policy
    const policy = this.accessPolicies.get(requestingTenantId);
    
    // Check if accessing own tenant data
    if (requestingTenantId === targetTenantId) {
      return {
        allowed: true,
        reason: 'Access to own tenant data',
        securityViolation: false
      };
    }

    // Check cross-tenant access policy
    if (!policy.dataAccessRules.crossTenantAccess) {
      this.logSecurityEvent({
        type: 'CROSS_TENANT_ACCESS_DENIED',
        requestingTenantId,
        targetTenantId,
        resourceType,
        timestamp: new Date()
      });

      return {
        allowed: false,
        reason: 'Cross-tenant access not permitted',
        securityViolation: true
      };
    }

    // If cross-tenant access is allowed, check shared resource access
    if (policy.dataAccessRules.sharedResourceAccess) {
      return {
        allowed: true,
        reason: 'Shared resource access permitted',
        securityViolation: false
      };
    }

    return {
      allowed: false,
      reason: 'Access denied by tenant isolation policy',
      securityViolation: true
    };
  }

  /**
   * Validate tenant-specific access control
   * @param {Object} accessRequest - Access request
   * @returns {Object} Access validation result
   */
  validateTenantAccess(accessRequest) {
    const {
      tenantId,
      userId,
      userRole,
      resourceType,
      action
    } = accessRequest;

    // Validate tenant exists
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return {
        allowed: false,
        reason: 'Tenant not found',
        securityViolation: true
      };
    }

    // Check tenant status
    if (tenant.status !== 'ACTIVE') {
      this.logSecurityEvent({
        type: 'INACTIVE_TENANT_ACCESS',
        tenantId,
        userId,
        status: tenant.status,
        timestamp: new Date()
      });

      return {
        allowed: false,
        reason: `Tenant status is ${tenant.status}`,
        securityViolation: true
      };
    }

    // Get access policy
    const policy = this.accessPolicies.get(tenantId);
    
    // Validate role
    if (!policy.allowedRoles.includes(userRole)) {
      this.logSecurityEvent({
        type: 'UNAUTHORIZED_ROLE',
        tenantId,
        userId,
        userRole,
        timestamp: new Date()
      });

      return {
        allowed: false,
        reason: 'User role not authorized for this tenant',
        securityViolation: true
      };
    }

    // Check resource quota
    const quotaCheck = this.checkResourceQuota(tenantId, resourceType);
    if (!quotaCheck.withinQuota) {
      this.logSecurityEvent({
        type: 'QUOTA_EXCEEDED',
        tenantId,
        resourceType,
        currentUsage: quotaCheck.currentUsage,
        quota: quotaCheck.quota,
        timestamp: new Date()
      });

      return {
        allowed: false,
        reason: `Resource quota exceeded for ${resourceType}`,
        securityViolation: false,
        quotaExceeded: true
      };
    }

    return {
      allowed: true,
      reason: 'Access granted',
      securityViolation: false
    };
  }

  /**
   * Check resource quota for tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} resourceType - Resource type
   * @returns {Object} Quota check result
   */
  checkResourceQuota(tenantId, resourceType) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return { withinQuota: false, reason: 'Tenant not found' };
    }

    // For this implementation, we'll simulate quota checking
    // In production, this would query actual resource usage
    const quota = tenant.resourceQuota;
    const currentUsage = {
      maxUsers: 0,
      maxPatients: 0,
      maxStorageGB: 0,
      maxAPICallsPerHour: 0
    };

    const resourceQuotaMap = {
      'users': { quota: quota.maxUsers, current: currentUsage.maxUsers },
      'patients': { quota: quota.maxPatients, current: currentUsage.maxPatients },
      'storage': { quota: quota.maxStorageGB, current: currentUsage.maxStorageGB },
      'api_calls': { quota: quota.maxAPICallsPerHour, current: currentUsage.maxAPICallsPerHour }
    };

    const resource = resourceQuotaMap[resourceType];
    if (!resource) {
      return { withinQuota: true, reason: 'Resource type not quota-limited' };
    }

    return {
      withinQuota: resource.current < resource.quota,
      currentUsage: resource.current,
      quota: resource.quota,
      percentUsed: (resource.current / resource.quota * 100).toFixed(2)
    };
  }

  /**
   * Enable cross-tenant access for specific tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Cross-tenant access options
   * @returns {Object} Update result
   */
  enableCrossTenantAccess(tenantId, options = {}) {
    const policy = this.accessPolicies.get(tenantId);
    if (!policy) {
      throw new Error('Tenant policy not found');
    }

    policy.dataAccessRules.crossTenantAccess = true;
    policy.dataAccessRules.sharedResourceAccess = options.sharedResourceAccess || false;
    policy.dataAccessRules.allowedTenants = options.allowedTenants || [];

    this.logSecurityEvent({
      type: 'CROSS_TENANT_ACCESS_ENABLED',
      tenantId,
      options,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Cross-tenant access enabled',
      policy: policy.dataAccessRules
    };
  }

  /**
   * Update tenant security settings
   * @param {string} tenantId - Tenant ID
   * @param {Object} settings - Security settings
   * @returns {Object} Update result
   */
  updateSecuritySettings(tenantId, settings) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Update security settings
    tenant.securitySettings = {
      ...tenant.securitySettings,
      ...settings
    };

    this.logSecurityEvent({
      type: 'SECURITY_SETTINGS_UPDATED',
      tenantId,
      settings,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Security settings updated',
      settings: tenant.securitySettings
    };
  }

  /**
   * Suspend tenant access
   * @param {string} tenantId - Tenant ID
   * @param {string} reason - Suspension reason
   * @returns {Object} Suspension result
   */
  suspendTenant(tenantId, reason) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.status = 'SUSPENDED';
    tenant.suspensionReason = reason;
    tenant.suspendedAt = new Date();

    this.logSecurityEvent({
      type: 'TENANT_SUSPENDED',
      tenantId,
      reason,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Tenant suspended',
      tenantId,
      status: 'SUSPENDED'
    };
  }

  /**
   * Reactivate suspended tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Reactivation result
   */
  reactivateTenant(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.status = 'ACTIVE';
    delete tenant.suspensionReason;
    delete tenant.suspendedAt;

    this.logSecurityEvent({
      type: 'TENANT_REACTIVATED',
      tenantId,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Tenant reactivated',
      tenantId,
      status: 'ACTIVE'
    };
  }

  /**
   * Log security event
   * @param {Object} event - Security event
   */
  logSecurityEvent(event) {
    this.securityEvents.push({
      ...event,
      eventId: crypto.randomUUID(),
      loggedAt: new Date()
    });
  }

  /**
   * Get security events for tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Filter options
   * @returns {Array} Security events
   */
  getSecurityEvents(tenantId, options = {}) {
    const { eventType, startDate, endDate, limit = 100 } = options;

    let events = this.securityEvents.filter(event => 
      event.tenantId === tenantId
    );

    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }

    if (startDate) {
      events = events.filter(event => event.timestamp >= startDate);
    }

    if (endDate) {
      events = events.filter(event => event.timestamp <= endDate);
    }

    return events.slice(-limit);
  }

  /**
   * Generate security report for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Security report
   */
  generateSecurityReport(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const events = this.getSecurityEvents(tenantId);
    
    // Count events by type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    // Count security violations
    const violations = events.filter(event => 
      event.type.includes('DENIED') || 
      event.type.includes('UNAUTHORIZED') ||
      event.type.includes('INVALID')
    );

    return {
      tenantId,
      organizationName: tenant.organizationName,
      status: tenant.status,
      reportPeriod: {
        startDate: events[0]?.timestamp || new Date(),
        endDate: new Date()
      },
      summary: {
        totalEvents: events.length,
        securityViolations: violations.length,
        eventsByType
      },
      recentViolations: violations.slice(-10),
      securitySettings: tenant.securitySettings,
      resourceQuota: tenant.resourceQuota,
      generatedAt: new Date()
    };
  }

  /**
   * Get tenant information
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Tenant information
   */
  getTenant(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return null;
    }

    // Return tenant info without encryption key
    const { encryptionKey, ...tenantInfo } = tenant;
    return tenantInfo;
  }

  /**
   * Get all tenants
   * @returns {Array} List of tenants
   */
  getAllTenants() {
    return Array.from(this.tenants.values()).map(tenant => {
      const { encryptionKey, ...tenantInfo } = tenant;
      return tenantInfo;
    });
  }

  /**
   * Clear all data (for testing)
   */
  clearAll() {
    this.tenants.clear();
    this.accessPolicies.clear();
    this.securityEvents = [];
  }
}

module.exports = MultiTenantSecurityService;
