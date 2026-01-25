/**
 * Specialty Template System
 * 
 * Provides specialty-specific documentation templates for common clinical scenarios.
 * Supports template customization and management.
 * 
 * Requirements: 7.4
 */

class SpecialtyTemplateService {
  constructor() {
    // Template storage
    this.templates = new Map();
    
    // Template usage tracking
    this.usageStats = new Map();
    
    // Initialize default templates
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default specialty templates
   */
  initializeDefaultTemplates() {
    // Cardiology templates
    this.addTemplate({
      templateId: 'cardio-chest-pain',
      specialty: 'cardiology',
      scenario: 'chest_pain_evaluation',
      name: 'Chest Pain Evaluation',
      sections: [
        {
          name: 'Chief Complaint',
          fields: ['onset', 'duration', 'character', 'location', 'radiation', 'severity']
        },
        {
          name: 'History of Present Illness',
          fields: ['pain_quality', 'aggravating_factors', 'relieving_factors', 'associated_symptoms']
        },
        {
          name: 'Cardiac Risk Factors',
          fields: ['hypertension', 'diabetes', 'hyperlipidemia', 'smoking', 'family_history']
        },
        {
          name: 'Physical Examination',
          fields: ['vital_signs', 'cardiovascular_exam', 'respiratory_exam']
        },
        {
          name: 'Diagnostic Studies',
          fields: ['ecg', 'troponin', 'chest_xray', 'stress_test']
        },
        {
          name: 'Assessment and Plan',
          fields: ['diagnosis', 'risk_stratification', 'treatment_plan', 'disposition']
        }
      ],
      disclaimer: 'For physician review only'
    });

    // Emergency Medicine templates
    this.addTemplate({
      templateId: 'em-trauma',
      specialty: 'emergency_medicine',
      scenario: 'trauma_evaluation',
      name: 'Trauma Evaluation',
      sections: [
        {
          name: 'Mechanism of Injury',
          fields: ['injury_type', 'time_of_injury', 'location', 'circumstances']
        },
        {
          name: 'Primary Survey (ABCDE)',
          fields: ['airway', 'breathing', 'circulation', 'disability', 'exposure']
        },
        {
          name: 'Vital Signs',
          fields: ['blood_pressure', 'heart_rate', 'respiratory_rate', 'oxygen_saturation', 'temperature', 'gcs']
        },
        {
          name: 'Secondary Survey',
          fields: ['head_neck', 'chest', 'abdomen', 'pelvis', 'extremities', 'neurological']
        },
        {
          name: 'Imaging and Labs',
          fields: ['ct_scan', 'xray', 'fast_exam', 'labs']
        },
        {
          name: 'Treatment and Disposition',
          fields: ['interventions', 'consultations', 'disposition', 'follow_up']
        }
      ],
      disclaimer: 'For physician review only'
    });

    // Internal Medicine templates
    this.addTemplate({
      templateId: 'im-admission',
      specialty: 'internal_medicine',
      scenario: 'hospital_admission',
      name: 'Hospital Admission Note',
      sections: [
        {
          name: 'Chief Complaint',
          fields: ['primary_complaint']
        },
        {
          name: 'History of Present Illness',
          fields: ['symptom_onset', 'symptom_progression', 'prior_treatments', 'current_status']
        },
        {
          name: 'Past Medical History',
          fields: ['chronic_conditions', 'prior_hospitalizations', 'surgeries']
        },
        {
          name: 'Medications',
          fields: ['home_medications', 'allergies', 'medication_compliance']
        },
        {
          name: 'Social History',
          fields: ['smoking', 'alcohol', 'drugs', 'occupation', 'living_situation']
        },
        {
          name: 'Review of Systems',
          fields: ['constitutional', 'cardiovascular', 'respiratory', 'gastrointestinal', 'genitourinary', 'neurological', 'musculoskeletal']
        },
        {
          name: 'Physical Examination',
          fields: ['vital_signs', 'general', 'heent', 'cardiovascular', 'respiratory', 'abdomen', 'extremities', 'neurological']
        },
        {
          name: 'Labs and Imaging',
          fields: ['cbc', 'cmp', 'imaging_studies']
        },
        {
          name: 'Assessment and Plan',
          fields: ['problem_list', 'treatment_plan', 'goals_of_care']
        }
      ],
      disclaimer: 'For physician review only'
    });

    // Pediatrics templates
    this.addTemplate({
      templateId: 'peds-well-child',
      specialty: 'pediatrics',
      scenario: 'well_child_visit',
      name: 'Well Child Visit',
      sections: [
        {
          name: 'Interval History',
          fields: ['growth_development', 'nutrition', 'sleep', 'behavior', 'safety']
        },
        {
          name: 'Developmental Milestones',
          fields: ['gross_motor', 'fine_motor', 'language', 'social_emotional']
        },
        {
          name: 'Physical Examination',
          fields: ['vital_signs', 'growth_parameters', 'general', 'heent', 'cardiovascular', 'respiratory', 'abdomen', 'genitourinary', 'musculoskeletal', 'neurological', 'skin']
        },
        {
          name: 'Immunizations',
          fields: ['vaccines_given', 'vaccine_education', 'next_vaccines_due']
        },
        {
          name: 'Anticipatory Guidance',
          fields: ['nutrition', 'safety', 'development', 'behavior']
        },
        {
          name: 'Assessment and Plan',
          fields: ['overall_assessment', 'recommendations', 'follow_up']
        }
      ],
      disclaimer: 'For physician review only'
    });

    // Psychiatry templates
    this.addTemplate({
      templateId: 'psych-initial',
      specialty: 'psychiatry',
      scenario: 'initial_psychiatric_evaluation',
      name: 'Initial Psychiatric Evaluation',
      sections: [
        {
          name: 'Chief Complaint',
          fields: ['presenting_problem']
        },
        {
          name: 'History of Present Illness',
          fields: ['symptom_onset', 'symptom_course', 'precipitating_factors', 'current_symptoms']
        },
        {
          name: 'Psychiatric History',
          fields: ['prior_diagnoses', 'prior_treatments', 'hospitalizations', 'suicide_attempts']
        },
        {
          name: 'Substance Use History',
          fields: ['alcohol', 'tobacco', 'illicit_drugs', 'treatment_history']
        },
        {
          name: 'Family Psychiatric History',
          fields: ['mental_illness', 'substance_abuse', 'suicide']
        },
        {
          name: 'Mental Status Examination',
          fields: ['appearance', 'behavior', 'speech', 'mood', 'affect', 'thought_process', 'thought_content', 'perception', 'cognition', 'insight', 'judgment']
        },
        {
          name: 'Risk Assessment',
          fields: ['suicide_risk', 'homicide_risk', 'self_harm_risk']
        },
        {
          name: 'Assessment and Plan',
          fields: ['diagnosis', 'treatment_plan', 'safety_plan', 'follow_up']
        }
      ],
      disclaimer: 'For physician review only'
    });

    // Surgery templates
    this.addTemplate({
      templateId: 'surg-operative',
      specialty: 'surgery',
      scenario: 'operative_note',
      name: 'Operative Note',
      sections: [
        {
          name: 'Preoperative Diagnosis',
          fields: ['diagnosis']
        },
        {
          name: 'Postoperative Diagnosis',
          fields: ['diagnosis']
        },
        {
          name: 'Procedure Performed',
          fields: ['procedure_name', 'laterality']
        },
        {
          name: 'Surgeon and Assistants',
          fields: ['attending_surgeon', 'assistant_surgeons', 'anesthesiologist']
        },
        {
          name: 'Anesthesia',
          fields: ['anesthesia_type']
        },
        {
          name: 'Indications',
          fields: ['indication_for_surgery']
        },
        {
          name: 'Findings',
          fields: ['operative_findings']
        },
        {
          name: 'Procedure Description',
          fields: ['detailed_procedure', 'specimens', 'drains', 'closure']
        },
        {
          name: 'Estimated Blood Loss',
          fields: ['ebl']
        },
        {
          name: 'Complications',
          fields: ['complications']
        },
        {
          name: 'Disposition',
          fields: ['patient_disposition', 'postop_plan']
        }
      ],
      disclaimer: 'For physician review only'
    });
  }

  /**
   * Add a template to the system
   * @param {Object} template - Template object
   */
  addTemplate(template) {
    const {
      templateId,
      specialty,
      scenario,
      name,
      sections,
      disclaimer = 'For physician review only'
    } = template;

    if (!templateId || !specialty || !scenario || !name || !sections) {
      throw new Error('Missing required template fields');
    }

    this.templates.set(templateId, {
      templateId,
      specialty,
      scenario,
      name,
      sections,
      disclaimer,
      createdAt: new Date(),
      version: '1.0'
    });

    // Initialize usage stats
    this.usageStats.set(templateId, {
      timesUsed: 0,
      lastUsed: null
    });
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Object} Template
   */
  getTemplate(templateId) {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return null;
    }

    // Track usage
    this.trackUsage(templateId);

    return { ...template };
  }

  /**
   * Get templates by specialty
   * @param {string} specialty - Medical specialty
   * @returns {Array} Templates for specialty
   */
  getTemplatesBySpecialty(specialty) {
    const templates = [];

    for (const [id, template] of this.templates) {
      if (template.specialty === specialty) {
        templates.push({
          templateId: template.templateId,
          name: template.name,
          scenario: template.scenario,
          sectionCount: template.sections.length
        });
      }
    }

    return templates;
  }

  /**
   * Get templates by scenario
   * @param {string} scenario - Clinical scenario
   * @returns {Array} Templates for scenario
   */
  getTemplatesByScenario(scenario) {
    const templates = [];

    for (const [id, template] of this.templates) {
      if (template.scenario === scenario) {
        templates.push({
          templateId: template.templateId,
          name: template.name,
          specialty: template.specialty,
          sectionCount: template.sections.length
        });
      }
    }

    return templates;
  }

  /**
   * Search templates by keyword
   * @param {string} keyword - Search keyword
   * @returns {Array} Matching templates
   */
  searchTemplates(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();

    for (const [id, template] of this.templates) {
      const nameMatch = template.name.toLowerCase().includes(searchTerm);
      const specialtyMatch = template.specialty.toLowerCase().includes(searchTerm);
      const scenarioMatch = template.scenario.toLowerCase().includes(searchTerm);

      if (nameMatch || specialtyMatch || scenarioMatch) {
        results.push({
          templateId: template.templateId,
          name: template.name,
          specialty: template.specialty,
          scenario: template.scenario
        });
      }
    }

    return results;
  }

  /**
   * Generate documentation from template
   * @param {string} templateId - Template ID
   * @param {Object} data - Field data
   * @returns {Object} Generated documentation
   */
  generateDocumentation(templateId, data = {}) {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    const documentation = {
      templateId: template.templateId,
      templateName: template.name,
      specialty: template.specialty,
      scenario: template.scenario,
      sections: [],
      generatedAt: new Date(),
      disclaimer: template.disclaimer
    };

    // Populate sections with data
    for (const section of template.sections) {
      const sectionData = {
        name: section.name,
        fields: []
      };

      for (const field of section.fields) {
        sectionData.fields.push({
          name: field,
          value: data[field] || '',
          required: this.isFieldRequired(field)
        });
      }

      documentation.sections.push(sectionData);
    }

    // Track usage
    this.trackUsage(templateId);

    return documentation;
  }

  /**
   * Check if field is required
   * @param {string} fieldName - Field name
   * @returns {boolean} Whether field is required
   */
  isFieldRequired(fieldName) {
    // Common required fields
    const requiredFields = [
      'chief_complaint',
      'primary_complaint',
      'presenting_problem',
      'diagnosis',
      'vital_signs',
      'assessment',
      'plan'
    ];

    return requiredFields.includes(fieldName);
  }

  /**
   * Customize template
   * @param {string} templateId - Template ID
   * @param {Object} customizations - Customization options
   * @returns {Object} Customized template
   */
  customizeTemplate(templateId, customizations) {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    const customizedTemplate = {
      ...template,
      templateId: `${templateId}-custom-${Date.now()}`,
      customized: true,
      baseTemplate: templateId
    };

    // Apply customizations
    if (customizations.name) {
      customizedTemplate.name = customizations.name;
    }

    if (customizations.sections) {
      customizedTemplate.sections = customizations.sections;
    }

    if (customizations.addSections) {
      customizedTemplate.sections.push(...customizations.addSections);
    }

    if (customizations.removeSections) {
      customizedTemplate.sections = customizedTemplate.sections.filter(
        section => !customizations.removeSections.includes(section.name)
      );
    }

    // Save customized template
    this.templates.set(customizedTemplate.templateId, customizedTemplate);
    this.usageStats.set(customizedTemplate.templateId, {
      timesUsed: 0,
      lastUsed: null
    });

    return customizedTemplate;
  }

  /**
   * Validate template data
   * @param {string} templateId - Template ID
   * @param {Object} data - Field data
   * @returns {Object} Validation result
   */
  validateTemplateData(templateId, data) {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    const errors = [];
    const warnings = [];
    const missingRequired = [];

    // Check all sections
    for (const section of template.sections) {
      for (const field of section.fields) {
        if (this.isFieldRequired(field) && !data[field]) {
          missingRequired.push({
            section: section.name,
            field
          });
        }
      }
    }

    if (missingRequired.length > 0) {
      errors.push({
        type: 'MISSING_REQUIRED_FIELDS',
        fields: missingRequired
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Track template usage
   * @param {string} templateId - Template ID
   */
  trackUsage(templateId) {
    const stats = this.usageStats.get(templateId);
    
    if (stats) {
      stats.timesUsed++;
      stats.lastUsed = new Date();
    }
  }

  /**
   * Get template usage statistics
   * @param {string} templateId - Template ID (optional)
   * @returns {Object} Usage statistics
   */
  getUsageStatistics(templateId = null) {
    if (templateId) {
      const stats = this.usageStats.get(templateId);
      const template = this.templates.get(templateId);

      if (!stats || !template) {
        return null;
      }

      return {
        templateId,
        templateName: template.name,
        specialty: template.specialty,
        ...stats
      };
    }

    // Return all statistics
    const allStats = [];
    for (const [id, stats] of this.usageStats) {
      const template = this.templates.get(id);
      if (template) {
        allStats.push({
          templateId: id,
          templateName: template.name,
          specialty: template.specialty,
          ...stats
        });
      }
    }

    return allStats.sort((a, b) => b.timesUsed - a.timesUsed);
  }

  /**
   * Get all available specialties
   * @returns {Array} List of specialties
   */
  getAvailableSpecialties() {
    const specialties = new Set();

    for (const [id, template] of this.templates) {
      specialties.add(template.specialty);
    }

    return Array.from(specialties).sort();
  }

  /**
   * Get template statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const specialtyCounts = {};
    let totalTemplates = 0;

    for (const [id, template] of this.templates) {
      totalTemplates++;
      specialtyCounts[template.specialty] = (specialtyCounts[template.specialty] || 0) + 1;
    }

    return {
      totalTemplates,
      specialtyCounts,
      availableSpecialties: Object.keys(specialtyCounts).length
    };
  }

  /**
   * Clear all data (for testing)
   */
  clearAll() {
    this.templates.clear();
    this.usageStats.clear();
  }
}

module.exports = SpecialtyTemplateService;
