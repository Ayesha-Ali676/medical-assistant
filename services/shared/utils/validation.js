/**
 * FHIR R4 Validation Utilities
 * For physician review only
 */

const { body, param, query, validationResult } = require('express-validator');

// Common FHIR validation rules
const fhirValidation = {
  // FHIR ID validation (alphanumeric, hyphens, periods, up to 64 chars)
  id: () => body('id').optional().matches(/^[A-Za-z0-9\-\.]{1,64}$/),
  
  // FHIR date validation (YYYY, YYYY-MM, or YYYY-MM-DD)
  date: (field) => body(field).optional().matches(/^\d{4}(-\d{2}(-\d{2})?)?$/),
  
  // FHIR datetime validation (ISO 8601)
  dateTime: (field) => body(field).optional().isISO8601(),
  
  // FHIR code validation
  code: (field) => body(field).isString().isLength({ min: 1, max: 64 }),
  
  // FHIR URI validation
  uri: (field) => body(field).optional().isURL(),
  
  // Patient gender validation
  gender: () => body('gender').optional().isIn(['male', 'female', 'other', 'unknown']),
  
  // Observation status validation
  observationStatus: () => body('status').isIn([
    'registered', 'preliminary', 'final', 'amended', 
    'corrected', 'cancelled', 'entered-in-error', 'unknown'
  ]),
  
  // Bundle type validation
  bundleType: () => body('type').isIn([
    'document', 'message', 'transaction', 'transaction-response',
    'batch', 'batch-response', 'history', 'searchset', 'collection'
  ])
};

// Clinical data validation
const clinicalValidation = {
  // Vital signs validation
  bloodPressure: () => body('bloodPressure').matches(/^\d{2,3}\/\d{2,3}$/),
  heartRate: () => body('heartRate').isInt({ min: 30, max: 250 }),
  temperature: () => body('temperature').isFloat({ min: 90, max: 110 }),
  oxygenSaturation: () => body('oxygenSaturation').isInt({ min: 70, max: 100 }),
  
  // Lab values validation
  labValue: () => body('value').isNumeric(),
  labUnit: () => body('unit').isString().isLength({ min: 1, max: 20 }),
  
  // Medication validation
  medicationName: () => body('name').isString().isLength({ min: 1, max: 100 }),
  dosage: () => body('dosage').isString().isLength({ min: 1, max: 50 }),
  frequency: () => body('frequency').isString().isLength({ min: 1, max: 50 }),
  
  // Risk score validation
  riskScore: () => body('score').isInt({ min: 0, max: 100 }),
  riskLevel: () => body('level').isIn(['Low', 'Moderate', 'High', 'Critical']),
  
  // Priority validation
  priority: () => body('priority').isIn(['CRITICAL', 'HIGH', 'NORMAL']),
  
  // Patient ID validation
  patientId: () => param('patientId').matches(/^P-\d{4,}$/)
};

// Medical terminology validation
const terminologyValidation = {
  // SNOMED CT code validation
  snomedCode: (field) => body(field).matches(/^\d{6,18}$/),
  
  // ICD-10 code validation
  icd10Code: (field) => body(field).matches(/^[A-Z]\d{2}(\.\d{1,3})?$/),
  
  // LOINC code validation
  loincCode: (field) => body(field).matches(/^\d{1,5}-\d$/),
  
  // RxNorm code validation
  rxnormCode: (field) => body(field).matches(/^\d{1,8}$/)
};

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      disclaimer: 'For physician review only'
    });
  }
  next();
};

// FHIR resource validation
const validateFHIRResource = (resource) => {
  const errors = [];
  
  if (!resource.resourceType) {
    errors.push('ResourceType is required');
  }
  
  if (resource.id && !/^[A-Za-z0-9\-\.]{1,64}$/.test(resource.id)) {
    errors.push('Invalid FHIR ID format');
  }
  
  return errors;
};

// Clinical safety validation
const clinicalSafetyValidation = {
  // Ensure all clinical outputs have disclaimers
  requireDisclaimer: (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      if (typeof data === 'object' && data !== null) {
        if (!data.disclaimer) {
          data.disclaimer = 'For physician review only';
        }
      }
      originalSend.call(this, data);
    };
    next();
  },
  
  // Validate clinical decision context
  requirePhysicianContext: () => [
    body('physicianId').notEmpty().withMessage('Physician ID is required'),
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('timestamp').isISO8601().withMessage('Valid timestamp is required')
  ]
};

module.exports = {
  fhirValidation,
  clinicalValidation,
  terminologyValidation,
  validateRequest,
  validateFHIRResource,
  clinicalSafetyValidation
};