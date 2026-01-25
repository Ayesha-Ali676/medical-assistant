/**
 * Data Integrity and Relationship Management
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');

class DataIntegrityManager {
  constructor() {
    this.constraints = new Map();
    this.relationships = new Map();
    this.validationRules = new Map();
  }

  /**
   * Add data integrity constraint
   */
  addConstraint(entityType, field, constraint) {
    const key = `${entityType}.${field}`;
    if (!this.constraints.has(key)) {
      this.constraints.set(key, []);
    }
    this.constraints.get(key).push(constraint);
  }

  /**
   * Add relationship constraint
   */
  addRelationship(parentType, childType, relationship) {
    const key = `${parentType}->${childType}`;
    this.relationships.set(key, relationship);
  }

  /**
   * Validate entity data integrity
   */
  validateEntity(entityType, data, tenantId) {
    const errors = [];
    const warnings = [];

    // Check required fields
    const requiredFields = this.getRequiredFields(entityType);
    for (const field of requiredFields) {
      if (data[field] === null || data[field] === undefined || 
          (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`Required field '${field}' is missing or empty`);
      }
    }

    // Check field constraints
    for (const [key, constraints] of this.constraints.entries()) {
      const [type, field] = key.split('.');
      if (type === entityType && data[field] !== undefined) {
        for (const constraint of constraints) {
          const result = constraint.validate(data[field]);
          if (!result.valid) {
            errors.push(`Field '${field}': ${result.error}`);
          }
        }
      }
    }

    // Check tenant isolation
    if (!data.tenantId) {
      errors.push('Tenant ID is required for data isolation');
    } else if (tenantId && data.tenantId !== tenantId) {
      errors.push('Tenant ID mismatch - data isolation violation');
    }

    // Check clinical safety requirements
    if (this.isClinicalEntity(entityType)) {
      const clinicalValidation = this.validateClinicalSafety(entityType, data);
      errors.push(...clinicalValidation.errors);
      warnings.push(...clinicalValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate relationship integrity
   */
  validateRelationship(parentType, parentId, childType, childData, tenantId) {
    const errors = [];
    const key = `${parentType}->${childType}`;
    
    if (!this.relationships.has(key)) {
      errors.push(`Relationship ${key} is not defined`);
      return { valid: false, errors };
    }

    const relationship = this.relationships.get(key);

    // Check if parent exists (would need database query in real implementation)
    if (!parentId) {
      errors.push(`Parent ${parentType} ID is required`);
    }

    // Check tenant consistency
    if (childData.tenantId !== tenantId) {
      errors.push('Child entity must belong to the same tenant as parent');
    }

    // Check relationship-specific constraints
    if (relationship.constraints) {
      for (const constraint of relationship.constraints) {
        const result = constraint.validate(parentId, childData);
        if (!result.valid) {
          errors.push(result.error);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get required fields for entity type
   */
  getRequiredFields(entityType) {
    const requiredFields = {
      Patient: ['familyName', 'givenNames', 'tenantId'],
      ClinicalEncounter: ['patientId', 'encounterType', 'tenantId'],
      RiskAssessment: ['patientId', 'tenantId'],
      TriageScore: ['patientId', 'priorityLevel', 'urgencyScore', 'tenantId'],
      ClinicalAlert: ['patientId', 'alertType', 'title', 'message', 'tenantId'], // severity is not required, has default
      AuditEntry: ['userId', 'action', 'tenantId'],
      ClinicalNote: ['patientId', 'encounterId', 'noteType', 'content', 'authorId', 'tenantId']
    };

    return requiredFields[entityType] || [];
  }

  /**
   * Check if entity type is clinical
   */
  isClinicalEntity(entityType) {
    const clinicalEntities = [
      'Patient', 'ClinicalEncounter', 'RiskAssessment', 
      'TriageScore', 'ClinicalAlert', 'ClinicalNote'
    ];
    return clinicalEntities.includes(entityType);
  }

  /**
   * Validate clinical safety requirements
   */
  validateClinicalSafety(entityType, data) {
    const errors = [];
    const warnings = [];

    // All clinical entities must have disclaimers
    if (entityType === 'ClinicalNote') {
      if (!data.disclaimer || typeof data.disclaimer !== 'string' || data.disclaimer.trim() === '') {
        errors.push('Clinical notes must include disclaimer: "For physician review only"');
      } else if (!data.disclaimer.toLowerCase().includes('physician review')) {
        errors.push('Clinical note disclaimer must contain "physician review"');
      }
    }

    // Risk assessments must have valid scores
    if (entityType === 'RiskAssessment') {
      if (data.overallRiskScore < 0 || data.overallRiskScore > 100) {
        errors.push('Risk scores must be between 0 and 100');
      }
      if (data.confidenceScore < 0 || data.confidenceScore > 100) {
        errors.push('Confidence scores must be between 0 and 100');
      }
    }

    // Triage scores must have valid priority levels
    if (entityType === 'TriageScore') {
      if (!['CRITICAL', 'HIGH', 'NORMAL'].includes(data.priorityLevel)) {
        errors.push('Invalid priority level');
      }
      if (data.urgencyScore < 0 || data.urgencyScore > 100) {
        errors.push('Urgency scores must be between 0 and 100');
      }
    }

    // Clinical alerts must have valid severity
    if (entityType === 'ClinicalAlert') {
      if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(data.severity)) {
        errors.push('Invalid alert severity level');
      }
    }

    // AI-generated content must be marked
    if (data.aiGenerated === true && !data.reviewedBy) {
      warnings.push('AI-generated content should be reviewed by a physician');
    }

    return { errors, warnings };
  }

  /**
   * Ensure multi-tenant data isolation
   */
  validateTenantIsolation(entities, tenantId) {
    const violations = [];

    for (const entity of entities) {
      if (!entity.tenantId) {
        violations.push({
          entityId: entity.id,
          error: 'Missing tenant ID'
        });
      } else if (entity.tenantId !== tenantId) {
        violations.push({
          entityId: entity.id,
          error: 'Tenant ID mismatch'
        });
      }
    }

    return {
      isolated: violations.length === 0,
      violations
    };
  }
}

// Constraint classes
class FieldConstraint {
  constructor(name, validator, errorMessage) {
    this.name = name;
    this.validator = validator;
    this.errorMessage = errorMessage;
  }

  validate(value) {
    const isValid = this.validator(value);
    return {
      valid: isValid,
      error: isValid ? null : this.errorMessage
    };
  }
}

class RangeConstraint extends FieldConstraint {
  constructor(min, max, fieldName) {
    super(
      'range',
      (value) => value >= min && value <= max,
      `${fieldName} must be between ${min} and ${max}`
    );
  }
}

class EnumConstraint extends FieldConstraint {
  constructor(allowedValues, fieldName) {
    super(
      'enum',
      (value) => allowedValues.includes(value),
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
}

class RegexConstraint extends FieldConstraint {
  constructor(pattern, fieldName, description) {
    super(
      'regex',
      (value) => pattern.test(value),
      `${fieldName} ${description}`
    );
  }
}

// Relationship classes
class Relationship {
  constructor(type, constraints = []) {
    this.type = type; // 'one-to-many', 'many-to-one', 'one-to-one'
    this.constraints = constraints;
  }
}

class CascadeConstraint {
  constructor(action) {
    this.action = action; // 'delete', 'restrict', 'set-null'
  }

  validate(parentId, childData) {
    // Implementation would depend on the specific action
    return { valid: true };
  }
}

// Initialize common constraints
function initializeCommonConstraints(integrityManager) {
  // Patient constraints
  integrityManager.addConstraint('Patient', 'gender', 
    new EnumConstraint(['male', 'female', 'other', 'unknown'], 'gender'));

  // Risk assessment constraints
  integrityManager.addConstraint('RiskAssessment', 'overallRiskScore', 
    new RangeConstraint(0, 100, 'overall risk score'));
  integrityManager.addConstraint('RiskAssessment', 'confidenceScore', 
    new RangeConstraint(0, 100, 'confidence score'));

  // Triage score constraints
  integrityManager.addConstraint('TriageScore', 'priorityLevel', 
    new EnumConstraint(['CRITICAL', 'HIGH', 'NORMAL'], 'priority level'));
  integrityManager.addConstraint('TriageScore', 'urgencyScore', 
    new RangeConstraint(0, 100, 'urgency score'));

  // Clinical alert constraints
  integrityManager.addConstraint('ClinicalAlert', 'severity', 
    new EnumConstraint(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], 'severity'));

  // Common relationships
  integrityManager.addRelationship('Patient', 'ClinicalEncounter', 
    new Relationship('one-to-many', [new CascadeConstraint('restrict')]));
  integrityManager.addRelationship('ClinicalEncounter', 'ClinicalNote', 
    new Relationship('one-to-many', [new CascadeConstraint('delete')]));
  integrityManager.addRelationship('Patient', 'RiskAssessment', 
    new Relationship('one-to-many', [new CascadeConstraint('delete')]));
}

module.exports = {
  DataIntegrityManager,
  FieldConstraint,
  RangeConstraint,
  EnumConstraint,
  RegexConstraint,
  Relationship,
  CascadeConstraint,
  initializeCommonConstraints
};