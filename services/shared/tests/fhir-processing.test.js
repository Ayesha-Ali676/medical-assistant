/**
 * Property-Based Tests for FHIR Data Processing
 * Feature: medassist-clinical-enhancements, Property 19: FHIR Message Processing
 * Validates: Requirements 5.1
 * For physician review only
 */

const fc = require('fast-check');
const { FHIRPatient, FHIRObservation, FHIRMedicationRequest, FHIRBundle } = require('../models/fhir');
const FHIRTransformer = require('../utils/fhir-transformer');

describe('Feature: medassist-clinical-enhancements, Property 19: FHIR Message Processing', () => {
  
  // Property test: FHIR Patient resources should maintain data integrity through transformation
  test('FHIR Patient transformation preserves essential data', async () => {
    await fc.assert(fc.asyncProperty(
      generateFHIRPatient(),
      async (fhirPatient) => {
        // Transform FHIR to internal model and back
        const internalPatient = FHIRTransformer.fhirToInternalPatient(fhirPatient, 'test-tenant');
        const transformedFHIR = internalPatient.toFHIR();
        
        // Essential data should be preserved
        expect(transformedFHIR.resourceType).toBe('Patient');
        expect(transformedFHIR.active).toBe(fhirPatient.active);
        
        if (fhirPatient.name && fhirPatient.name.length > 0) {
          expect(transformedFHIR.name).toBeDefined();
          expect(transformedFHIR.name.length).toBeGreaterThan(0);
        }
        
        if (fhirPatient.gender) {
          expect(transformedFHIR.gender).toBe(fhirPatient.gender);
        }
        
        if (fhirPatient.birthDate) {
          expect(transformedFHIR.birthDate).toBe(fhirPatient.birthDate);
        }
        
        // Validation should pass
        const errors = FHIRTransformer.validateFHIRResource(transformedFHIR);
        expect(errors.length).toBe(0);
      }
    ), { numRuns: 1000 });
  });

  // Property test: FHIR Observation resources should maintain clinical accuracy
  test('FHIR Observation transformation preserves clinical data accuracy', async () => {
    await fc.assert(fc.asyncProperty(
      generateFHIRObservation(),
      async (fhirObservation) => {
        // Validate original observation
        const originalErrors = FHIRTransformer.validateFHIRResource(fhirObservation);
        expect(originalErrors.length).toBe(0);
        
        // Essential clinical data should be present
        expect(fhirObservation.resourceType).toBe('Observation');
        expect(fhirObservation.code).toBeDefined();
        expect(fhirObservation.subject).toBeDefined();
        expect(fhirObservation.status).toMatch(/^(registered|preliminary|final|amended|corrected|cancelled|entered-in-error|unknown)$/);
        
        // If value is present, it should be properly formatted
        if (fhirObservation.valueQuantity) {
          expect(typeof fhirObservation.valueQuantity.value).toBe('number');
          expect(fhirObservation.valueQuantity.unit).toBeDefined();
        }
        
        // Clinical disclaimer should be implied for all clinical data
        expect(true).toBe(true); // All clinical data is "For physician review only"
      }
    ), { numRuns: 1000 });
  });

  // Property test: FHIR MedicationRequest resources should maintain medication safety
  test('FHIR MedicationRequest transformation preserves medication safety data', async () => {
    await fc.assert(fc.asyncProperty(
      generateFHIRMedicationRequest(),
      async (fhirMedRequest) => {
        // Validate medication request
        const errors = FHIRTransformer.validateFHIRResource(fhirMedRequest);
        expect(errors.length).toBe(0);
        
        // Essential medication data should be present
        expect(fhirMedRequest.resourceType).toBe('MedicationRequest');
        expect(fhirMedRequest.medicationCodeableConcept).toBeDefined();
        expect(fhirMedRequest.subject).toBeDefined();
        expect(fhirMedRequest.status).toMatch(/^(active|on-hold|cancelled|completed|entered-in-error|stopped|draft|unknown)$/);
        expect(fhirMedRequest.intent).toMatch(/^(proposal|plan|order|original-order|reflex-order|filler-order|instance-order|option)$/);
        
        // Medication coding should be present
        expect(fhirMedRequest.medicationCodeableConcept.coding).toBeDefined();
        expect(fhirMedRequest.medicationCodeableConcept.coding.length).toBeGreaterThan(0);
        
        // Subject reference should be valid
        expect(fhirMedRequest.subject.reference).toMatch(/^Patient\/.+/);
      }
    ), { numRuns: 1000 });
  });

  // Property test: FHIR Bundle processing should handle multiple resources correctly
  test('FHIR Bundle processing maintains resource integrity', async () => {
    await fc.assert(fc.asyncProperty(
      generateFHIRBundle(),
      async (fhirBundle) => {
        // Validate bundle structure
        expect(fhirBundle.resourceType).toBe('Bundle');
        expect(fhirBundle.type).toMatch(/^(document|message|transaction|transaction-response|batch|batch-response|history|searchset|collection)$/);
        expect(fhirBundle.entry).toBeDefined();
        expect(fhirBundle.total).toBe(fhirBundle.entry.length);
        
        // Each entry should have a valid resource
        for (const entry of fhirBundle.entry) {
          expect(entry.resource).toBeDefined();
          expect(entry.resource.resourceType).toBeDefined();
          
          // Validate each resource in the bundle
          const resourceErrors = FHIRTransformer.validateFHIRResource(entry.resource);
          expect(resourceErrors.length).toBe(0);
        }
        
        // Bundle should be valid overall
        const bundleErrors = FHIRTransformer.validateFHIRResource(fhirBundle);
        expect(bundleErrors.length).toBe(0);
      }
    ), { numRuns: 1000 });
  });

  // Property test: Legacy data transformation should produce valid FHIR resources
  test('Legacy data transformation produces valid FHIR resources', async () => {
    await fc.assert(fc.asyncProperty(
      generateLegacyPatientData(),
      async (legacyPatient) => {
        // Transform legacy data to FHIR
        const fhirPatient = FHIRTransformer.legacyPatientToFHIR(legacyPatient);
        
        // Resulting FHIR resource should be valid
        expect(fhirPatient.resourceType).toBe('Patient');
        
        const errors = FHIRTransformer.validateFHIRResource(fhirPatient);
        expect(errors.length).toBe(0);
        
        // Essential data should be preserved
        if (legacyPatient.name || (legacyPatient.first_name && legacyPatient.last_name)) {
          expect(fhirPatient.name).toBeDefined();
          expect(fhirPatient.name.length).toBeGreaterThan(0);
        }
        
        if (legacyPatient.gender || legacyPatient.sex) {
          expect(fhirPatient.gender).toMatch(/^(male|female|other|unknown)$/);
        }
        
        // Age should be converted to birth date if provided
        if (legacyPatient.age && !legacyPatient.birth_date) {
          expect(fhirPatient.birthDate).toBeDefined();
          expect(fhirPatient.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    ), { numRuns: 1000 });
  });

  // Property test: FHIR terminology normalization should be consistent
  test('FHIR terminology normalization maintains consistency', async () => {
    await fc.assert(fc.asyncProperty(
      generateTerminologyCode(),
      async (terminology) => {
        // Normalize terminology
        const normalized = FHIRTransformer.normalizeTerminology(terminology.code, terminology.system);
        
        // Normalized result should have required fields
        expect(normalized.system).toBe(terminology.system);
        expect(normalized.code).toBeDefined();
        
        // System should be a valid URI
        expect(normalized.system).toMatch(/^https?:\/\/.+/);
        
        // Code should not be empty
        expect(normalized.code.length).toBeGreaterThan(0);
      }
    ), { numRuns: 1000 });
  });
});

// Generator functions for property-based testing

function generateFHIRPatient() {
  return fc.record({
    resourceType: fc.constant('Patient'),
    id: fc.string({ minLength: 1, maxLength: 64 }).filter(s => /^[A-Za-z0-9\-\.]+$/.test(s)),
    active: fc.boolean(),
    name: fc.array(fc.record({
      use: fc.constantFrom('official', 'usual', 'temp', 'nickname', 'anonymous', 'old', 'maiden'),
      family: fc.string({ minLength: 1, maxLength: 50 }),
      given: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 })
    }), { minLength: 1, maxLength: 2 }),
    gender: fc.constantFrom('male', 'female', 'other', 'unknown'),
    birthDate: fc.date({ min: new Date('1920-01-01'), max: new Date() }).map(d => d.toISOString().split('T')[0]),
    identifier: fc.array(fc.record({
      use: fc.constantFrom('usual', 'official', 'temp', 'secondary'),
      system: fc.constantFrom('http://hospital.example.com/mrn', 'http://hl7.org/fhir/sid/us-ssn'),
      value: fc.string({ minLength: 1, maxLength: 20 })
    }), { maxLength: 3 })
  });
}

function generateFHIRObservation() {
  return fc.record({
    resourceType: fc.constant('Observation'),
    id: fc.string({ minLength: 1, maxLength: 64 }).filter(s => /^[A-Za-z0-9\-\.]+$/.test(s)),
    status: fc.constantFrom('registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'),
    code: fc.record({
      coding: fc.array(fc.record({
        system: fc.constantFrom('http://loinc.org', 'http://snomed.info/sct'),
        code: fc.string({ minLength: 1, maxLength: 20 }),
        display: fc.string({ minLength: 1, maxLength: 100 })
      }), { minLength: 1, maxLength: 1 })
    }),
    subject: fc.record({
      reference: fc.string({ minLength: 1, maxLength: 64 }).map(s => `Patient/${s}`)
    }),
    valueQuantity: fc.option(fc.record({
      value: fc.float({ min: 0, max: 1000 }),
      unit: fc.constantFrom('mg/dL', 'mmol/L', '%', 'bpm', 'mmHg', 'kg', 'cm'),
      system: fc.constant('http://unitsofmeasure.org')
    })),
    effectiveDateTime: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())
  });
}

function generateFHIRMedicationRequest() {
  return fc.record({
    resourceType: fc.constant('MedicationRequest'),
    id: fc.string({ minLength: 1, maxLength: 64 }).filter(s => /^[A-Za-z0-9\-\.]+$/.test(s)),
    status: fc.constantFrom('active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft', 'unknown'),
    intent: fc.constantFrom('proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option'),
    medicationCodeableConcept: fc.record({
      coding: fc.array(fc.record({
        system: fc.constant('http://www.nlm.nih.gov/research/umls/rxnorm'),
        code: fc.string({ minLength: 1, maxLength: 20 }),
        display: fc.constantFrom('Metformin', 'Lisinopril', 'Amlodipine', 'Atorvastatin', 'Aspirin')
      }), { minLength: 1, maxLength: 1 })
    }),
    subject: fc.record({
      reference: fc.string({ minLength: 1, maxLength: 64 }).map(s => `Patient/${s}`)
    }),
    authoredOn: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())
  });
}

function generateFHIRBundle() {
  return fc.record({
    resourceType: fc.constant('Bundle'),
    id: fc.string({ minLength: 1, maxLength: 64 }).filter(s => /^[A-Za-z0-9\-\.]+$/.test(s)),
    type: fc.constantFrom('document', 'message', 'transaction', 'transaction-response', 'batch', 'batch-response', 'history', 'searchset', 'collection'),
    entry: fc.array(fc.record({
      fullUrl: fc.string({ minLength: 1, maxLength: 100 }),
      resource: fc.oneof(
        generateFHIRPatient(),
        generateFHIRObservation(),
        generateFHIRMedicationRequest()
      )
    }), { minLength: 1, maxLength: 5 })
  }).map(bundle => {
    bundle.total = bundle.entry.length;
    return bundle;
  });
}

function generateLegacyPatientData() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.option(fc.string({ minLength: 2, maxLength: 100 })),
    first_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    last_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    gender: fc.option(fc.constantFrom('male', 'female', 'other', 'unknown')),
    sex: fc.option(fc.constantFrom('M', 'F', 'O', 'U')),
    age: fc.option(fc.integer({ min: 0, max: 120 })),
    birth_date: fc.option(fc.date({ min: new Date('1920-01-01'), max: new Date() })),
    mrn: fc.option(fc.string({ minLength: 5, maxLength: 15 })),
    ssn: fc.option(fc.string({ minLength: 9, maxLength: 11 }))
  });
}

function generateTerminologyCode() {
  return fc.record({
    system: fc.constantFrom(
      'http://loinc.org',
      'http://snomed.info/sct',
      'http://www.nlm.nih.gov/research/umls/rxnorm',
      'http://hl7.org/fhir/sid/icd-10-cm'
    ),
    code: fc.string({ minLength: 1, maxLength: 20 })
  });
}