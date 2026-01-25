/**
 * Clinical Documentation Generation Service
 * Generates structured clinical notes from data inputs and manual entry
 * Preserves clinical context across encounters
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');

class ClinicalDocumentationService {
  constructor() {
    // Specialty-specific templates
    this.templates = {
      'general': {
        sections: ['Chief Complaint', 'History of Present Illness', 'Review of Systems', 
                  'Physical Examination', 'Assessment', 'Plan'],
        requiredFields: ['chiefComplaint', 'assessment', 'plan']
      },
      'cardiology': {
        sections: ['Chief Complaint', 'Cardiac History', 'Cardiovascular Examination', 
                  'EKG Findings', 'Cardiac Assessment', 'Treatment Plan'],
        requiredFields: ['chiefComplaint', 'cardiacAssessment', 'treatmentPlan']
      },
      'emergency': {
        sections: ['Chief Complaint', 'Triage Assessment', 'Emergency Evaluation', 
                  'Vital Signs', 'Immediate Interventions', 'Disposition'],
        requiredFields: ['chiefComplaint', 'triageLevel', 'disposition']
      },
      'pediatrics': {
        sections: ['Chief Complaint', 'Developmental History', 'Growth Parameters', 
                  'Physical Examination', 'Assessment', 'Parent Education'],
        requiredFields: ['chiefComplaint', 'growthParameters', 'assessment']
      }
    };

    // Clinical context storage (in-memory for this implementation)
    this.patientContexts = new Map();
  }

  /**
   * Generate clinical note from encounter data
   */
  async generateClinicalNote(encounterData, options = {}) {
    try {
      const noteId = uuidv4();
      const specialty = options.specialty || 'general';
      const template = this.templates[specialty] || this.templates['general'];
      
      // Retrieve patient context
      const patientContext = this.getPatientContext(encounterData.patientId);
      
      // Generate note sections
      const sections = await this.generateNoteSections(encounterData, template, patientContext);
      
      // Create structured note
      const clinicalNote = {
        noteId,
        patientId: encounterData.patientId,
        encounterId: encounterData.encounterId,
        specialty,
        timestamp: new Date().toISOString(),
        author: encounterData.providerId,
        sections,
        summary: this.generateSummary(sections),
        aiGenerated: true,
        reviewStatus: 'pending',
        contextPreserved: patientContext !== null,
        previousEncounters: patientContext ? patientContext.encounterHistory.length : 0,
        disclaimer: 'For physician review only'
      };
      
      // Update patient context
      this.updatePatientContext(encounterData.patientId, clinicalNote);
      
      return clinicalNote;
    } catch (error) {
      throw new Error(`Clinical note generation failed: ${error.message}`);
    }
  }

  /**
   * Generate individual note sections based on template
   */
  async generateNoteSections(encounterData, template, patientContext) {
    const sections = {};
    
    for (const sectionName of template.sections) {
      sections[sectionName] = await this.generateSection(
        sectionName, 
        encounterData, 
        patientContext
      );
    }
    
    return sections;
  }

  /**
   * Generate a specific section of the clinical note
   */
  async generateSection(sectionName, encounterData, patientContext) {
    const section = {
      name: sectionName,
      content: '',
      timestamp: new Date().toISOString(),
      confidence: 0.85
    };

    switch (sectionName) {
      case 'Chief Complaint':
        section.content = this.generateChiefComplaint(encounterData);
        section.confidence = 0.95;
        break;
        
      case 'History of Present Illness':
      case 'Cardiac History':
        section.content = this.generateHistoryOfPresentIllness(encounterData, patientContext);
        section.confidence = 0.85;
        break;
        
      case 'Review of Systems':
        section.content = this.generateReviewOfSystems(encounterData);
        section.confidence = 0.80;
        break;
        
      case 'Physical Examination':
      case 'Cardiovascular Examination':
        section.content = this.generatePhysicalExamination(encounterData);
        section.confidence = 0.90;
        break;
        
      case 'Vital Signs':
        section.content = this.generateVitalSigns(encounterData);
        section.confidence = 0.95;
        break;
        
      case 'Assessment':
      case 'Cardiac Assessment':
      case 'Triage Assessment':
        section.content = this.generateAssessment(encounterData, patientContext);
        section.confidence = 0.85;
        break;
        
      case 'Plan':
      case 'Treatment Plan':
        section.content = this.generatePlan(encounterData, patientContext);
        section.confidence = 0.80;
        break;
        
      case 'Disposition':
        section.content = this.generateDisposition(encounterData);
        section.confidence = 0.90;
        break;
        
      default:
        section.content = `[${sectionName} - To be completed by physician]`;
        section.confidence = 0.50;
    }
    
    return section;
  }


  /**
   * Generate chief complaint section
   */
  generateChiefComplaint(encounterData) {
    if (encounterData.chiefComplaint) {
      return encounterData.chiefComplaint;
    }
    
    // Generate from symptoms if available
    if (encounterData.symptoms && encounterData.symptoms.length > 0) {
      const primarySymptom = encounterData.symptoms[0];
      return `Patient presents with ${primarySymptom}`;
    }
    
    return '[Chief complaint to be documented by physician]';
  }

  /**
   * Generate history of present illness
   */
  generateHistoryOfPresentIllness(encounterData, patientContext) {
    let hpi = '';
    
    // Current symptoms
    if (encounterData.symptoms && encounterData.symptoms.length > 0) {
      hpi += `Patient reports ${encounterData.symptoms.join(', ')}. `;
    }
    
    // Duration
    if (encounterData.symptomDuration) {
      hpi += `Symptoms began ${encounterData.symptomDuration}. `;
    }
    
    // Severity
    if (encounterData.severity) {
      hpi += `Severity described as ${encounterData.severity}. `;
    }
    
    // Relevant history from context
    if (patientContext && patientContext.relevantHistory) {
      hpi += `Relevant history includes ${patientContext.relevantHistory}. `;
    }
    
    // Previous similar episodes
    if (patientContext && patientContext.similarEpisodes > 0) {
      hpi += `Patient has had ${patientContext.similarEpisodes} similar episode(s) in the past. `;
    }
    
    return hpi || '[History of present illness to be documented by physician]';
  }

  /**
   * Generate review of systems
   */
  generateReviewOfSystems(encounterData) {
    const systems = {
      'Constitutional': encounterData.constitutional || 'No fever, chills, or weight changes',
      'Cardiovascular': encounterData.cardiovascular || 'No chest pain or palpitations',
      'Respiratory': encounterData.respiratory || 'No shortness of breath or cough',
      'Gastrointestinal': encounterData.gastrointestinal || 'No nausea, vomiting, or diarrhea',
      'Neurological': encounterData.neurological || 'No headache, dizziness, or weakness'
    };
    
    let ros = '';
    for (const [system, findings] of Object.entries(systems)) {
      ros += `${system}: ${findings}. `;
    }
    
    return ros;
  }

  /**
   * Generate physical examination section
   */
  generatePhysicalExamination(encounterData) {
    let exam = '';
    
    // General appearance
    exam += 'General: ';
    exam += encounterData.generalAppearance || 'Patient appears in no acute distress';
    exam += '. ';
    
    // Vital signs
    if (encounterData.vitals) {
      exam += 'Vital Signs: ';
      if (encounterData.vitals.bloodPressure) {
        exam += `BP ${encounterData.vitals.bloodPressure}, `;
      }
      if (encounterData.vitals.heartRate) {
        exam += `HR ${encounterData.vitals.heartRate} bpm, `;
      }
      if (encounterData.vitals.temperature) {
        exam += `Temp ${encounterData.vitals.temperature}°F, `;
      }
      if (encounterData.vitals.oxygenSat) {
        exam += `O2 sat ${encounterData.vitals.oxygenSat}%, `;
      }
      exam += '. ';
    }
    
    // System-specific findings
    if (encounterData.physicalFindings) {
      for (const [system, findings] of Object.entries(encounterData.physicalFindings)) {
        exam += `${system}: ${findings}. `;
      }
    }
    
    return exam || '[Physical examination to be documented by physician]';
  }

  /**
   * Generate vital signs section
   */
  generateVitalSigns(encounterData) {
    if (!encounterData.vitals) {
      return '[Vital signs to be documented]';
    }
    
    const vitals = encounterData.vitals;
    let vitalSigns = '';
    
    if (vitals.bloodPressure) vitalSigns += `Blood Pressure: ${vitals.bloodPressure} mmHg\n`;
    if (vitals.heartRate) vitalSigns += `Heart Rate: ${vitals.heartRate} bpm\n`;
    if (vitals.temperature) vitalSigns += `Temperature: ${vitals.temperature}°F\n`;
    if (vitals.respiratoryRate) vitalSigns += `Respiratory Rate: ${vitals.respiratoryRate}/min\n`;
    if (vitals.oxygenSat) vitalSigns += `Oxygen Saturation: ${vitals.oxygenSat}%\n`;
    
    return vitalSigns;
  }

  /**
   * Generate assessment section
   */
  generateAssessment(encounterData, patientContext) {
    let assessment = '';
    
    // Primary diagnosis
    if (encounterData.diagnosis) {
      assessment += `1. ${encounterData.diagnosis}\n`;
    }
    
    // Secondary diagnoses
    if (encounterData.secondaryDiagnoses && encounterData.secondaryDiagnoses.length > 0) {
      encounterData.secondaryDiagnoses.forEach((dx, index) => {
        assessment += `${index + 2}. ${dx}\n`;
      });
    }
    
    // Risk factors from context
    if (patientContext && patientContext.riskFactors && patientContext.riskFactors.length > 0) {
      assessment += `\nRisk Factors: ${patientContext.riskFactors.join(', ')}\n`;
    }
    
    // Clinical reasoning
    if (encounterData.clinicalReasoning) {
      assessment += `\nClinical Reasoning: ${encounterData.clinicalReasoning}\n`;
    }
    
    return assessment || '[Assessment to be documented by physician]';
  }

  /**
   * Generate plan section
   */
  generatePlan(encounterData, patientContext) {
    let plan = '';
    
    // Medications
    if (encounterData.medications && encounterData.medications.length > 0) {
      plan += 'Medications:\n';
      encounterData.medications.forEach(med => {
        plan += `- ${med.name} ${med.dose} ${med.frequency}\n`;
      });
    }
    
    // Orders
    if (encounterData.orders && encounterData.orders.length > 0) {
      plan += '\nOrders:\n';
      encounterData.orders.forEach(order => {
        plan += `- ${order}\n`;
      });
    }
    
    // Follow-up
    if (encounterData.followUp) {
      plan += `\nFollow-up: ${encounterData.followUp}\n`;
    }
    
    // Patient education
    if (encounterData.patientEducation) {
      plan += `\nPatient Education: ${encounterData.patientEducation}\n`;
    }
    
    return plan || '[Treatment plan to be documented by physician]';
  }

  /**
   * Generate disposition section
   */
  generateDisposition(encounterData) {
    if (encounterData.disposition) {
      return encounterData.disposition;
    }
    
    return '[Disposition to be determined by physician]';
  }

  /**
   * Generate summary of the clinical note
   */
  generateSummary(sections) {
    let summary = '';
    
    // Extract key information from sections
    if (sections['Chief Complaint']) {
      summary += sections['Chief Complaint'].content + ' ';
    }
    
    if (sections['Assessment']) {
      const assessment = sections['Assessment'].content;
      const firstLine = assessment.split('\n')[0];
      summary += firstLine + ' ';
    }
    
    return summary.trim() || 'Clinical encounter documented';
  }


  /**
   * Get patient context from previous encounters
   */
  getPatientContext(patientId) {
    return this.patientContexts.get(patientId) || null;
  }

  /**
   * Update patient context with new encounter information
   */
  updatePatientContext(patientId, clinicalNote) {
    let context = this.patientContexts.get(patientId);
    
    if (!context) {
      context = {
        patientId,
        encounterHistory: [],
        relevantHistory: '',
        riskFactors: [],
        similarEpisodes: 0,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Add encounter to history
    context.encounterHistory.push({
      encounterId: clinicalNote.encounterId,
      timestamp: clinicalNote.timestamp,
      specialty: clinicalNote.specialty,
      summary: clinicalNote.summary
    });
    
    // Keep only last 10 encounters
    if (context.encounterHistory.length > 10) {
      context.encounterHistory = context.encounterHistory.slice(-10);
    }
    
    // Update relevant history
    if (clinicalNote.sections['Assessment']) {
      const assessment = clinicalNote.sections['Assessment'].content;
      if (assessment && assessment.length > 0) {
        context.relevantHistory = assessment.split('\n')[0];
      }
    }
    
    context.lastUpdated = new Date().toISOString();
    
    this.patientContexts.set(patientId, context);
  }

  /**
   * Get patient encounter history
   */
  getPatientEncounterHistory(patientId, limit = 10) {
    const context = this.getPatientContext(patientId);
    
    if (!context) {
      return {
        patientId,
        encounters: [],
        totalEncounters: 0,
        disclaimer: 'For physician review only'
      };
    }
    
    return {
      patientId,
      encounters: context.encounterHistory.slice(-limit),
      totalEncounters: context.encounterHistory.length,
      relevantHistory: context.relevantHistory,
      riskFactors: context.riskFactors,
      lastUpdated: context.lastUpdated,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Generate clinical note from template
   */
  async generateFromTemplate(templateName, encounterData) {
    const template = this.templates[templateName];
    
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    
    // Validate required fields
    for (const field of template.requiredFields) {
      if (!encounterData[field]) {
        throw new Error(`Required field '${field}' missing for template '${templateName}'`);
      }
    }
    
    return this.generateClinicalNote(encounterData, { specialty: templateName });
  }

  /**
   * Get available templates
   */
  getAvailableTemplates() {
    return Object.keys(this.templates).map(name => ({
      name,
      sections: this.templates[name].sections,
      requiredFields: this.templates[name].requiredFields
    }));
  }

  /**
   * Add custom template
   */
  addTemplate(name, template) {
    if (!template.sections || !Array.isArray(template.sections)) {
      throw new Error('Template must have sections array');
    }
    
    if (!template.requiredFields || !Array.isArray(template.requiredFields)) {
      throw new Error('Template must have requiredFields array');
    }
    
    this.templates[name] = template;
    
    return {
      success: true,
      templateName: name,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Amend existing clinical note
   */
  async amendClinicalNote(noteId, amendments, providerId) {
    // In a real implementation, this would retrieve the note from storage
    // For now, we'll create an amendment record
    
    const amendment = {
      amendmentId: uuidv4(),
      originalNoteId: noteId,
      amendments,
      amendedBy: providerId,
      timestamp: new Date().toISOString(),
      disclaimer: 'For physician review only'
    };
    
    return amendment;
  }

  /**
   * Validate clinical note completeness
   */
  validateNoteCompleteness(clinicalNote, templateName) {
    const template = this.templates[templateName] || this.templates['general'];
    const validation = {
      isComplete: true,
      missingFields: [],
      missingSections: [],
      confidence: 1.0
    };
    
    // Check required sections
    for (const sectionName of template.sections) {
      if (!clinicalNote.sections[sectionName] || 
          clinicalNote.sections[sectionName].content.includes('[') ||
          clinicalNote.sections[sectionName].content.includes('to be documented')) {
        validation.missingSections.push(sectionName);
        validation.isComplete = false;
      }
    }
    
    // Calculate completeness confidence
    const totalSections = template.sections.length;
    const completeSections = totalSections - validation.missingSections.length;
    validation.confidence = completeSections / totalSections;
    
    return validation;
  }

  /**
   * Clear patient context (for testing or privacy)
   */
  clearPatientContext(patientId) {
    if (patientId) {
      this.patientContexts.delete(patientId);
    } else {
      this.patientContexts.clear();
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      totalPatients: this.patientContexts.size,
      availableTemplates: Object.keys(this.templates).length,
      templateNames: Object.keys(this.templates),
      disclaimer: 'For physician review only'
    };
  }
}

module.exports = ClinicalDocumentationService;
