/**
 * FHIR R4 Compliant Data Models
 * For physician review only
 */

class FHIRResource {
  constructor(resourceType) {
    this.resourceType = resourceType;
    this.id = null;
    this.meta = {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      profile: [`http://hl7.org/fhir/StructureDefinition/${resourceType}`]
    };
  }

  validate() {
    if (!this.resourceType) {
      throw new Error('ResourceType is required');
    }
    return true;
  }
}

class FHIRPatient extends FHIRResource {
  constructor() {
    super('Patient');
    this.identifier = [];
    this.active = true;
    this.name = [];
    this.telecom = [];
    this.gender = null;
    this.birthDate = null;
    this.address = [];
    this.contact = [];
  }

  static fromJSON(data) {
    const patient = new FHIRPatient();
    Object.assign(patient, data);
    return patient;
  }

  addIdentifier(system, value, use = 'usual') {
    this.identifier.push({
      use,
      system,
      value
    });
  }

  addName(family, given, use = 'official') {
    this.name.push({
      use,
      family,
      given: Array.isArray(given) ? given : [given]
    });
  }

  validate() {
    super.validate();
    if (!this.name || this.name.length === 0) {
      throw new Error('Patient must have at least one name');
    }
    if (this.gender && !['male', 'female', 'other', 'unknown'].includes(this.gender)) {
      throw new Error('Invalid gender value');
    }
    return true;
  }
}

class FHIRObservation extends FHIRResource {
  constructor() {
    super('Observation');
    this.status = 'final';
    this.category = [];
    this.code = null;
    this.subject = null;
    this.effectiveDateTime = null;
    this.valueQuantity = null;
    this.component = [];
  }

  static fromJSON(data) {
    const observation = new FHIRObservation();
    Object.assign(observation, data);
    return observation;
  }

  setCode(system, code, display) {
    this.code = {
      coding: [{
        system,
        code,
        display
      }]
    };
  }

  setValue(value, unit, system = 'http://unitsofmeasure.org') {
    this.valueQuantity = {
      value,
      unit,
      system,
      code: unit
    };
  }

  setSubject(reference) {
    this.subject = {
      reference
    };
  }

  validate() {
    super.validate();
    if (!this.status || !['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'].includes(this.status)) {
      throw new Error('Invalid observation status');
    }
    if (!this.code) {
      throw new Error('Observation must have a code');
    }
    if (!this.subject) {
      throw new Error('Observation must have a subject');
    }
    return true;
  }
}

class FHIRMedicationRequest extends FHIRResource {
  constructor() {
    super('MedicationRequest');
    this.status = 'active';
    this.intent = 'order';
    this.medicationCodeableConcept = null;
    this.subject = null;
    this.authoredOn = new Date().toISOString();
    this.requester = null;
    this.dosageInstruction = [];
  }

  static fromJSON(data) {
    const medicationRequest = new FHIRMedicationRequest();
    Object.assign(medicationRequest, data);
    return medicationRequest;
  }

  setMedication(system, code, display) {
    this.medicationCodeableConcept = {
      coding: [{
        system,
        code,
        display
      }]
    };
  }

  setSubject(reference) {
    this.subject = {
      reference
    };
  }

  addDosage(text, route, doseQuantity) {
    this.dosageInstruction.push({
      text,
      route: route ? {
        coding: [{
          system: 'http://snomed.info/sct',
          code: route.code,
          display: route.display
        }]
      } : null,
      doseAndRate: doseQuantity ? [{
        doseQuantity
      }] : null
    });
  }

  validate() {
    super.validate();
    if (!this.medicationCodeableConcept) {
      throw new Error('MedicationRequest must have medication');
    }
    if (!this.subject) {
      throw new Error('MedicationRequest must have a subject');
    }
    return true;
  }
}

class FHIRBundle extends FHIRResource {
  constructor(type = 'collection') {
    super('Bundle');
    this.type = type;
    this.entry = [];
    this.total = 0;
  }

  addEntry(resource, fullUrl = null) {
    const entry = {
      resource
    };
    if (fullUrl) {
      entry.fullUrl = fullUrl;
    }
    this.entry.push(entry);
    this.total = this.entry.length;
  }

  validate() {
    super.validate();
    if (!this.type || !['document', 'message', 'transaction', 'transaction-response', 'batch', 'batch-response', 'history', 'searchset', 'collection'].includes(this.type)) {
      throw new Error('Invalid bundle type');
    }
    return true;
  }
}

module.exports = {
  FHIRResource,
  FHIRPatient,
  FHIRObservation,
  FHIRMedicationRequest,
  FHIRBundle
};