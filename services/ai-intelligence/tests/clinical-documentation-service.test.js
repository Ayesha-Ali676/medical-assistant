/**
 * Tests for Clinical Documentation Service
 * For physician review only
 */

const ClinicalDocumentationService = require('../src/services/clinical-documentation-service');

describe('Clinical Documentation Service', () => {
  let docService;
  
  beforeEach(() => {
    docService = new ClinicalDocumentationService();
  });

  describe('Clinical Note Generation', () => {
    test('should generate basic clinical note', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Chest pain',
        symptoms: ['chest pain', 'shortness of breath'],
        vitals: {
          bloodPressure: '140/90',
          heartRate: 85,
          temperature: 98.6,
          oxygenSat: 95
        },
        diagnosis: 'Acute coronary syndrome',
        medications: [
          { name: 'Aspirin', dose: '81mg', frequency: 'daily' }
        ]
      };

      const note = await docService.generateClinicalNote(encounterData);

      expect(note).toHaveProperty('noteId');
      expect(note.patientId).toBe('patient-123');
      expect(note.encounterId).toBe('encounter-456');
      expect(note.specialty).toBe('general');
      expect(note.aiGenerated).toBe(true);
      expect(note.reviewStatus).toBe('pending');
      expect(note.disclaimer).toBe('For physician review only');
      expect(note.sections).toBeDefined();
    });

    test('should generate specialty-specific note', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Chest pain',
        diagnosis: 'Myocardial infarction'
      };

      const note = await docService.generateClinicalNote(encounterData, { specialty: 'cardiology' });

      expect(note.specialty).toBe('cardiology');
      expect(note.sections).toHaveProperty('Cardiac History');
      expect(note.sections).toHaveProperty('Cardiovascular Examination');
    });

    test('should include all required sections', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Fever'
      };

      const note = await docService.generateClinicalNote(encounterData);

      expect(note.sections).toHaveProperty('Chief Complaint');
      expect(note.sections).toHaveProperty('History of Present Illness');
      expect(note.sections).toHaveProperty('Assessment');
      expect(note.sections).toHaveProperty('Plan');
    });
  });

  describe('Section Generation', () => {
    test('should generate chief complaint from data', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Severe headache'
      };

      const note = await docService.generateClinicalNote(encounterData);

      expect(note.sections['Chief Complaint'].content).toBe('Severe headache');
      expect(note.sections['Chief Complaint'].confidence).toBeGreaterThan(0.9);
    });

    test('should generate chief complaint from symptoms if not provided', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        symptoms: ['nausea', 'vomiting']
      };

      const note = await docService.generateClinicalNote(encounterData);

      expect(note.sections['Chief Complaint'].content).toContain('nausea');
    });

    test('should generate vital signs section', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Fever',
        vitals: {
          bloodPressure: '120/80',
          heartRate: 72,
          temperature: 101.5,
          respiratoryRate: 16,
          oxygenSat: 98
        }
      };

      const note = await docService.generateClinicalNote(encounterData, { specialty: 'emergency' });

      expect(note.sections['Vital Signs'].content).toContain('120/80');
      expect(note.sections['Vital Signs'].content).toContain('72 bpm');
      expect(note.sections['Vital Signs'].content).toContain('101.5');
    });
  });


  describe('Patient Context Preservation', () => {
    test('should preserve patient context across encounters', async () => {
      const encounter1 = {
        patientId: 'patient-123',
        encounterId: 'encounter-1',
        providerId: 'provider-789',
        chiefComplaint: 'Chest pain',
        diagnosis: 'Angina'
      };

      const encounter2 = {
        patientId: 'patient-123',
        encounterId: 'encounter-2',
        providerId: 'provider-789',
        chiefComplaint: 'Follow-up chest pain'
      };

      const note1 = await docService.generateClinicalNote(encounter1);
      expect(note1.contextPreserved).toBe(false);
      expect(note1.previousEncounters).toBe(0);

      const note2 = await docService.generateClinicalNote(encounter2);
      expect(note2.contextPreserved).toBe(true);
      expect(note2.previousEncounters).toBe(1);
    });

    test('should retrieve patient encounter history', async () => {
      const encounter1 = {
        patientId: 'patient-456',
        encounterId: 'encounter-1',
        providerId: 'provider-789',
        chiefComplaint: 'Diabetes follow-up'
      };

      await docService.generateClinicalNote(encounter1);

      const history = docService.getPatientEncounterHistory('patient-456');

      expect(history.patientId).toBe('patient-456');
      expect(history.encounters).toHaveLength(1);
      expect(history.totalEncounters).toBe(1);
      expect(history.disclaimer).toBe('For physician review only');
    });

    test('should limit encounter history to specified number', async () => {
      const patientId = 'patient-789';

      // Generate 5 encounters
      for (let i = 0; i < 5; i++) {
        await docService.generateClinicalNote({
          patientId,
          encounterId: `encounter-${i}`,
          providerId: 'provider-789',
          chiefComplaint: `Visit ${i}`
        });
      }

      const history = docService.getPatientEncounterHistory(patientId, 3);

      expect(history.encounters).toHaveLength(3);
      expect(history.totalEncounters).toBe(5);
    });

    test('should clear patient context', async () => {
      const encounter = {
        patientId: 'patient-clear',
        encounterId: 'encounter-1',
        providerId: 'provider-789',
        chiefComplaint: 'Test'
      };

      await docService.generateClinicalNote(encounter);
      
      let history = docService.getPatientEncounterHistory('patient-clear');
      expect(history.totalEncounters).toBe(1);

      docService.clearPatientContext('patient-clear');

      history = docService.getPatientEncounterHistory('patient-clear');
      expect(history.totalEncounters).toBe(0);
    });
  });

  describe('Template Management', () => {
    test('should get available templates', () => {
      const templates = docService.getAvailableTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.find(t => t.name === 'general')).toBeDefined();
      expect(templates.find(t => t.name === 'cardiology')).toBeDefined();
      expect(templates.find(t => t.name === 'emergency')).toBeDefined();
    });

    test('should generate note from specific template', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Chest pain',
        cardiacAssessment: 'Stable angina',
        treatmentPlan: 'Continue current medications'
      };

      const note = await docService.generateFromTemplate('cardiology', encounterData);

      expect(note.specialty).toBe('cardiology');
      expect(note.sections).toHaveProperty('Cardiac Assessment');
    });

    test('should throw error for missing required fields', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789'
        // Missing required fields for cardiology template
      };

      await expect(
        docService.generateFromTemplate('cardiology', encounterData)
      ).rejects.toThrow('Required field');
    });

    test('should add custom template', () => {
      const customTemplate = {
        sections: ['Custom Section 1', 'Custom Section 2'],
        requiredFields: ['field1', 'field2']
      };

      const result = docService.addTemplate('custom', customTemplate);

      expect(result.success).toBe(true);
      expect(result.templateName).toBe('custom');
      expect(result.disclaimer).toBe('For physician review only');

      const templates = docService.getAvailableTemplates();
      expect(templates.find(t => t.name === 'custom')).toBeDefined();
    });
  });

  describe('Note Validation', () => {
    test('should validate note completeness', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Chest pain',
        diagnosis: 'Angina',
        medications: [{ name: 'Aspirin', dose: '81mg', frequency: 'daily' }]
      };

      const note = await docService.generateClinicalNote(encounterData);
      const validation = docService.validateNoteCompleteness(note, 'general');

      expect(validation).toHaveProperty('isComplete');
      expect(validation).toHaveProperty('confidence');
      expect(validation.confidence).toBeGreaterThan(0);
      expect(validation.confidence).toBeLessThanOrEqual(1);
    });

    test('should identify missing sections', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789'
        // Minimal data - many sections will be incomplete
      };

      const note = await docService.generateClinicalNote(encounterData);
      const validation = docService.validateNoteCompleteness(note, 'general');

      expect(validation.missingSections.length).toBeGreaterThan(0);
      expect(validation.isComplete).toBe(false);
    });
  });

  describe('Note Amendment', () => {
    test('should create amendment record', async () => {
      const amendments = {
        section: 'Assessment',
        changes: 'Updated diagnosis based on lab results'
      };

      const amendment = await docService.amendClinicalNote(
        'note-123',
        amendments,
        'provider-789'
      );

      expect(amendment).toHaveProperty('amendmentId');
      expect(amendment.originalNoteId).toBe('note-123');
      expect(amendment.amendedBy).toBe('provider-789');
      expect(amendment.disclaimer).toBe('For physician review only');
    });
  });

  describe('Service Statistics', () => {
    test('should return service statistics', async () => {
      // Generate a few notes
      await docService.generateClinicalNote({
        patientId: 'patient-1',
        encounterId: 'encounter-1',
        providerId: 'provider-789',
        chiefComplaint: 'Test 1'
      });

      await docService.generateClinicalNote({
        patientId: 'patient-2',
        encounterId: 'encounter-2',
        providerId: 'provider-789',
        chiefComplaint: 'Test 2'
      });

      const stats = docService.getServiceStats();

      expect(stats.totalPatients).toBe(2);
      expect(stats.availableTemplates).toBeGreaterThan(0);
      expect(stats.templateNames).toContain('general');
      expect(stats.disclaimer).toBe('For physician review only');
    });
  });

  describe('Summary Generation', () => {
    test('should generate note summary', async () => {
      const encounterData = {
        patientId: 'patient-123',
        encounterId: 'encounter-456',
        providerId: 'provider-789',
        chiefComplaint: 'Chest pain',
        diagnosis: 'Acute coronary syndrome'
      };

      const note = await docService.generateClinicalNote(encounterData);

      expect(note.summary).toBeDefined();
      expect(note.summary.length).toBeGreaterThan(0);
      expect(note.summary).toContain('Chest pain');
    });
  });
});
