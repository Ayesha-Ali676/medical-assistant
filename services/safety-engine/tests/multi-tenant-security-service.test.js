/**
 * Unit Tests for Multi-Tenant Security Service
 */

const MultiTenantSecurityService = require('../src/services/multi-tenant-security-service');

describe('Multi-Tenant Security Service', () => {
  let service;

  beforeEach(() => {
    service = new MultiTenantSecurityService();
  });

  describe('Tenant Registration', () => {
    test('should register a new tenant successfully', () => {
      const tenantInfo = {
        organizationName: 'City Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@cityhospital.com',
        adminUserId: 'admin123'
      };

      const result = service.registerTenant(tenantInfo);

      expect(result.tenantId).toBeDefined();
      expect(result.organizationName).toBe('City Hospital');
      expect(result.status).toBe('ACTIVE');
      expect(result.message).toContain('successfully');
    });

    test('should throw error when required fields are missing', () => {
      const tenantInfo = {
        organizationName: 'City Hospital'
        // Missing other required fields
      };

      expect(() => {
        service.registerTenant(tenantInfo);
      }).toThrow('Missing required tenant information');
    });

    test('should assign appropriate resource quota based on organization type', () => {
      const hospitalInfo = {
        organizationName: 'Large Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@hospital.com',
        adminUserId: 'admin1'
      };

      const result = service.registerTenant(hospitalInfo);
      const tenant = service.getTenant(result.tenantId);

      expect(tenant.resourceQuota.maxUsers).toBe(1000);
      expect(tenant.resourceQuota.maxPatients).toBe(50000);
    });

    test('should assign clinic quota for clinic organization type', () => {
      const clinicInfo = {
        organizationName: 'Small Clinic',
        organizationType: 'clinic',
        contactEmail: 'admin@clinic.com',
        adminUserId: 'admin2'
      };

      const result = service.registerTenant(clinicInfo);
      const tenant = service.getTenant(result.tenantId);

      expect(tenant.resourceQuota.maxUsers).toBe(100);
      expect(tenant.resourceQuota.maxPatients).toBe(5000);
    });

    test('should initialize default security settings', () => {
      const tenantInfo = {
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin3'
      };

      const result = service.registerTenant(tenantInfo);
      const tenant = service.getTenant(result.tenantId);

      expect(tenant.securitySettings.mfaRequired).toBe(true);
      expect(tenant.securitySettings.sessionTimeout).toBe(30);
      expect(tenant.securitySettings.passwordPolicy).toBeDefined();
    });
  });

  describe('Data Isolation Validation', () => {
    let tenant1Id, tenant2Id;

    beforeEach(() => {
      const tenant1 = service.registerTenant({
        organizationName: 'Hospital A',
        organizationType: 'hospital',
        contactEmail: 'admin@hospitala.com',
        adminUserId: 'admin1'
      });
      tenant1Id = tenant1.tenantId;

      const tenant2 = service.registerTenant({
        organizationName: 'Hospital B',
        organizationType: 'hospital',
        contactEmail: 'admin@hospitalb.com',
        adminUserId: 'admin2'
      });
      tenant2Id = tenant2.tenantId;
    });

    test('should allow access to own tenant data', () => {
      const request = {
        requestingTenantId: tenant1Id,
        targetTenantId: tenant1Id,
        resourceType: 'patient_records',
        resourceId: 'patient123'
      };

      const result = service.validateDataIsolation(request);

      expect(result.allowed).toBe(true);
      expect(result.securityViolation).toBe(false);
      expect(result.reason).toContain('own tenant data');
    });

    test('should deny cross-tenant access by default', () => {
      const request = {
        requestingTenantId: tenant1Id,
        targetTenantId: tenant2Id,
        resourceType: 'patient_records',
        resourceId: 'patient456'
      };

      const result = service.validateDataIsolation(request);

      expect(result.allowed).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.reason).toContain('Cross-tenant access not permitted');
    });

    test('should allow cross-tenant access when enabled', () => {
      // Enable cross-tenant access for tenant1
      service.enableCrossTenantAccess(tenant1Id, {
        sharedResourceAccess: true
      });

      const request = {
        requestingTenantId: tenant1Id,
        targetTenantId: tenant2Id,
        resourceType: 'shared_guidelines',
        resourceId: 'guideline789'
      };

      const result = service.validateDataIsolation(request);

      expect(result.allowed).toBe(true);
      expect(result.securityViolation).toBe(false);
    });

    test('should deny access for invalid tenant', () => {
      const request = {
        requestingTenantId: 'invalid-tenant-id',
        targetTenantId: tenant2Id,
        resourceType: 'patient_records',
        resourceId: 'patient456'
      };

      const result = service.validateDataIsolation(request);

      expect(result.allowed).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.reason).toContain('not found');
    });

    test('should deny access when required fields are missing', () => {
      const request = {
        requestingTenantId: tenant1Id
        // Missing targetTenantId and resourceType
      };

      const result = service.validateDataIsolation(request);

      expect(result.allowed).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.reason).toContain('Missing required fields');
    });
  });

  describe('Tenant Access Validation', () => {
    let tenantId;

    beforeEach(() => {
      const tenant = service.registerTenant({
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin1'
      });
      tenantId = tenant.tenantId;
    });

    test('should allow access for authorized user with valid role', () => {
      const accessRequest = {
        tenantId,
        userId: 'doc123',
        userRole: 'physician',
        resourceType: 'patients',
        action: 'read'
      };

      const result = service.validateTenantAccess(accessRequest);

      expect(result.allowed).toBe(true);
      expect(result.securityViolation).toBe(false);
    });

    test('should deny access for unauthorized role', () => {
      const accessRequest = {
        tenantId,
        userId: 'user123',
        userRole: 'unauthorized_role',
        resourceType: 'patients',
        action: 'read'
      };

      const result = service.validateTenantAccess(accessRequest);

      expect(result.allowed).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.reason).toContain('not authorized');
    });

    test('should deny access for suspended tenant', () => {
      service.suspendTenant(tenantId, 'Security violation');

      const accessRequest = {
        tenantId,
        userId: 'doc123',
        userRole: 'physician',
        resourceType: 'patients',
        action: 'read'
      };

      const result = service.validateTenantAccess(accessRequest);

      expect(result.allowed).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.reason).toContain('SUSPENDED');
    });

    test('should deny access for non-existent tenant', () => {
      const accessRequest = {
        tenantId: 'invalid-tenant-id',
        userId: 'doc123',
        userRole: 'physician',
        resourceType: 'patients',
        action: 'read'
      };

      const result = service.validateTenantAccess(accessRequest);

      expect(result.allowed).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.reason).toContain('not found');
    });
  });

  describe('Resource Quota Management', () => {
    let tenantId;

    beforeEach(() => {
      const tenant = service.registerTenant({
        organizationName: 'Test Clinic',
        organizationType: 'clinic',
        contactEmail: 'admin@clinic.com',
        adminUserId: 'admin1'
      });
      tenantId = tenant.tenantId;
    });

    test('should check resource quota', () => {
      const result = service.checkResourceQuota(tenantId, 'users');

      expect(result.withinQuota).toBe(true);
      expect(result.quota).toBe(100); // Clinic quota
      expect(result.currentUsage).toBeDefined();
    });

    test('should return false for non-existent tenant', () => {
      const result = service.checkResourceQuota('invalid-id', 'users');

      expect(result.withinQuota).toBe(false);
      expect(result.reason).toContain('not found');
    });

    test('should handle unknown resource types', () => {
      const result = service.checkResourceQuota(tenantId, 'unknown_resource');

      expect(result.withinQuota).toBe(true);
      expect(result.reason).toContain('not quota-limited');
    });
  });

  describe('Cross-Tenant Access Management', () => {
    let tenantId;

    beforeEach(() => {
      const tenant = service.registerTenant({
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin1'
      });
      tenantId = tenant.tenantId;
    });

    test('should enable cross-tenant access', () => {
      const result = service.enableCrossTenantAccess(tenantId, {
        sharedResourceAccess: true,
        allowedTenants: ['tenant2', 'tenant3']
      });

      expect(result.success).toBe(true);
      expect(result.policy.crossTenantAccess).toBe(true);
      expect(result.policy.sharedResourceAccess).toBe(true);
    });

    test('should throw error for non-existent tenant', () => {
      expect(() => {
        service.enableCrossTenantAccess('invalid-id');
      }).toThrow('Tenant policy not found');
    });
  });

  describe('Tenant Status Management', () => {
    let tenantId;

    beforeEach(() => {
      const tenant = service.registerTenant({
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin1'
      });
      tenantId = tenant.tenantId;
    });

    test('should suspend tenant', () => {
      const result = service.suspendTenant(tenantId, 'Security violation');

      expect(result.success).toBe(true);
      expect(result.status).toBe('SUSPENDED');

      const tenant = service.getTenant(tenantId);
      expect(tenant.status).toBe('SUSPENDED');
      expect(tenant.suspensionReason).toBe('Security violation');
    });

    test('should reactivate suspended tenant', () => {
      service.suspendTenant(tenantId, 'Test suspension');
      const result = service.reactivateTenant(tenantId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('ACTIVE');

      const tenant = service.getTenant(tenantId);
      expect(tenant.status).toBe('ACTIVE');
      expect(tenant.suspensionReason).toBeUndefined();
    });

    test('should throw error when suspending non-existent tenant', () => {
      expect(() => {
        service.suspendTenant('invalid-id', 'Test');
      }).toThrow('Tenant not found');
    });
  });

  describe('Security Settings Management', () => {
    let tenantId;

    beforeEach(() => {
      const tenant = service.registerTenant({
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin1'
      });
      tenantId = tenant.tenantId;
    });

    test('should update security settings', () => {
      const newSettings = {
        sessionTimeout: 60,
        mfaRequired: false
      };

      const result = service.updateSecuritySettings(tenantId, newSettings);

      expect(result.success).toBe(true);
      expect(result.settings.sessionTimeout).toBe(60);
      expect(result.settings.mfaRequired).toBe(false);
    });

    test('should throw error for non-existent tenant', () => {
      expect(() => {
        service.updateSecuritySettings('invalid-id', {});
      }).toThrow('Tenant not found');
    });
  });

  describe('Security Event Logging', () => {
    let tenantId;

    beforeEach(() => {
      const tenant = service.registerTenant({
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin1'
      });
      tenantId = tenant.tenantId;
    });

    test('should log security events', () => {
      service.logSecurityEvent({
        type: 'TEST_EVENT',
        tenantId,
        details: 'Test event details'
      });

      const events = service.getSecurityEvents(tenantId);
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'TEST_EVENT')).toBe(true);
    });

    test('should filter security events by type', () => {
      service.logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        tenantId
      });
      service.logSecurityEvent({
        type: 'LOGIN_FAILURE',
        tenantId
      });

      const events = service.getSecurityEvents(tenantId, {
        eventType: 'LOGIN_SUCCESS'
      });

      expect(events.every(e => e.type === 'LOGIN_SUCCESS')).toBe(true);
    });

    test('should limit number of returned events', () => {
      // Log multiple events
      for (let i = 0; i < 150; i++) {
        service.logSecurityEvent({
          type: 'TEST_EVENT',
          tenantId
        });
      }

      const events = service.getSecurityEvents(tenantId, { limit: 50 });
      expect(events.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Security Reporting', () => {
    let tenantId;

    beforeEach(() => {
      const tenant = service.registerTenant({
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin1'
      });
      tenantId = tenant.tenantId;
    });

    test('should generate security report', () => {
      // Create some security events
      service.validateDataIsolation({
        requestingTenantId: tenantId,
        targetTenantId: 'other-tenant',
        resourceType: 'patient_records'
      });

      const report = service.generateSecurityReport(tenantId);

      expect(report.tenantId).toBe(tenantId);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalEvents).toBeGreaterThan(0);
      expect(report.securitySettings).toBeDefined();
      expect(report.resourceQuota).toBeDefined();
    });

    test('should throw error for non-existent tenant', () => {
      expect(() => {
        service.generateSecurityReport('invalid-id');
      }).toThrow('Tenant not found');
    });
  });

  describe('Tenant Information Retrieval', () => {
    test('should get tenant information without encryption key', () => {
      const tenant = service.registerTenant({
        organizationName: 'Test Hospital',
        organizationType: 'hospital',
        contactEmail: 'admin@test.com',
        adminUserId: 'admin1'
      });

      const tenantInfo = service.getTenant(tenant.tenantId);

      expect(tenantInfo).toBeDefined();
      expect(tenantInfo.organizationName).toBe('Test Hospital');
      expect(tenantInfo.encryptionKey).toBeUndefined(); // Should not expose encryption key
    });

    test('should return null for non-existent tenant', () => {
      const tenantInfo = service.getTenant('invalid-id');
      expect(tenantInfo).toBeNull();
    });

    test('should get all tenants', () => {
      service.registerTenant({
        organizationName: 'Hospital 1',
        organizationType: 'hospital',
        contactEmail: 'admin1@test.com',
        adminUserId: 'admin1'
      });

      service.registerTenant({
        organizationName: 'Hospital 2',
        organizationType: 'hospital',
        contactEmail: 'admin2@test.com',
        adminUserId: 'admin2'
      });

      const tenants = service.getAllTenants();
      expect(tenants.length).toBe(2);
      expect(tenants.every(t => t.encryptionKey === undefined)).toBe(true);
    });
  });
});
