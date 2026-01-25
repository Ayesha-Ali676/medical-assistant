/**
 * FHIR Data Transformation Utilities
 * For physician review only
 */

const { FHIRPatient, FHIRObservation, FHIRMedicationRequest, FHIRBundle } = require('../models/fhir');
const { Patient, ClinicalEncounter } = require('../models/clinical');

class FHIRTransformer {
  /**
   * Transform legacy patient data to FHIR Patient resource
   */
  static legacyPatientToFHIR(legacyPatient) {
    const fhirPatient = new FHIRPatient();
    
    fhirPatient.id = (legacyPatient.id || legacyPatient.patient_id || '').trim() || `patient-${Date.now()}`;
    fhirPatient.active = legacyPatient.active !== false;
    
    // Handle name variations - ensure we have valid names
    let hasValidName = false;
    if (legacyPatient.name && legacyPatient.name.trim()) {
      const nameParts = legacyPatient.name.trim().split(' ').filter(part => part.length > 0);
      if (nameParts.length > 0) {
        const family = nameParts.pop();
        const given = nameParts.length > 0 ? nameParts : ['Unknown'];
        fhirPatient.addName(family, given);
        hasValidName = true;
      }
    } else if (legacyPatient.first_name && legacyPatient.first_name.trim() && 
               legacyPatient.last_name && legacyPatient.last_name.trim()) {
      fhirPatient.addName(legacyPatient.last_name.trim(), [legacyPatient.first_name.trim()]);
      hasValidName = true;
    }
    
    // Ensure we always have a valid name for FHIR compliance
    if (!hasValidName) {
      fhirPatient.addName('Unknown', ['Patient']);
    }
    
    // Handle gender variations
    if (legacyPatient.gender) {
      fhirPatient.gender = legacyPatient.gender.toLowerCase();
    } else if (legacyPatient.sex) {
      const genderMap = { 'M': 'male', 'F': 'female', 'O': 'other', 'U': 'unknown' };
      fhirPatient.gender = genderMap[legacyPatient.sex.toUpperCase()] || 'unknown';
    }
    
    // Handle birth date variations
    if (legacyPatient.birth_date || legacyPatient.birthDate || legacyPatient.dob) {
      const birthDate = legacyPatient.birth_date || legacyPatient.birthDate || legacyPatient.dob;
      fhirPatient.birthDate = new Date(birthDate).toISOString().split('T')[0];
    }
    
    // Handle age to birth date conversion
    if (legacyPatient.age && !fhirPatient.birthDate) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - parseInt(legacyPatient.age);
      fhirPatient.birthDate = `${birthYear}-01-01`;
    }
    
    // Handle identifiers
    if (legacyPatient.mrn) {
      fhirPatient.addIdentifier('http://hospital.example.com/mrn', legacyPatient.mrn, 'usual');
    }
    
    if (legacyPatient.ssn) {
      fhirPatient.addIdentifier('http://hl7.org/fhir/sid/us-ssn', legacyPatient.ssn, 'official');
    }
    
    return fhirPatient;
  }

  /**
   * Transform legacy lab result to FHIR Observation
   */
  static legacyLabToFHIR(legacyLab, patientId) {
    const observation = new FHIRObservation();
    
    observation.id = legacyLab.id || `lab-${Date.now()}`;
    observation.status = legacyLab.status || 'final';
    observation.setSubject(`Patient/${patientId}`);
    
    // Set observation code
    const codeSystem = legacyLab.code_system || 'http://loinc.org';
    const code = legacyLab.code || legacyLab.test_name?.toLowerCase().replace(/\s+/g, '-');
    const display = legacyLab.test_name || legacyLab.name;
    
    observation.setCode(codeSystem, code, display);
    
    // Set value
    if (legacyLab.value !== undefined && legacyLab.unit) {
      observation.setValue(parseFloat(legacyLab.value), legacyLab.unit);
    }
    
    // Set effective date
    if (legacyLab.timestamp || legacyLab.date || legacyLab.collected_at) {
      const effectiveDate = legacyLab.timestamp || legacyLab.date || legacyLab.collected_at;
      observation.effectiveDateTime = new Date(effectiveDate).toISOString();
    }
    
    // Add reference range
    if (legacyLab.reference_range || legacyLab.normal_range) {
      const referenceRange = legacyLab.reference_range || legacyLab.normal_range;
      observation.referenceRange = [{
        text: referenceRange
      }];
    }
    
    // Add interpretation
    if (legacyLab.is_abnormal || legacyLab.abnormal) {
      observation.interpretation = [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: 'A',
          display: 'Abnormal'
        }]
      }];
    }
    
    return observation;
  }

  /**
   * Transform legacy medication to FHIR MedicationRequest
   */
  static legacyMedicationToFHIR(legacyMed, patientId) {
    const medicationRequest = new FHIRMedicationRequest();
    
    medicationRequest.id = legacyMed.id || `med-${Date.now()}`;
    medicationRequest.status = legacyMed.status || 'active';
    medicationRequest.setSubject(`Patient/${patientId}`);
    
    // Set medication
    const medSystem = 'http://www.nlm.nih.gov/research/umls/rxnorm';
    const medCode = legacyMed.rxnorm_code || legacyMed.code || legacyMed.name?.toLowerCase().replace(/\s+/g, '-');
    const medDisplay = legacyMed.name || legacyMed.medication_name;
    
    medicationRequest.setMedication(medSystem, medCode, medDisplay);
    
    // Set authored date
    if (legacyMed.start_date || legacyMed.prescribed_date) {
      const authoredDate = legacyMed.start_date || legacyMed.prescribed_date;
      medicationRequest.authoredOn = new Date(authoredDate).toISOString();
    }
    
    // Add dosage instruction
    const dosageText = `${legacyMed.dosage || legacyMed.dose} ${legacyMed.frequency || ''}`.trim();
    if (dosageText) {
      medicationRequest.addDosage(dosageText);
    }
    
    return medicationRequest;
  }

  /**
   * Create FHIR Bundle from multiple resources
   */
  static createBundle(resources, type = 'collection') {
    const bundle = new FHIRBundle(type);
    
    resources.forEach((resource, index) => {
      const fullUrl = `${resource.resourceType}/${resource.id}`;
      bundle.addEntry(resource, fullUrl);
    });
    
    return bundle;
  }

  /**
   * Transform FHIR Patient to internal Patient model
   */
  static fhirToInternalPatient(fhirPatient, tenantId) {
    const patient = Patient.fromFHIR(fhirPatient);
    patient.tenantId = tenantId;
    return patient;
  }

  /**
   * Validate FHIR resource structure
   */
  static validateFHIRResource(resource) {
    const errors = [];
    
    if (!resource.resourceType) {
      errors.push('ResourceType is required');
    }
    
    if (!resource.id) {
      errors.push('Resource ID is required');
    }
    
    // Resource-specific validation
    switch (resource.resourceType) {
      case 'Patient':
        if (!resource.name || resource.name.length === 0) {
          errors.push('Patient must have at least one name');
        }
        break;
        
      case 'Observation':
        if (!resource.code) {
          errors.push('Observation must have a code');
        }
        if (!resource.subject) {
          errors.push('Observation must have a subject');
        }
        break;
        
      case 'MedicationRequest':
        if (!resource.medicationCodeableConcept && !resource.medicationReference) {
          errors.push('MedicationRequest must have medication');
        }
        if (!resource.subject) {
          errors.push('MedicationRequest must have a subject');
        }
        break;
    }
    
    return errors;
  }

  /**
   * Extract patient demographics from various formats
   */
  static extractDemographics(patientData) {
    const demographics = {
      name: null,
      gender: null,
      birthDate: null,
      age: null,
      identifiers: []
    };
    
    // Extract name
    if (patientData.name) {
      demographics.name = patientData.name;
    } else if (patientData.firstName && patientData.lastName) {
      demographics.name = `${patientData.firstName} ${patientData.lastName}`;
    } else if (patientData.given && patientData.family) {
      demographics.name = `${patientData.given.join(' ')} ${patientData.family}`;
    }
    
    // Extract gender
    demographics.gender = patientData.gender || patientData.sex;
    
    // Extract birth date
    demographics.birthDate = patientData.birthDate || patientData.birth_date || patientData.dob;
    
    // Calculate age if birth date is available
    if (demographics.birthDate) {
      const birth = new Date(demographics.birthDate);
      const today = new Date();
      demographics.age = today.getFullYear() - birth.getFullYear();
      
      if (today.getMonth() < birth.getMonth() || 
          (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        demographics.age--;
      }
    } else if (patientData.age) {
      demographics.age = parseInt(patientData.age);
    }
    
    // Extract identifiers
    if (patientData.mrn) {
      demographics.identifiers.push({
        system: 'http://hospital.example.com/mrn',
        value: patientData.mrn,
        use: 'usual'
      });
    }
    
    if (patientData.ssn) {
      demographics.identifiers.push({
        system: 'http://hl7.org/fhir/sid/us-ssn',
        value: patientData.ssn,
        use: 'official'
      });
    }
    
    return demographics;
  }

  /**
   * Normalize medical terminology codes
   */
  static normalizeTerminology(code, system) {
    const normalizedCode = {
      system: system,
      code: code,
      display: null
    };
    
    // Common terminology mappings
    const terminologyMappings = {
      'http://loinc.org': {
        'hba1c': '4548-4',
        'glucose': '2345-7',
        'creatinine': '2160-0',
        'bp_systolic': '8480-6',
        'bp_diastolic': '8462-4',
        'heart_rate': '8867-4',
        'temperature': '8310-5'
      },
      'http://snomed.info/sct': {
        'diabetes': '73211009',
        'hypertension': '38341003',
        'asthma': '195967001'
      }
    };
    
    if (terminologyMappings[system] && terminologyMappings[system][code.toLowerCase()]) {
      normalizedCode.code = terminologyMappings[system][code.toLowerCase()];
    }
    
    return normalizedCode;
  }
}

module.exports = FHIRTransformer;