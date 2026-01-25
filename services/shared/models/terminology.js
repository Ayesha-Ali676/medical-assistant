/**
 * Medical Terminology Validation and Mapping
 * SNOMED CT, ICD-10, LOINC, RxNorm support
 * For physician review only
 */

class TerminologyValidator {
  constructor() {
    // Common medical terminology patterns
    this.patterns = {
      SNOMED_CT: /^\d{6,18}$/,
      ICD_10_CM: /^[A-Z]\d{2}(\.\d{1,3})?$/,
      LOINC: /^\d{1,5}-\d$/,
      RXNORM: /^\d{1,8}$/,
      CPT: /^\d{5}$/,
      HCPCS: /^[A-Z]\d{4}$/
    };

    // Common code mappings for validation
    this.commonCodes = {
      SNOMED_CT: {
        '73211009': 'Diabetes mellitus',
        '38341003': 'Hypertensive disorder',
        '195967001': 'Asthma',
        '22298006': 'Myocardial infarction',
        '53741008': 'Coronary artery disease',
        '44054006': 'Type 2 diabetes mellitus',
        '46635009': 'Type 1 diabetes mellitus',
        '59621000': 'Essential hypertension'
      },
      ICD_10_CM: {
        'E11': 'Type 2 diabetes mellitus',
        'E10': 'Type 1 diabetes mellitus',
        'I10': 'Essential hypertension',
        'J45': 'Asthma',
        'I21': 'Acute myocardial infarction',
        'I25': 'Chronic ischemic heart disease',
        'N18': 'Chronic kidney disease'
      },
      LOINC: {
        '4548-4': 'Hemoglobin A1c/Hemoglobin.total in Blood',
        '2345-7': 'Glucose [Mass/volume] in Serum or Plasma',
        '2160-0': 'Creatinine [Mass/volume] in Serum or Plasma',
        '8480-6': 'Systolic blood pressure',
        '8462-4': 'Diastolic blood pressure',
        '8867-4': 'Heart rate',
        '8310-5': 'Body temperature'
      },
      RXNORM: {
        '6809': 'Metformin',
        '29046': 'Lisinopril',
        '17767': 'Amlodipine',
        '83367': 'Atorvastatin',
        '1191': 'Aspirin'
      }
    };
  }

  /**
   * Validate a medical code against its terminology system
   */
  validateCode(code, system) {
    if (!code || !system) {
      return {
        valid: false,
        error: 'Code and system are required'
      };
    }

    const systemName = this.getSystemName(system);
    if (!systemName) {
      return {
        valid: false,
        error: 'Unknown terminology system'
      };
    }

    const pattern = this.patterns[systemName];
    if (!pattern) {
      return {
        valid: false,
        error: `No validation pattern for system ${systemName}`
      };
    }

    const isValid = pattern.test(code);
    return {
      valid: isValid,
      system: systemName,
      code: code,
      display: this.getCodeDisplay(code, systemName),
      error: isValid ? null : `Invalid ${systemName} code format`
    };
  }

  /**
   * Get system name from URI
   */
  getSystemName(systemUri) {
    const systemMappings = {
      'http://snomed.info/sct': 'SNOMED_CT',
      'http://hl7.org/fhir/sid/icd-10-cm': 'ICD_10_CM',
      'http://loinc.org': 'LOINC',
      'http://www.nlm.nih.gov/research/umls/rxnorm': 'RXNORM',
      'http://www.ama-assn.org/go/cpt': 'CPT',
      'https://hcpcs.codes': 'HCPCS'
    };

    return systemMappings[systemUri];
  }

  /**
   * Get display name for a code
   */
  getCodeDisplay(code, system) {
    if (this.commonCodes[system] && this.commonCodes[system][code]) {
      return this.commonCodes[system][code];
    }
    return null;
  }

  /**
   * Normalize terminology for consistent storage
   */
  normalizeTerminology(code, system, display = null) {
    const validation = this.validateCode(code, system);
    
    return {
      system: system,
      code: code,
      display: display || validation.display || code,
      valid: validation.valid,
      normalized: validation.valid
    };
  }

  /**
   * Map between different terminology systems
   */
  mapTerminology(sourceCode, sourceSystem, targetSystem) {
    // Common mappings between systems
    const mappings = {
      'SNOMED_CT_to_ICD_10_CM': {
        '73211009': 'E11', // Diabetes mellitus -> Type 2 diabetes
        '38341003': 'I10', // Hypertensive disorder -> Essential hypertension
        '195967001': 'J45' // Asthma -> Asthma
      },
      'ICD_10_CM_to_SNOMED_CT': {
        'E11': '73211009', // Type 2 diabetes -> Diabetes mellitus
        'I10': '38341003', // Essential hypertension -> Hypertensive disorder
        'J45': '195967001' // Asthma -> Asthma
      }
    };

    const sourceSystemName = this.getSystemName(sourceSystem);
    const targetSystemName = this.getSystemName(targetSystem);
    
    if (!sourceSystemName || !targetSystemName) {
      return null;
    }

    const mappingKey = `${sourceSystemName}_to_${targetSystemName}`;
    const mapping = mappings[mappingKey];
    
    if (mapping && mapping[sourceCode]) {
      return {
        code: mapping[sourceCode],
        system: targetSystem,
        display: this.getCodeDisplay(mapping[sourceCode], targetSystemName)
      };
    }

    return null;
  }

  /**
   * Validate clinical concept coding
   */
  validateClinicalCoding(coding) {
    const errors = [];

    if (!coding.system) {
      errors.push('Coding system is required');
    }

    if (!coding.code) {
      errors.push('Coding code is required');
    }

    if (coding.system && coding.code) {
      const validation = this.validateCode(coding.code, coding.system);
      if (!validation.valid) {
        errors.push(validation.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      normalized: errors.length === 0 ? this.normalizeTerminology(coding.code, coding.system, coding.display) : null
    };
  }
}

class ClinicalConcept {
  constructor(system, code, display = null) {
    this.system = system;
    this.code = code;
    this.display = display;
    this.validated = false;
    this.errors = [];
  }

  validate() {
    const validator = new TerminologyValidator();
    const result = validator.validateCode(this.code, this.system);
    
    this.validated = result.valid;
    this.errors = result.valid ? [] : [result.error];
    
    if (result.valid && !this.display) {
      this.display = result.display;
    }

    return this.validated;
  }

  toFHIRCoding() {
    return {
      system: this.system,
      code: this.code,
      display: this.display
    };
  }

  static fromFHIRCoding(coding) {
    return new ClinicalConcept(coding.system, coding.code, coding.display);
  }
}

// Common clinical concepts for quick reference
const CommonConcepts = {
  // Vital Signs (LOINC)
  BLOOD_PRESSURE_SYSTOLIC: new ClinicalConcept('http://loinc.org', '8480-6', 'Systolic blood pressure'),
  BLOOD_PRESSURE_DIASTOLIC: new ClinicalConcept('http://loinc.org', '8462-4', 'Diastolic blood pressure'),
  HEART_RATE: new ClinicalConcept('http://loinc.org', '8867-4', 'Heart rate'),
  BODY_TEMPERATURE: new ClinicalConcept('http://loinc.org', '8310-5', 'Body temperature'),
  OXYGEN_SATURATION: new ClinicalConcept('http://loinc.org', '2708-6', 'Oxygen saturation in Arterial blood'),

  // Lab Values (LOINC)
  HEMOGLOBIN_A1C: new ClinicalConcept('http://loinc.org', '4548-4', 'Hemoglobin A1c/Hemoglobin.total in Blood'),
  GLUCOSE: new ClinicalConcept('http://loinc.org', '2345-7', 'Glucose [Mass/volume] in Serum or Plasma'),
  CREATININE: new ClinicalConcept('http://loinc.org', '2160-0', 'Creatinine [Mass/volume] in Serum or Plasma'),

  // Common Conditions (SNOMED CT)
  DIABETES_MELLITUS: new ClinicalConcept('http://snomed.info/sct', '73211009', 'Diabetes mellitus'),
  HYPERTENSION: new ClinicalConcept('http://snomed.info/sct', '38341003', 'Hypertensive disorder'),
  ASTHMA: new ClinicalConcept('http://snomed.info/sct', '195967001', 'Asthma'),

  // Common Medications (RxNorm)
  METFORMIN: new ClinicalConcept('http://www.nlm.nih.gov/research/umls/rxnorm', '6809', 'Metformin'),
  LISINOPRIL: new ClinicalConcept('http://www.nlm.nih.gov/research/umls/rxnorm', '29046', 'Lisinopril'),
  ASPIRIN: new ClinicalConcept('http://www.nlm.nih.gov/research/umls/rxnorm', '1191', 'Aspirin')
};

module.exports = {
  TerminologyValidator,
  ClinicalConcept,
  CommonConcepts
};