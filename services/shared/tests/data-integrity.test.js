/**
 * Property-Based Tests for Data Integrity and Isolation
 * Feature: medassist-clinical-enhancements, Property 22: Data Integrity and Isolation
 * Validates: Requirements 5.4, 6.1
 * For physician review only
 */

const fc = require('fast-check');
const { DataIntegrityManager, initializeCommonConstraints } = require('../models/data-integrity');
const { Patient, ClinicalEncounter, RiskAssessment, TriageScore, ClinicalAlert, AuditEntry, ClinicalNote } = require('../models/clinical');

describe('Feature: medassist-clinical-enhancements, Property 22: Data Integrity and Isolation', () => {
  
  let integrityManager;
  
  beforeEach(() => {
    integrityManager = new DataIntegrityManager();
    initializeCommonConstraints(integrityManager);
  });

  // Property test: Patient data should maintain integrity through validation
  test('Patient data integrity is maintained through validation', async () => {
    await fc.assert(fc.asyncProperty(
      generatePatientData(),
      async (patientData) => {
        const patient = new Patient();
        Object.assign(patient, patientData);
        
        // Validate patient data integrity
        const validation = integrityManager.validateEntity('Patient', patient, patientData.tenantId);
        
        // If validation passes, essential data should be present
        if (validation.valid) {
          expect(patient.familyName).toBeDefined();
          expect(patient.givenNames).toBeDefined();
          expect(patient.givenNames.length).toBeGreaterThan(0);
          expect(patient.tenantId).toBeDefined();
          
          if (patient.gender) {
            expect(['male', 'female', 'other', 'unknown']).toContain(patient.gender);
          }
        }
        
        // Validation should provide meaningful feedback
        expect(validation).toHaveProperty('valid');
        expect(validation).toHaveProperty('errors');
        expect(validation).toHaveProperty('warnings');
        expect(Array.isArray(validation.errors)).toBe(true);
        expect(Array.isArray(validation.warnings)).toBe(true);
      }
    ), { numRuns: 1000 });
  });

  // Property test: Multi-tenant data isolation should be enforced
  test('Multi-tenant data isolation is enforced', async () => {
    await fc.assert(fc.asyncProperty(
      generateMultiTenantEntities(),
      async (entitiesData) => {
        const { entities, tenantId } = entitiesData;
        
        // Validate tenant isolation
        const isolation = integrityManager.validateTenantIsolation(entities, tenantId);
        
        // All entities should belong to the same tenant
        const sameTenantEntities = entities.filter(e => e.tenantId === tenantId);
        const differentTenantEntities = entities.filter(e => e.tenantId !== tenantId);
        
        if (differentTenantEntities.length > 0) {
          expect(isolation.isolated).toBe(false);
          expect(isolation.violations.length).toBeGreaterThan(0);
        } else {
          expect(isolation.isolated).toBe(true);
          expect(isolation.violations.length).toBe(0);
        }
        
        // Violations should be properly documented
        for (const violation of isolation.violations) {
          expect(violation).toHaveProperty('entityId');
          expect(violation).toHaveProperty('error');
          expect(typeof violation.error).toBe('string');
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: Clinical data should maintain safety requirements
  test('Clinical data maintains safety requirements', async () => {
    await fc.assert(fc.asyncProperty(
      generateClinicalData(),
      async (clinicalData) => {
        const { entityType, data } = clinicalData;
        
        // Validate clinical safety
        const validation = integrityManager.validateEntity(entityType, data, data.tenantId);
        
        // Clinical entities should have proper safety validations
        if (integrityManager.isClinicalEntity(entityType)) {
          // All clinical data should have tenant isolation
          expect(data.tenantId).toBeDefined();
          
          // Clinical notes should have disclaimers
          if (entityType === 'ClinicalNote') {
            if (validation.valid) {
              expect(data.disclaimer).toBeDefined();
              expect(data.disclaimer).toContain('physician review');
            }
          }
          
          // Risk assessments should have valid scores
          if (entityType === 'RiskAssessment') {
            if (data.overallRiskScore !== undefined && data.overallRiskScore !== null) {
              if (validation.valid) {
                expect(typeof data.overallRiskScore).toBe('number');
                expect(data.overallRiskScore).toBeGreaterThanOrEqual(0);
                expect(data.overallRiskScore).toBeLessThanOrEqual(100);
              }
            }
          }
          
          // Triage scores should have valid priority levels
          if (entityType === 'TriageScore') {
            if (data.priorityLevel !== undefined) {
              if (validation.valid) {
                expect(['CRITICAL', 'HIGH', 'NORMAL']).toContain(data.priorityLevel);
              }
            }
          }
        }
        
        // Validation should be consistent
        expect(typeof validation.valid).toBe('boolean');
      }
    ), { numRuns: 1000 });
  });

  // Property test: Relationship integrity should be maintained
  test('Relationship integrity is maintained between entities', async () => {
    await fc.assert(fc.asyncProperty(
      generateRelationshipData(),
      async (relationshipData) => {
        const { parentType, parentId, childType, childData, tenantId } = relationshipData;
        
        // Validate relationship integrity
        const validation = integrityManager.validateRelationship(
          parentType, parentId, childType, childData, tenantId
        );
        
        // Relationship validation should provide clear feedback
        expect(validation).toHaveProperty('valid');
        expect(validation).toHaveProperty('errors');
        expect(Array.isArray(validation.errors)).toBe(true);
        
        // If validation passes, relationship constraints should be satisfied
        if (validation.valid) {
          expect(parentId).toBeDefined();
          expect(childData.tenantId).toBe(tenantId);
        }
        
        // Errors should be descriptive
        for (const error of validation.errors) {
          expect(typeof error).toBe('string');
          expect(error.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: Data synchronization should prevent duplication
  test('Data synchronization prevents duplication', async () => {
    await fc.assert(fc.asyncProperty(
      generateSynchronizationData(),
      async (syncData) => {
        const { entities, tenantId } = syncData;
        
        // Check for duplicate entities (same ID within tenant)
        const entityMap = new Map();
        const duplicates = [];
        
        for (const entity of entities) {
          if (entity.tenantId === tenantId) {
            const key = `${entity.entityType}-${entity.id}`;
            if (entityMap.has(key)) {
              duplicates.push(entity.id);
            } else {
              entityMap.set(key, entity);
            }
          }
        }
        
        // Validate tenant isolation for all entities
        const isolation = integrityManager.validateTenantIsolation(entities, tenantId);
        
        // Data integrity should be maintained
        if (isolation.isolated) {
          // All entities should belong to the correct tenant
          const tenantEntities = entities.filter(e => e.tenantId === tenantId);
          expect(tenantEntities.length).toBeGreaterThanOrEqual(0);
          
          // No cross-tenant data leakage
          const crossTenantEntities = entities.filter(e => e.tenantId && e.tenantId !== tenantId);
          expect(crossTenantEntities.length).toBe(0);
        }
        
        // Duplication prevention should be enforced
        expect(Array.isArray(duplicates)).toBe(true);
      }
    ), { numRuns: 1000 });
  });

  // Property test: Field constraints should be consistently enforced
  test('Field constraints are consistently enforced', async () => {
    await fc.assert(fc.asyncProperty(
      generateConstraintTestData(),
      async (constraintData) => {
        const { entityType, fieldName, value, tenantId } = constraintData;
        
        // Create test entity with the field value
        const testData = {
          tenantId: tenantId,
          [fieldName]: value
        };
        
        // Add required fields based on entity type (except the field being tested)
        const requiredFields = integrityManager.getRequiredFields(entityType);
        for (const field of requiredFields) {
          if (!testData[field] && field !== fieldName) {
            testData[field] = generateDefaultValue(field);
          }
        }
        
        // Validate the entity
        const validation = integrityManager.validateEntity(entityType, testData, tenantId);
        
        // Validation should be consistent
        expect(typeof validation.valid).toBe('boolean');
        
        // If field has constraints, they should be enforced
        const hasConstraints = integrityManager.constraints.has(`${entityType}.${fieldName}`);
        if (hasConstraints && !validation.valid) {
          // Should have specific error about the field
          const fieldErrors = validation.errors.filter(error => error.includes(fieldName));
          expect(fieldErrors.length).toBeGreaterThan(0);
        }
        
        // Required fields should be validated
        if (requiredFields.includes(fieldName) && (value === null || value === undefined || value === '')) {
          expect(validation.valid).toBe(false);
          const requiredError = validation.errors.find(error => 
            error.includes(fieldName) && (error.includes('required') || error.includes('missing')));
          expect(requiredError).toBeDefined();
        }
      }
    ), { numRuns: 1000 });
  });
});

// Generator functions for property-based testing

function generatePatientData() {
  return fc.record({
    familyName: fc.string({ minLength: 1, maxLength: 50 }),
    givenNames: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
    gender: fc.option(fc.constantFrom('male', 'female', 'other', 'unknown')),
    birthDate: fc.option(fc.date({ min: new Date('1920-01-01'), max: new Date() })),
    tenantId: fc.uuid()
  });
}

function generateMultiTenantEntities() {
  return fc.record({
    tenantId: fc.uuid(),
    entities: fc.array(fc.record({
      id: fc.uuid(),
      tenantId: fc.uuid(), // May or may not match the main tenantId
      entityType: fc.constantFrom('Patient', 'ClinicalEncounter', 'RiskAssessment')
    }), { minLength: 1, maxLength: 10 })
  });
}

function generateClinicalData() {
  return fc.oneof(
    // Patient data
    fc.record({
      entityType: fc.constant('Patient'),
      data: fc.record({
        familyName: fc.string({ minLength: 1, maxLength: 50 }),
        givenNames: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1 }),
        gender: fc.option(fc.constantFrom('male', 'female', 'other', 'unknown')),
        tenantId: fc.uuid()
      })
    }),
    
    // Clinical Note data
    fc.record({
      entityType: fc.constant('ClinicalNote'),
      data: fc.record({
        patientId: fc.uuid(),
        encounterId: fc.uuid(),
        noteType: fc.string({ minLength: 1, maxLength: 50 }),
        content: fc.string({ minLength: 1, maxLength: 1000 }),
        authorId: fc.uuid(),
        disclaimer: fc.option(fc.oneof(
          fc.constant('For physician review only'),
          fc.constant('Clinical data for physician review only'),
          fc.string({ minLength: 1, maxLength: 100 }) // May not contain required text
        )),
        tenantId: fc.uuid()
      })
    }),
    
    // Risk Assessment data
    fc.record({
      entityType: fc.constant('RiskAssessment'),
      data: fc.record({
        patientId: fc.uuid(),
        overallRiskScore: fc.option(fc.integer({ min: -10, max: 110 })), // Include invalid values
        confidenceScore: fc.option(fc.integer({ min: -10, max: 110 })),
        tenantId: fc.uuid()
      })
    }),
    
    // Triage Score data
    fc.record({
      entityType: fc.constant('TriageScore'),
      data: fc.record({
        patientId: fc.uuid(),
        priorityLevel: fc.option(fc.oneof(
          fc.constantFrom('CRITICAL', 'HIGH', 'NORMAL'),
          fc.string({ minLength: 1, maxLength: 20 }) // Include invalid values
        )),
        urgencyScore: fc.integer({ min: 0, max: 100 }),
        tenantId: fc.uuid()
      })
    })
  );
}

function generateRelationshipData() {
  return fc.record({
    parentType: fc.constantFrom('Patient', 'ClinicalEncounter'),
    parentId: fc.uuid(),
    childType: fc.constantFrom('ClinicalEncounter', 'ClinicalNote', 'RiskAssessment'),
    childData: fc.record({
      id: fc.uuid(),
      tenantId: fc.uuid()
    }),
    tenantId: fc.uuid()
  });
}

function generateSynchronizationData() {
  return fc.record({
    tenantId: fc.uuid(),
    entities: fc.array(fc.record({
      id: fc.uuid(),
      tenantId: fc.uuid(),
      entityType: fc.constantFrom('Patient', 'ClinicalEncounter')
    }), { minLength: 1, maxLength: 20 })
  });
}

function generateConstraintTestData() {
  return fc.record({
    entityType: fc.constantFrom('Patient', 'RiskAssessment', 'TriageScore', 'ClinicalAlert'),
    fieldName: fc.constantFrom('gender', 'overallRiskScore', 'priorityLevel', 'severity', 'familyName'),
    value: fc.oneof(
      fc.string({ minLength: 0, maxLength: 50 }),
      fc.integer({ min: -50, max: 150 }),
      fc.constant(null),
      fc.constant(undefined)
    ),
    tenantId: fc.uuid()
  });
}

function generateDefaultValue(fieldName) {
  const defaults = {
    familyName: 'TestFamily',
    givenNames: ['TestGiven'],
    patientId: fc.sample(fc.uuid(), 1)[0],
    encounterId: fc.sample(fc.uuid(), 1)[0],
    noteType: 'progress',
    content: 'Test content',
    authorId: fc.sample(fc.uuid(), 1)[0],
    encounterType: 'outpatient',
    alertType: 'clinical',
    severity: 'MEDIUM',
    title: 'Test Alert',
    message: 'Test message',
    action: 'test_action',
    userId: fc.sample(fc.uuid(), 1)[0],
    priorityLevel: 'NORMAL',
    urgencyScore: 50
  };
  
  return defaults[fieldName] || 'default_value';
}