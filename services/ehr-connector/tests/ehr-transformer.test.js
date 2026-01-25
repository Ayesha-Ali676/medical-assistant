/**
 * Unit Tests for EHR Transformer
 * For physician review only
 */

const EHRTransformer = require('../src/services/ehr-transformer');

describe('EHR Transformer', () => {
  let transformer;

  beforeEach(() => {
    transformer = new EHRTransformer();
  });

  describe('transformEpicData', () => {
    test('should transform Epic FHIR patient data correctly', () => {
      const epicData = {
        id: 'epic-123',
        resourceType: 'Patient',
        active: true,
        name: [{
          use: 'official',
          family: 'Smith',
          given: ['John', 'Michael']
        }],
        gender: 'male',
        birthDate: '1980-05-15',
        identifier: [{
          type: {
            coding: [{
              code: 'MR'
            }]
          },
          value: 'MRN-12345'
        }],
        telecom: [
          { system: 'phone', value: '555-1234' },
          { system: 'email', value: 'john@example.com' }
        ],
        address: [{
          line: ['123 Main St', 'Apt 4'],
          city: 'Boston',
          state: 'MA',
          postalCode: '02101',
          country: 'USA'
        }]
      };

      const result = transformer.transformEpicData(epicData);

      expect(result.patientId).toBe('epic-123');
      expect(result.source).toBe('epic');
      expect(result.demographics.firstName).toBe('John');
      expect(result.demographics.lastName).toBe('Smith');
      expect(result.demographics.gender).toBe('male');
      expect(result.demographics.birthDate).toBe('1980-05-15');
      expect(result.demographics.mrn).toBe('MRN-12345');
      expect(result.contact.phone).toBe('555-1234');
      expect(result.contact.email).toBe('john@example.com');
      expect(result.contact.address.city).toBe('Boston');
      expect(result.active).toBe(true);
    });

    test('should handle missing optional fields in Epic data', () => {
      const epicData = {
        id: 'epic-456',
        name: [{
          family: 'Doe',
          given: ['Jane']
        }]
      };

      const result = transformer.transformEpicData(epicData);

      expect(result.patientId).toBe('epic-456');
      expect(result.demographics.firstName).toBe('Jane');
      expect(result.demographics.lastName).toBe('Doe');
      expect(result.demographics.gender).toBe('unknown');
      expect(result.contact.phone).toBeNull();
    });
  });

  describe('transformCernerData', () => {
    test('should transform Cerner patient data correctly', () => {
      const cernerData = {
        patient_id: 'cerner-789',
        first_name: 'Alice',
        last_name: 'Johnson',
        sex: 'F',
        birth_date: '1975-08-20',
        mrn: 'MRN-67890',
        phone_number: '555-5678',
        email_address: 'alice@example.com',
        address: {
          street: '456 Oak Ave',
          city: 'Chicago',
          state: 'IL',
          zip: '60601'
        },
        status: 'active'
      };

      const result = transformer.transformCernerData(cernerData);

      expect(result.patientId).toBe('cerner-789');
      expect(result.source).toBe('cerner');
      expect(result.demographics.firstName).toBe('Alice');
      expect(result.demographics.lastName).toBe('Johnson');
      expect(result.demographics.gender).toBe('female');
      expect(result.demographics.birthDate).toBe('1975-08-20');
      expect(result.demographics.mrn).toBe('MRN-67890');
      expect(result.contact.phone).toBe('555-5678');
      expect(result.contact.address.city).toBe('Chicago');
      expect(result.active).toBe(true);
    });
  });

  describe('transformAllscriptsData', () => {
    test('should transform Allscripts patient data correctly', () => {
      const allscriptsData = {
        PatientID: 'allscripts-111',
        FirstName: 'Bob',
        LastName: 'Williams',
        Gender: 'M',
        DateOfBirth: '1990-03-10',
        MRN: 'MRN-11111',
        PhoneNumber: '555-9999',
        EmailAddress: 'bob@example.com',
        Address: {
          Street: '789 Pine Rd',
          City: 'Seattle',
          State: 'WA',
          ZipCode: '98101'
        },
        Status: 'active'
      };

      const result = transformer.transformAllscriptsData(allscriptsData);

      expect(result.patientId).toBe('allscripts-111');
      expect(result.source).toBe('allscripts');
      expect(result.demographics.firstName).toBe('Bob');
      expect(result.demographics.lastName).toBe('Williams');
      expect(result.demographics.gender).toBe('male');
      expect(result.demographics.birthDate).toBe('1990-03-10');
    });

    test('should parse XML format Allscripts data', () => {
      const xmlData = `
        <Patient>
          <PatientID>allscripts-222</PatientID>
          <FirstName>Carol</FirstName>
          <LastName>Davis</LastName>
          <Gender>F</Gender>
        </Patient>
      `;

      const result = transformer.transformAllscriptsData(xmlData);

      expect(result.patientId).toBe('allscripts-222');
      expect(result.demographics.firstName).toBe('Carol');
      expect(result.demographics.lastName).toBe('Davis');
      expect(result.demographics.gender).toBe('female');
    });
  });

  describe('transformMeditechData', () => {
    test('should transform Meditech patient data correctly', () => {
      const meditechData = {
        pt_id: 'meditech-333',
        pt_first_name: 'David',
        pt_last_name: 'Brown',
        pt_sex: 'M',
        pt_dob: '1985-12-25',
        pt_mrn: 'MRN-33333',
        pt_phone: '555-3333',
        pt_email: 'david@example.com',
        pt_address1: '321 Elm St',
        pt_city: 'Denver',
        pt_state: 'CO',
        pt_zip: '80201',
        pt_status: 'A'
      };

      const result = transformer.transformMeditechData(meditechData);

      expect(result.patientId).toBe('meditech-333');
      expect(result.source).toBe('meditech');
      expect(result.demographics.firstName).toBe('David');
      expect(result.demographics.lastName).toBe('Brown');
      expect(result.demographics.gender).toBe('male');
      expect(result.demographics.birthDate).toBe('1985-12-25');
      expect(result.active).toBe(true);
    });
  });

  describe('transformCustomData', () => {
    test('should transform custom format patient data', () => {
      const customData = {
        id: 'custom-444',
        firstName: 'Emma',
        lastName: 'Wilson',
        gender: 'female',
        birthDate: '1995-07-30',
        mrn: 'MRN-44444',
        phone: '555-4444',
        email: 'emma@example.com',
        address: {
          line1: '654 Maple Dr',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701'
        },
        active: true
      };

      const result = transformer.transformCustomData(customData);

      expect(result.patientId).toBe('custom-444');
      expect(result.source).toBe('custom');
      expect(result.demographics.firstName).toBe('Emma');
      expect(result.demographics.lastName).toBe('Wilson');
      expect(result.demographics.gender).toBe('female');
      expect(result.active).toBe(true);
    });
  });

  describe('normalizeGender', () => {
    test('should normalize various gender formats', () => {
      expect(transformer.normalizeGender('M')).toBe('male');
      expect(transformer.normalizeGender('male')).toBe('male');
      expect(transformer.normalizeGender('F')).toBe('female');
      expect(transformer.normalizeGender('female')).toBe('female');
      expect(transformer.normalizeGender('O')).toBe('other');
      expect(transformer.normalizeGender('U')).toBe('unknown');
      expect(transformer.normalizeGender(null)).toBe('unknown');
      expect(transformer.normalizeGender('invalid')).toBe('unknown');
    });
  });

  describe('transformLabResults', () => {
    test('should transform Epic lab results', () => {
      const epicLabs = {
        entry: [
          {
            resource: {
              id: 'lab-1',
              resourceType: 'Observation',
              status: 'final',
              code: {
                coding: [{
                  code: '2345-7',
                  display: 'Glucose'
                }]
              },
              valueQuantity: {
                value: 95,
                unit: 'mg/dL'
              },
              effectiveDateTime: '2024-01-15T10:00:00Z'
            }
          }
        ]
      };

      const results = transformer.transformLabResults(epicLabs, 'epic');

      expect(results).toHaveLength(1);
      expect(results[0].code).toBe('2345-7');
      expect(results[0].display).toBe('Glucose');
      expect(results[0].value).toBe(95);
      expect(results[0].unit).toBe('mg/dL');
      expect(results[0].source).toBe('epic');
    });

    test('should transform Cerner lab results', () => {
      const cernerLabs = {
        results: [
          {
            result_id: 'lab-2',
            test_code: 'HBA1C',
            test_name: 'Hemoglobin A1c',
            result_value: 6.5,
            result_unit: '%',
            result_status: 'final',
            result_date: '2024-01-15'
          }
        ]
      };

      const results = transformer.transformLabResults(cernerLabs, 'cerner');

      expect(results).toHaveLength(1);
      expect(results[0].code).toBe('HBA1C');
      expect(results[0].display).toBe('Hemoglobin A1c');
      expect(results[0].value).toBe(6.5);
      expect(results[0].unit).toBe('%');
      expect(results[0].source).toBe('cerner');
    });
  });

  describe('transformMedications', () => {
    test('should transform Epic medications', () => {
      const epicMeds = {
        entry: [
          {
            resource: {
              id: 'med-1',
              resourceType: 'MedicationRequest',
              status: 'active',
              medicationCodeableConcept: {
                coding: [{
                  code: '197361',
                  display: 'Metformin 500mg'
                }]
              },
              dosageInstruction: [{
                text: 'Take 1 tablet twice daily'
              }],
              authoredOn: '2024-01-01'
            }
          }
        ]
      };

      const results = transformer.transformMedications(epicMeds, 'epic');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Metformin 500mg');
      expect(results[0].code).toBe('197361');
      expect(results[0].dosage).toBe('Take 1 tablet twice daily');
      expect(results[0].status).toBe('active');
      expect(results[0].source).toBe('epic');
    });

    test('should transform Cerner medications', () => {
      const cernerMeds = {
        medications: [
          {
            medication_id: 'med-2',
            medication_name: 'Lisinopril 10mg',
            medication_code: '104383',
            dosage: '10mg once daily',
            status: 'active',
            start_date: '2024-01-01'
          }
        ]
      };

      const results = transformer.transformMedications(cernerMeds, 'cerner');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Lisinopril 10mg');
      expect(results[0].code).toBe('104383');
      expect(results[0].dosage).toBe('10mg once daily');
      expect(results[0].source).toBe('cerner');
    });
  });

  describe('createDataMapping', () => {
    test('should return correct mapping for Epic', () => {
      const mapping = transformer.createDataMapping('epic');
      
      expect(mapping.patientId).toBe('id');
      expect(mapping.firstName).toBe('name[0].given[0]');
      expect(mapping.lastName).toBe('name[0].family');
    });

    test('should return correct mapping for Cerner', () => {
      const mapping = transformer.createDataMapping('cerner');
      
      expect(mapping.patientId).toBe('patient_id');
      expect(mapping.firstName).toBe('first_name');
      expect(mapping.lastName).toBe('last_name');
    });

    test('should accept custom mapping', () => {
      const customMapping = {
        patientId: 'custom_id',
        firstName: 'custom_first',
        lastName: 'custom_last'
      };

      const mapping = transformer.createDataMapping('custom', customMapping);
      
      expect(mapping.patientId).toBe('custom_id');
      expect(mapping.firstName).toBe('custom_first');
    });
  });

  describe('transformPatientData', () => {
    test('should route to correct transformer based on EHR type', async () => {
      const epicData = {
        id: 'test-123',
        name: [{ family: 'Test', given: ['Patient'] }]
      };

      const result = await transformer.transformPatientData(epicData, 'epic');
      
      expect(result.source).toBe('epic');
      expect(result.patientId).toBe('test-123');
    });

    test('should throw error for unsupported EHR type', async () => {
      await expect(transformer.transformPatientData({}, 'unsupported'))
        .rejects.toThrow('Unsupported EHR type: unsupported');
    });
  });
});
