/**
 * EHR Data Transformer
 * Transforms data from various legacy EHR formats to standardized internal format
 * For physician review only
 */

const { XMLParser } = require('fast-xml-parser');

class EHRTransformer {
  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  /**
   * Main transformation method - routes to specific transformer based on EHR type
   */
  async transformPatientData(rawData, ehrType) {
    switch (ehrType) {
      case 'epic':
        return this.transformEpicData(rawData);
      case 'cerner':
        return this.transformCernerData(rawData);
      case 'allscripts':
        return this.transformAllscriptsData(rawData);
      case 'meditech':
        return this.transformMeditechData(rawData);
      case 'custom':
        return this.transformCustomData(rawData);
      default:
        throw new Error(`Unsupported EHR type: ${ehrType}`);
    }
  }

  /**
   * Transform Epic EHR data (typically FHIR-compliant)
   */
  transformEpicData(data) {
    // Epic typically uses FHIR R4, so minimal transformation needed
    return {
      patientId: data.id,
      source: 'epic',
      demographics: {
        firstName: data.name?.[0]?.given?.[0] || '',
        lastName: data.name?.[0]?.family || '',
        gender: data.gender || 'unknown',
        birthDate: data.birthDate || null,
        mrn: data.identifier?.find(id => id.type?.coding?.[0]?.code === 'MR')?.value || null
      },
      contact: {
        phone: data.telecom?.find(t => t.system === 'phone')?.value || null,
        email: data.telecom?.find(t => t.system === 'email')?.value || null,
        address: this.formatAddress(data.address?.[0])
      },
      active: data.active !== false,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transform Cerner EHR data
   */
  transformCernerData(data) {
    // Cerner has its own proprietary format
    return {
      patientId: data.patient_id || data.id,
      source: 'cerner',
      demographics: {
        firstName: data.first_name || data.given_name || '',
        lastName: data.last_name || data.family_name || '',
        gender: this.normalizeGender(data.sex || data.gender),
        birthDate: data.birth_date || data.dob || null,
        mrn: data.mrn || data.medical_record_number || null
      },
      contact: {
        phone: data.phone_number || data.contact?.phone || null,
        email: data.email_address || data.contact?.email || null,
        address: this.formatCernerAddress(data.address || data.contact?.address)
      },
      active: data.status === 'active' || data.active === true,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transform Allscripts EHR data (often XML-based)
   */
  transformAllscriptsData(data) {
    // Allscripts often uses XML format
    let parsedData = data;
    
    if (typeof data === 'string') {
      parsedData = this.xmlParser.parse(data);
    }
    
    const patient = parsedData.Patient || parsedData.patient || parsedData;
    
    return {
      patientId: patient.PatientID || patient.ID || patient.id,
      source: 'allscripts',
      demographics: {
        firstName: patient.FirstName || patient.GivenName || '',
        lastName: patient.LastName || patient.FamilyName || '',
        gender: this.normalizeGender(patient.Gender || patient.Sex),
        birthDate: patient.DateOfBirth || patient.BirthDate || null,
        mrn: patient.MRN || patient.MedicalRecordNumber || null
      },
      contact: {
        phone: patient.PhoneNumber || patient.HomePhone || null,
        email: patient.EmailAddress || patient.Email || null,
        address: this.formatAllscriptsAddress(patient.Address)
      },
      active: patient.Status !== 'inactive',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transform Meditech EHR data
   */
  transformMeditechData(data) {
    // Meditech has legacy format with specific field names
    return {
      patientId: data.pt_id || data.patient_id || data.id,
      source: 'meditech',
      demographics: {
        firstName: data.pt_first_name || data.fname || '',
        lastName: data.pt_last_name || data.lname || '',
        gender: this.normalizeGender(data.pt_sex || data.gender),
        birthDate: data.pt_dob || data.birth_date || null,
        mrn: data.pt_mrn || data.mrn || null
      },
      contact: {
        phone: data.pt_phone || data.phone || null,
        email: data.pt_email || data.email || null,
        address: this.formatMeditechAddress(data)
      },
      active: data.pt_status === 'A' || data.status === 'active',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transform custom EHR data (generic transformation)
   */
  transformCustomData(data) {
    return {
      patientId: data.id || data.patientId || data.patient_id,
      source: 'custom',
      demographics: {
        firstName: data.firstName || data.first_name || data.given_name || '',
        lastName: data.lastName || data.last_name || data.family_name || '',
        gender: this.normalizeGender(data.gender || data.sex),
        birthDate: data.birthDate || data.birth_date || data.dob || null,
        mrn: data.mrn || data.medicalRecordNumber || null
      },
      contact: {
        phone: data.phone || data.phoneNumber || data.contact?.phone || null,
        email: data.email || data.emailAddress || data.contact?.email || null,
        address: this.formatGenericAddress(data.address)
      },
      active: data.active !== false && data.status !== 'inactive',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transform lab results from various EHR formats
   */
  transformLabResults(rawData, ehrType) {
    const transformers = {
      epic: this.transformEpicLabs.bind(this),
      cerner: this.transformCernerLabs.bind(this),
      allscripts: this.transformAllscriptsLabs.bind(this),
      meditech: this.transformMeditechLabs.bind(this),
      custom: this.transformCustomLabs.bind(this)
    };
    
    const transformer = transformers[ehrType];
    if (!transformer) {
      throw new Error(`Unsupported EHR type for lab transformation: ${ehrType}`);
    }
    
    return transformer(rawData);
  }

  transformEpicLabs(data) {
    // Epic uses FHIR Observation resources
    return (data.entry || []).map(entry => ({
      id: entry.resource.id,
      code: entry.resource.code?.coding?.[0]?.code,
      display: entry.resource.code?.coding?.[0]?.display,
      value: entry.resource.valueQuantity?.value,
      unit: entry.resource.valueQuantity?.unit,
      status: entry.resource.status,
      effectiveDate: entry.resource.effectiveDateTime,
      source: 'epic'
    }));
  }

  transformCernerLabs(data) {
    return (data.results || data.labs || []).map(lab => ({
      id: lab.result_id || lab.id,
      code: lab.test_code || lab.code,
      display: lab.test_name || lab.name,
      value: lab.result_value || lab.value,
      unit: lab.result_unit || lab.unit,
      status: lab.result_status || 'final',
      effectiveDate: lab.result_date || lab.date,
      source: 'cerner'
    }));
  }

  transformAllscriptsLabs(data) {
    let parsedData = data;
    if (typeof data === 'string') {
      parsedData = this.xmlParser.parse(data);
    }
    
    const labs = parsedData.LabResults?.LabResult || parsedData.labs || [];
    const labArray = Array.isArray(labs) ? labs : [labs];
    
    return labArray.map(lab => ({
      id: lab.ResultID || lab.ID,
      code: lab.TestCode || lab.Code,
      display: lab.TestName || lab.Name,
      value: lab.Value || lab.ResultValue,
      unit: lab.Unit || lab.ResultUnit,
      status: lab.Status || 'final',
      effectiveDate: lab.ResultDate || lab.Date,
      source: 'allscripts'
    }));
  }

  transformMeditechLabs(data) {
    return (data.lab_results || data.results || []).map(lab => ({
      id: lab.lab_id || lab.id,
      code: lab.lab_code || lab.code,
      display: lab.lab_name || lab.name,
      value: lab.lab_value || lab.value,
      unit: lab.lab_unit || lab.unit,
      status: lab.lab_status || 'final',
      effectiveDate: lab.lab_date || lab.date,
      source: 'meditech'
    }));
  }

  transformCustomLabs(data) {
    return (data.labs || data.results || []).map(lab => ({
      id: lab.id,
      code: lab.code || lab.testCode,
      display: lab.name || lab.testName || lab.display,
      value: lab.value || lab.result,
      unit: lab.unit,
      status: lab.status || 'final',
      effectiveDate: lab.date || lab.effectiveDate,
      source: 'custom'
    }));
  }

  /**
   * Transform medications from various EHR formats
   */
  transformMedications(rawData, ehrType) {
    const transformers = {
      epic: this.transformEpicMeds.bind(this),
      cerner: this.transformCernerMeds.bind(this),
      allscripts: this.transformAllscriptsMeds.bind(this),
      meditech: this.transformMeditechMeds.bind(this),
      custom: this.transformCustomMeds.bind(this)
    };
    
    const transformer = transformers[ehrType];
    if (!transformer) {
      throw new Error(`Unsupported EHR type for medication transformation: ${ehrType}`);
    }
    
    return transformer(rawData);
  }

  transformEpicMeds(data) {
    return (data.entry || []).map(entry => ({
      id: entry.resource.id,
      name: entry.resource.medicationCodeableConcept?.coding?.[0]?.display,
      code: entry.resource.medicationCodeableConcept?.coding?.[0]?.code,
      dosage: entry.resource.dosageInstruction?.[0]?.text,
      status: entry.resource.status,
      startDate: entry.resource.authoredOn,
      source: 'epic'
    }));
  }

  transformCernerMeds(data) {
    return (data.medications || data.meds || []).map(med => ({
      id: med.medication_id || med.id,
      name: med.medication_name || med.name,
      code: med.medication_code || med.code,
      dosage: med.dosage || med.dose,
      status: med.status || 'active',
      startDate: med.start_date || med.prescribed_date,
      source: 'cerner'
    }));
  }

  transformAllscriptsMeds(data) {
    let parsedData = data;
    if (typeof data === 'string') {
      parsedData = this.xmlParser.parse(data);
    }
    
    const meds = parsedData.Medications?.Medication || parsedData.medications || [];
    const medArray = Array.isArray(meds) ? meds : [meds];
    
    return medArray.map(med => ({
      id: med.MedicationID || med.ID,
      name: med.MedicationName || med.Name,
      code: med.MedicationCode || med.Code,
      dosage: med.Dosage || med.Dose,
      status: med.Status || 'active',
      startDate: med.StartDate || med.PrescribedDate,
      source: 'allscripts'
    }));
  }

  transformMeditechMeds(data) {
    return (data.medications || data.meds || []).map(med => ({
      id: med.med_id || med.id,
      name: med.med_name || med.name,
      code: med.med_code || med.code,
      dosage: med.med_dosage || med.dosage,
      status: med.med_status || 'active',
      startDate: med.med_start_date || med.start_date,
      source: 'meditech'
    }));
  }

  transformCustomMeds(data) {
    return (data.medications || data.meds || []).map(med => ({
      id: med.id,
      name: med.name || med.medicationName,
      code: med.code || med.medicationCode,
      dosage: med.dosage || med.dose,
      status: med.status || 'active',
      startDate: med.startDate || med.prescribedDate,
      source: 'custom'
    }));
  }

  // Helper methods for address formatting

  formatAddress(address) {
    if (!address) return null;
    
    return {
      line1: address.line?.[0] || null,
      line2: address.line?.[1] || null,
      city: address.city || null,
      state: address.state || null,
      postalCode: address.postalCode || null,
      country: address.country || null
    };
  }

  formatCernerAddress(address) {
    if (!address) return null;
    
    return {
      line1: address.street || address.line1 || null,
      line2: address.line2 || null,
      city: address.city || null,
      state: address.state || null,
      postalCode: address.zip || address.postal_code || null,
      country: address.country || null
    };
  }

  formatAllscriptsAddress(address) {
    if (!address) return null;
    
    return {
      line1: address.Street || address.AddressLine1 || null,
      line2: address.AddressLine2 || null,
      city: address.City || null,
      state: address.State || null,
      postalCode: address.ZipCode || address.PostalCode || null,
      country: address.Country || null
    };
  }

  formatMeditechAddress(data) {
    return {
      line1: data.pt_address1 || data.address1 || null,
      line2: data.pt_address2 || data.address2 || null,
      city: data.pt_city || data.city || null,
      state: data.pt_state || data.state || null,
      postalCode: data.pt_zip || data.zip || null,
      country: data.pt_country || data.country || null
    };
  }

  formatGenericAddress(address) {
    if (!address) return null;
    
    return {
      line1: address.line1 || address.street || address.address1 || null,
      line2: address.line2 || address.address2 || null,
      city: address.city || null,
      state: address.state || null,
      postalCode: address.postalCode || address.zip || address.zipCode || null,
      country: address.country || null
    };
  }

  // Helper method to normalize gender values
  normalizeGender(gender) {
    if (!gender) return 'unknown';
    
    const normalized = gender.toString().toLowerCase();
    const genderMap = {
      'm': 'male',
      'male': 'male',
      'f': 'female',
      'female': 'female',
      'o': 'other',
      'other': 'other',
      'u': 'unknown',
      'unknown': 'unknown'
    };
    
    return genderMap[normalized] || 'unknown';
  }

  /**
   * Create data mapping configuration for a specific EHR system
   */
  createDataMapping(ehrType, customMapping = {}) {
    const defaultMappings = {
      epic: {
        patientId: 'id',
        firstName: 'name[0].given[0]',
        lastName: 'name[0].family',
        gender: 'gender',
        birthDate: 'birthDate'
      },
      cerner: {
        patientId: 'patient_id',
        firstName: 'first_name',
        lastName: 'last_name',
        gender: 'sex',
        birthDate: 'birth_date'
      },
      allscripts: {
        patientId: 'PatientID',
        firstName: 'FirstName',
        lastName: 'LastName',
        gender: 'Gender',
        birthDate: 'DateOfBirth'
      },
      meditech: {
        patientId: 'pt_id',
        firstName: 'pt_first_name',
        lastName: 'pt_last_name',
        gender: 'pt_sex',
        birthDate: 'pt_dob'
      },
      custom: customMapping
    };
    
    return defaultMappings[ehrType] || customMapping;
  }
}

module.exports = EHRTransformer;
