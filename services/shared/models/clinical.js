/**
 * Clinical Data Models for MedAssist
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');

class Patient {
  constructor() {
    this.id = uuidv4();
    this.fhirId = null;
    this.active = true;
    this.familyName = null;
    this.givenNames = [];
    this.gender = null;
    this.birthDate = null;
    this.phone = null;
    this.email = null;
    this.address = null;
    this.identifiers = [];
    this.tenantId = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static fromFHIR(fhirPatient) {
    const patient = new Patient();
    patient.fhirId = fhirPatient.id;
    patient.active = fhirPatient.active !== false;
    
    if (fhirPatient.name && fhirPatient.name.length > 0) {
      const name = fhirPatient.name.find(n => n.use === 'official') || fhirPatient.name[0];
      patient.familyName = name.family;
      patient.givenNames = name.given || [];
    }
    
    patient.gender = fhirPatient.gender;
    patient.birthDate = fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : null;
    
    if (fhirPatient.telecom) {
      const phone = fhirPatient.telecom.find(t => t.system === 'phone');
      const email = fhirPatient.telecom.find(t => t.system === 'email');
      patient.phone = phone?.value;
      patient.email = email?.value;
    }
    
    patient.address = fhirPatient.address?.[0];
    patient.identifiers = fhirPatient.identifier || [];
    
    return patient;
  }

  toFHIR() {
    const fhirPatient = {
      resourceType: 'Patient',
      id: this.fhirId,
      active: this.active,
      identifier: this.identifiers,
      name: [{
        use: 'official',
        family: this.familyName,
        given: this.givenNames
      }],
      gender: this.gender,
      birthDate: this.birthDate ? this.birthDate.toISOString().split('T')[0] : null,
      telecom: []
    };

    if (this.phone) {
      fhirPatient.telecom.push({
        system: 'phone',
        value: this.phone,
        use: 'home'
      });
    }

    if (this.email) {
      fhirPatient.telecom.push({
        system: 'email',
        value: this.email,
        use: 'home'
      });
    }

    if (this.address) {
      fhirPatient.address = [this.address];
    }

    return fhirPatient;
  }

  validate() {
    const errors = [];
    
    if (!this.familyName) {
      errors.push('Family name is required');
    }
    
    if (!this.givenNames || this.givenNames.length === 0) {
      errors.push('At least one given name is required');
    }
    
    if (this.gender && !['male', 'female', 'other', 'unknown'].includes(this.gender)) {
      errors.push('Invalid gender value');
    }
    
    if (!this.tenantId) {
      errors.push('Tenant ID is required');
    }
    
    return errors;
  }
}

class ClinicalEncounter {
  constructor() {
    this.id = uuidv4();
    this.fhirId = null;
    this.patientId = null;
    this.encounterType = null;
    this.status = 'in-progress';
    this.startTime = new Date();
    this.endTime = null;
    this.providerId = null;
    this.chiefComplaint = null;
    this.tenantId = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static fromFHIR(fhirEncounter) {
    const encounter = new ClinicalEncounter();
    encounter.fhirId = fhirEncounter.id;
    encounter.status = fhirEncounter.status;
    encounter.encounterType = fhirEncounter.type?.[0]?.coding?.[0]?.display;
    encounter.startTime = fhirEncounter.period?.start ? new Date(fhirEncounter.period.start) : new Date();
    encounter.endTime = fhirEncounter.period?.end ? new Date(fhirEncounter.period.end) : null;
    encounter.patientId = fhirEncounter.subject?.reference?.replace('Patient/', '');
    encounter.providerId = fhirEncounter.participant?.[0]?.individual?.reference?.replace('Practitioner/', '');
    
    return encounter;
  }

  validate() {
    const errors = [];
    
    if (!this.patientId) {
      errors.push('Patient ID is required');
    }
    
    if (!this.encounterType) {
      errors.push('Encounter type is required');
    }
    
    if (!this.tenantId) {
      errors.push('Tenant ID is required');
    }
    
    return errors;
  }
}

class RiskAssessment {
  constructor() {
    this.id = uuidv4();
    this.patientId = null;
    this.encounterId = null;
    this.overallRiskScore = 0;
    this.cardiacRisk = {
      level: 'Low',
      score: 0,
      factors: [],
      recommendations: []
    };
    this.respiratoryRisk = {
      level: 'Low',
      score: 0,
      factors: [],
      recommendations: []
    };
    this.infectionRisk = {
      level: 'Low',
      score: 0,
      factors: [],
      recommendations: []
    };
    this.medicationRisk = {
      level: 'Low',
      score: 0,
      interactions: [],
      contraindications: []
    };
    this.confidenceScore = 0;
    this.modelVersion = '1.0.0';
    this.calculatedAt = new Date();
    this.createdBy = null;
    this.tenantId = null;
  }

  calculateOverallRisk() {
    const riskScores = [
      this.cardiacRisk.score,
      this.respiratoryRisk.score,
      this.infectionRisk.score,
      this.medicationRisk.score
    ];
    
    this.overallRiskScore = Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length);
    return this.overallRiskScore;
  }

  setRiskLevel(category, level, score, factors = [], recommendations = []) {
    if (!['cardiac', 'respiratory', 'infection', 'medication'].includes(category)) {
      throw new Error('Invalid risk category');
    }
    
    if (!['Low', 'Moderate', 'High', 'Critical'].includes(level)) {
      throw new Error('Invalid risk level');
    }
    
    const riskCategory = category + 'Risk';
    this[riskCategory].level = level;
    this[riskCategory].score = score;
    this[riskCategory].factors = factors;
    this[riskCategory].recommendations = recommendations;
    
    this.calculateOverallRisk();
  }

  validate() {
    const errors = [];
    
    if (!this.patientId) {
      errors.push('Patient ID is required');
    }
    
    if (this.overallRiskScore < 0 || this.overallRiskScore > 100) {
      errors.push('Overall risk score must be between 0 and 100');
    }
    
    if (this.confidenceScore < 0 || this.confidenceScore > 100) {
      errors.push('Confidence score must be between 0 and 100');
    }
    
    if (!this.tenantId) {
      errors.push('Tenant ID is required');
    }
    
    return errors;
  }
}

class TriageScore {
  constructor() {
    this.id = uuidv4();
    this.patientId = null;
    this.encounterId = null;
    this.priorityLevel = 'NORMAL';
    this.urgencyScore = 0;
    this.factors = [];
    this.explanation = [];
    this.calculatedAt = new Date();
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    this.createdBy = null;
    this.tenantId = null;
  }

  setPriority(level, score, factors = [], explanation = []) {
    if (!['CRITICAL', 'HIGH', 'NORMAL'].includes(level)) {
      throw new Error('Invalid priority level');
    }
    
    if (score < 0 || score > 100) {
      throw new Error('Urgency score must be between 0 and 100');
    }
    
    this.priorityLevel = level;
    this.urgencyScore = score;
    this.factors = factors;
    this.explanation = explanation;
  }

  isExpired() {
    return new Date() > this.expiresAt;
  }

  validate() {
    const errors = [];
    
    if (!this.patientId) {
      errors.push('Patient ID is required');
    }
    
    if (!['CRITICAL', 'HIGH', 'NORMAL'].includes(this.priorityLevel)) {
      errors.push('Invalid priority level');
    }
    
    if (this.urgencyScore < 0 || this.urgencyScore > 100) {
      errors.push('Urgency score must be between 0 and 100');
    }
    
    if (!this.tenantId) {
      errors.push('Tenant ID is required');
    }
    
    return errors;
  }
}

class ClinicalAlert {
  constructor() {
    this.id = uuidv4();
    this.patientId = null;
    this.encounterId = null;
    this.alertType = null;
    this.severity = 'MEDIUM';
    this.title = null;
    this.message = null;
    this.sourceService = null;
    this.acknowledged = false;
    this.acknowledgedBy = null;
    this.acknowledgedAt = null;
    this.createdAt = new Date();
    this.expiresAt = null;
    this.tenantId = null;
  }

  acknowledge(userId) {
    this.acknowledged = true;
    this.acknowledgedBy = userId;
    this.acknowledgedAt = new Date();
  }

  isExpired() {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  validate() {
    const errors = [];
    
    if (!this.patientId) {
      errors.push('Patient ID is required');
    }
    
    if (!this.alertType) {
      errors.push('Alert type is required');
    }
    
    if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(this.severity)) {
      errors.push('Invalid severity level');
    }
    
    if (!this.title) {
      errors.push('Alert title is required');
    }
    
    if (!this.message) {
      errors.push('Alert message is required');
    }
    
    if (!this.tenantId) {
      errors.push('Tenant ID is required');
    }
    
    return errors;
  }
}

class AuditEntry {
  constructor() {
    this.id = uuidv4();
    this.userId = null;
    this.patientId = null;
    this.encounterId = null;
    this.action = null;
    this.resourceType = null;
    this.resourceId = null;
    this.systemRecommendation = null;
    this.physicianDecision = null;
    this.riskLevel = null;
    this.complianceFlags = [];
    this.ipAddress = null;
    this.userAgent = null;
    this.createdAt = new Date();
    this.tenantId = null;
  }

  static createClinicalDecision(userId, patientId, action, systemRecommendation, physicianDecision, riskLevel = null) {
    const audit = new AuditEntry();
    audit.userId = userId;
    audit.patientId = patientId;
    audit.action = action;
    audit.systemRecommendation = systemRecommendation;
    audit.physicianDecision = physicianDecision;
    audit.riskLevel = riskLevel;
    audit.complianceFlags.push('clinical_decision_support');
    
    return audit;
  }

  addComplianceFlag(flag) {
    if (!this.complianceFlags.includes(flag)) {
      this.complianceFlags.push(flag);
    }
  }

  validate() {
    const errors = [];
    
    if (!this.userId) {
      errors.push('User ID is required');
    }
    
    if (!this.action) {
      errors.push('Action is required');
    }
    
    if (!this.tenantId) {
      errors.push('Tenant ID is required');
    }
    
    return errors;
  }
}

class ClinicalNote {
  constructor() {
    this.id = uuidv4();
    this.patientId = null;
    this.encounterId = null;
    this.noteType = null;
    this.content = null;
    this.authorId = null;
    this.aiGenerated = false;
    this.reviewedBy = null;
    this.reviewedAt = null;
    this.disclaimer = 'For physician review only';
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.tenantId = null;
  }

  markAsReviewed(physicianId) {
    this.reviewedBy = physicianId;
    this.reviewedAt = new Date();
    this.updatedAt = new Date();
  }

  validate() {
    const errors = [];
    
    if (!this.patientId) {
      errors.push('Patient ID is required');
    }
    
    if (!this.encounterId) {
      errors.push('Encounter ID is required');
    }
    
    if (!this.noteType) {
      errors.push('Note type is required');
    }
    
    if (!this.content) {
      errors.push('Note content is required');
    }
    
    if (!this.authorId) {
      errors.push('Author ID is required');
    }
    
    if (!this.disclaimer) {
      errors.push('Clinical disclaimer is required');
    }
    
    if (!this.tenantId) {
      errors.push('Tenant ID is required');
    }
    
    return errors;
  }
}

module.exports = {
  Patient,
  ClinicalEncounter,
  RiskAssessment,
  TriageScore,
  ClinicalAlert,
  AuditEntry,
  ClinicalNote
};