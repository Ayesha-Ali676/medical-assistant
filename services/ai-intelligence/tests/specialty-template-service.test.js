/**
 * Unit Tests for Specialty Template Service
 */

const SpecialtyTemplateService = require('../src/services/specialty-template-service');

describe('Specialty Template Service', () => {
  let service;

  beforeEach(() => {
    service = new SpecialtyTemplateService();
  });

  describe('Template Initialization', () => {
    test('should initialize with default templates', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.availableSpecialties).toBeGreaterThan(0);
    });

    test('should have templates for multiple specialties', () => {
      const specialties = service.getAvailableSpecialties();
      
      expect(specialties.length).toBeGreaterThan(0);
      expect(specialties).toContain('cardiology');
      expect(specialties).toContain('emergency_medicine');
    });
  });

  describe('Template Retrieval', () => {
    test('should get template by ID', () => {
      const template = service.getTemplate('cardio-chest-pain');
      
      expect(template).toBeDefined();
      expect(template.templateId).toBe('cardio-chest-pain');
      expect(template.specialty).toBe('cardiology');
      expect(template.sections).toBeDefined();
      expect(template.disclaimer).toContain('For physician review only');
    });

    test('should return null for non-existent template', () => {
      const template = service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    test('should track usage when getting template', () => {
      service.getTemplate('cardio-chest-pain');
      service.getTemplate('cardio-chest-pain');
      
      const stats = service.getUsageStatistics('cardio-chest-pain');
      expect(stats.timesUsed).toBe(2);
      expect(stats.lastUsed).toBeDefined();
    });
  });

  describe('Template Filtering', () => {
    test('should get templates by specialty', () => {
      const templates = service.getTemplatesBySpecialty('cardiology');
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].templateId).toBeDefined();
      expect(templates[0].name).toBeDefined();
      expect(templates[0].scenario).toBeDefined();
    });

    test('should return empty array for non-existent specialty', () => {
      const templates = service.getTemplatesBySpecialty('non_existent');
      expect(templates.length).toBe(0);
    });

    test('should get templates by scenario', () => {
      const templates = service.getTemplatesByScenario('chest_pain_evaluation');
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].specialty).toBeDefined();
    });
  });

  describe('Template Search', () => {
    test('should search templates by name', () => {
      const results = service.searchTemplates('chest pain');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBeDefined();
    });

    test('should search templates by specialty', () => {
      const results = service.searchTemplates('cardiology');
      
      expect(results.length).toBeGreaterThan(0);
    });

    test('should be case-insensitive', () => {
      const results1 = service.searchTemplates('CARDIOLOGY');
      const results2 = service.searchTemplates('cardiology');
      
      expect(results1.length).toBe(results2.length);
    });

    test('should return empty array for non-matching search', () => {
      const results = service.searchTemplates('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('Documentation Generation', () => {
    test('should generate documentation from template', () => {
      const data = {
        onset: 'sudden',
        duration: '2 hours',
        character: 'crushing',
        location: 'substernal',
        severity: '8/10'
      };

      const doc = service.generateDocumentation('cardio-chest-pain', data);
      
      expect(doc.templateId).toBe('cardio-chest-pain');
      expect(doc.sections).toBeDefined();
      expect(doc.sections.length).toBeGreaterThan(0);
      expect(doc.generatedAt).toBeDefined();
      expect(doc.disclaimer).toContain('For physician review only');
    });

    test('should populate fields with provided data', () => {
      const data = {
        onset: 'sudden',
        duration: '2 hours'
      };

      const doc = service.generateDocumentation('cardio-chest-pain', data);
      
      const chiefComplaintSection = doc.sections.find(s => s.name === 'Chief Complaint');
      expect(chiefComplaintSection).toBeDefined();
      
      const onsetField = chiefComplaintSection.fields.find(f => f.name === 'onset');
      expect(onsetField.value).toBe('sudden');
    });

    test('should leave fields empty when data not provided', () => {
      const doc = service.generateDocumentation('cardio-chest-pain', {});
      
      const chiefComplaintSection = doc.sections.find(s => s.name === 'Chief Complaint');
      const onsetField = chiefComplaintSection.fields.find(f => f.name === 'onset');
      
      expect(onsetField.value).toBe('');
    });

    test('should throw error for non-existent template', () => {
      expect(() => {
        service.generateDocumentation('non-existent', {});
      }).toThrow('Template not found');
    });

    test('should track usage when generating documentation', () => {
      service.generateDocumentation('cardio-chest-pain', {});
      
      const stats = service.getUsageStatistics('cardio-chest-pain');
      expect(stats.timesUsed).toBeGreaterThan(0);
    });
  });

  describe('Template Customization', () => {
    test('should customize template name', () => {
      const customized = service.customizeTemplate('cardio-chest-pain', {
        name: 'Custom Chest Pain Template'
      });
      
      expect(customized.name).toBe('Custom Chest Pain Template');
      expect(customized.customized).toBe(true);
      expect(customized.baseTemplate).toBe('cardio-chest-pain');
    });

    test('should add sections to template', () => {
      const originalTemplate = service.getTemplate('cardio-chest-pain');
      const originalSectionCount = originalTemplate.sections.length;

      const customized = service.customizeTemplate('cardio-chest-pain', {
        addSections: [
          {
            name: 'Additional Notes',
            fields: ['notes']
          }
        ]
      });
      
      expect(customized.sections.length).toBe(originalSectionCount + 1);
    });

    test('should remove sections from template', () => {
      const customized = service.customizeTemplate('cardio-chest-pain', {
        removeSections: ['Chief Complaint']
      });
      
      const hasChiefComplaint = customized.sections.some(s => s.name === 'Chief Complaint');
      expect(hasChiefComplaint).toBe(false);
    });

    test('should save customized template', () => {
      const customized = service.customizeTemplate('cardio-chest-pain', {
        name: 'Custom Template'
      });
      
      const retrieved = service.getTemplate(customized.templateId);
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Custom Template');
    });

    test('should throw error for non-existent template', () => {
      expect(() => {
        service.customizeTemplate('non-existent', {});
      }).toThrow('Template not found');
    });
  });

  describe('Template Validation', () => {
    test('should validate complete template data', () => {
      const data = {
        chief_complaint: 'Chest pain',
        vital_signs: 'BP 140/90, HR 85',
        diagnosis: 'Acute coronary syndrome',
        assessment: 'High risk',
        plan: 'Admit to CCU'
      };

      const result = service.validateTemplateData('cardio-chest-pain', data);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.disclaimer).toContain('For physician review only');
    });

    test('should detect missing required fields', () => {
      const data = {
        onset: 'sudden'
        // Missing required fields
      };

      const result = service.validateTemplateData('cardio-chest-pain', data);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('MISSING_REQUIRED_FIELDS');
    });

    test('should throw error for non-existent template', () => {
      expect(() => {
        service.validateTemplateData('non-existent', {});
      }).toThrow('Template not found');
    });
  });

  describe('Template Addition', () => {
    test('should add new template', () => {
      const initialStats = service.getStatistics();

      service.addTemplate({
        templateId: 'test-template',
        specialty: 'test_specialty',
        scenario: 'test_scenario',
        name: 'Test Template',
        sections: [
          {
            name: 'Test Section',
            fields: ['field1', 'field2']
          }
        ]
      });

      const newStats = service.getStatistics();
      expect(newStats.totalTemplates).toBe(initialStats.totalTemplates + 1);
    });

    test('should throw error when required fields are missing', () => {
      expect(() => {
        service.addTemplate({
          templateId: 'test-template',
          specialty: 'test_specialty'
          // Missing required fields
        });
      }).toThrow('Missing required template fields');
    });

    test('should initialize usage stats for new template', () => {
      service.addTemplate({
        templateId: 'test-template',
        specialty: 'test_specialty',
        scenario: 'test_scenario',
        name: 'Test Template',
        sections: []
      });

      const stats = service.getUsageStatistics('test-template');
      expect(stats).toBeDefined();
      expect(stats.timesUsed).toBe(0);
    });
  });

  describe('Usage Statistics', () => {
    test('should get usage statistics for specific template', () => {
      service.getTemplate('cardio-chest-pain');
      service.getTemplate('cardio-chest-pain');

      const stats = service.getUsageStatistics('cardio-chest-pain');
      
      expect(stats).toBeDefined();
      expect(stats.templateId).toBe('cardio-chest-pain');
      expect(stats.timesUsed).toBe(2);
      expect(stats.lastUsed).toBeDefined();
    });

    test('should return null for non-existent template', () => {
      const stats = service.getUsageStatistics('non-existent');
      expect(stats).toBeNull();
    });

    test('should get all usage statistics', () => {
      service.getTemplate('cardio-chest-pain');
      service.getTemplate('em-trauma');

      const allStats = service.getUsageStatistics();
      
      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats.length).toBeGreaterThan(0);
    });

    test('should sort statistics by usage count', () => {
      service.getTemplate('cardio-chest-pain');
      service.getTemplate('cardio-chest-pain');
      service.getTemplate('em-trauma');

      const allStats = service.getUsageStatistics();
      
      if (allStats.length > 1) {
        for (let i = 1; i < allStats.length; i++) {
          expect(allStats[i-1].timesUsed).toBeGreaterThanOrEqual(allStats[i].timesUsed);
        }
      }
    });
  });

  describe('Specialty Management', () => {
    test('should get all available specialties', () => {
      const specialties = service.getAvailableSpecialties();
      
      expect(Array.isArray(specialties)).toBe(true);
      expect(specialties.length).toBeGreaterThan(0);
      expect(specialties).toContain('cardiology');
    });

    test('should return sorted specialties', () => {
      const specialties = service.getAvailableSpecialties();
      
      const sorted = [...specialties].sort();
      expect(specialties).toEqual(sorted);
    });
  });

  describe('Statistics', () => {
    test('should provide accurate statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.specialtyCounts).toBeDefined();
      expect(stats.availableSpecialties).toBeGreaterThan(0);
    });

    test('should count templates by specialty', () => {
      const stats = service.getStatistics();
      
      expect(stats.specialtyCounts.cardiology).toBeGreaterThan(0);
    });
  });

  describe('Medical Disclaimer', () => {
    test('should include disclaimer in all templates', () => {
      const template = service.getTemplate('cardio-chest-pain');
      
      expect(template.disclaimer).toBeDefined();
      expect(template.disclaimer).toContain('For physician review only');
    });

    test('should include disclaimer in generated documentation', () => {
      const doc = service.generateDocumentation('cardio-chest-pain', {});
      
      expect(doc.disclaimer).toBeDefined();
      expect(doc.disclaimer).toContain('For physician review only');
    });

    test('should include disclaimer in validation results', () => {
      const result = service.validateTemplateData('cardio-chest-pain', {});
      
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('For physician review only');
    });
  });
});
