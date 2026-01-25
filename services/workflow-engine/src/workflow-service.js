/**
 * Workflow Automation Service
 * Implements routine task identification and automation suggestions
 * Requirements: 1.3, 1.5
 */

class WorkflowService {
  constructor() {
    this.workflows = new Map();
    this.taskPatterns = this.initializeTaskPatterns();
    this.automationRules = this.initializeAutomationRules();
  }

  /**
   * Initialize common clinical task patterns
   */
  initializeTaskPatterns() {
    return {
      labReview: {
        id: 'lab-review',
        name: 'Lab Result Review',
        triggers: ['new_lab_results', 'abnormal_values'],
        automatable: true,
        priority: 'medium',
      },
      medicationRefill: {
        id: 'medication-refill',
        name: 'Medication Refill',
        triggers: ['low_medication_count', 'refill_due'],
        automatable: true,
        priority: 'low',
      },
      vitalSignsMonitoring: {
        id: 'vitals-monitoring',
        name: 'Vital Signs Monitoring',
        triggers: ['abnormal_vitals', 'threshold_breach'],
        automatable: true,
        priority: 'high',
      },
      followUpScheduling: {
        id: 'follow-up',
        name: 'Follow-up Scheduling',
        triggers: ['discharge', 'treatment_complete'],
        automatable: true,
        priority: 'medium',
      },
      documentationReview: {
        id: 'doc-review',
        name: 'Documentation Review',
        triggers: ['incomplete_notes', 'missing_signatures'],
        automatable: false,
        priority: 'medium',
      },
    };
  }

  /**
   * Initialize automation rules for different specialties
   */
  initializeAutomationRules() {
    return {
      general: {
        autoApproveRefills: false,
        autoScheduleFollowUps: true,
        autoFlagAbnormalLabs: true,
        autoGenerateNotes: false,
      },
      cardiology: {
        autoApproveRefills: false,
        autoScheduleFollowUps: true,
        autoFlagAbnormalLabs: true,
        autoGenerateNotes: false,
        autoMonitorVitals: true,
      },
      endocrinology: {
        autoApproveRefills: false,
        autoScheduleFollowUps: true,
        autoFlagAbnormalLabs: true,
        autoGenerateNotes: false,
        autoTrackGlucose: true,
      },
    };
  }

  /**
   * Identify routine tasks from clinical scenario
   * @param {Object} clinicalData - Patient clinical data
   * @returns {Array} - List of identified routine tasks
   */
  identifyRoutineTasks(clinicalData) {
    const tasks = [];

    // Check for lab review tasks
    if (clinicalData.newLabResults && clinicalData.newLabResults.length > 0) {
      tasks.push({
        ...this.taskPatterns.labReview,
        data: clinicalData.newLabResults,
        automationSuggestion: 'Auto-flag abnormal values and generate summary',
      });
    }

    // Check for medication refill tasks
    if (clinicalData.medications) {
      const lowMedications = clinicalData.medications.filter(
        med => med.daysRemaining && med.daysRemaining < 7
      );
      if (lowMedications.length > 0) {
        tasks.push({
          ...this.taskPatterns.medicationRefill,
          data: lowMedications,
          automationSuggestion: 'Auto-generate refill requests for review',
        });
      }
    }

    // Check for vital signs monitoring
    if (clinicalData.vitals && this.hasAbnormalVitals(clinicalData.vitals)) {
      tasks.push({
        ...this.taskPatterns.vitalSignsMonitoring,
        data: clinicalData.vitals,
        automationSuggestion: 'Auto-alert on threshold breaches',
      });
    }

    // Check for follow-up scheduling
    if (clinicalData.requiresFollowUp) {
      tasks.push({
        ...this.taskPatterns.followUpScheduling,
        data: { reason: clinicalData.followUpReason },
        automationSuggestion: 'Auto-schedule based on clinical guidelines',
      });
    }

    // Check for documentation review
    if (clinicalData.incompleteDocumentation) {
      tasks.push({
        ...this.taskPatterns.documentationReview,
        data: clinicalData.incompleteDocumentation,
        automationSuggestion: 'Flag for physician review (not automatable)',
      });
    }

    return tasks;
  }

  /**
   * Check if vitals are abnormal
   * @param {Object} vitals - Patient vital signs
   * @returns {boolean} - True if any vitals are abnormal
   */
  hasAbnormalVitals(vitals) {
    const thresholds = {
      systolicBP: { min: 90, max: 140 },
      diastolicBP: { min: 60, max: 90 },
      heartRate: { min: 60, max: 100 },
      temperature: { min: 36.1, max: 37.8 },
      oxygenSaturation: { min: 95, max: 100 },
    };

    for (const [key, value] of Object.entries(vitals)) {
      if (thresholds[key]) {
        if (value < thresholds[key].min || value > thresholds[key].max) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate automation suggestions for identified tasks
   * @param {Array} tasks - List of routine tasks
   * @param {string} specialty - Medical specialty
   * @returns {Array} - List of automation suggestions
   */
  generateAutomationSuggestions(tasks, specialty = 'general') {
    const rules = this.automationRules[specialty] || this.automationRules.general;
    const suggestions = [];

    tasks.forEach(task => {
      if (!task.automatable) {
        suggestions.push({
          taskId: task.id,
          taskName: task.name,
          canAutomate: false,
          reason: 'Requires physician judgment',
          suggestion: task.automationSuggestion,
        });
        return;
      }

      const suggestion = {
        taskId: task.id,
        taskName: task.name,
        canAutomate: true,
        automationLevel: this.determineAutomationLevel(task, rules),
        suggestion: task.automationSuggestion,
        estimatedTimeSaved: this.estimateTimeSaved(task),
      };

      suggestions.push(suggestion);
    });

    return suggestions;
  }

  /**
   * Determine automation level based on task and rules
   * @param {Object} task - Task to automate
   * @param {Object} rules - Automation rules
   * @returns {string} - Automation level
   */
  determineAutomationLevel(task, rules) {
    switch (task.id) {
      case 'lab-review':
        return rules.autoFlagAbnormalLabs ? 'full' : 'assisted';
      case 'medication-refill':
        return rules.autoApproveRefills ? 'full' : 'assisted';
      case 'follow-up':
        return rules.autoScheduleFollowUps ? 'full' : 'assisted';
      case 'vitals-monitoring':
        return rules.autoMonitorVitals ? 'full' : 'assisted';
      default:
        return 'assisted';
    }
  }

  /**
   * Estimate time saved by automation
   * @param {Object} task - Task to automate
   * @returns {number} - Estimated minutes saved
   */
  estimateTimeSaved(task) {
    const timeSavings = {
      'lab-review': 5,
      'medication-refill': 3,
      'vitals-monitoring': 2,
      'follow-up': 4,
      'doc-review': 0,
    };

    return timeSavings[task.id] || 0;
  }

  /**
   * Save workflow configuration
   * @param {string} userId - User ID
   * @param {Object} config - Workflow configuration
   */
  saveWorkflowConfiguration(userId, config) {
    this.workflows.set(userId, {
      ...config,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Get workflow configuration
   * @param {string} userId - User ID
   * @returns {Object} - Workflow configuration
   */
  getWorkflowConfiguration(userId) {
    return this.workflows.get(userId) || this.automationRules.general;
  }

  /**
   * Create specialty-specific workflow template
   * @param {string} specialty - Medical specialty
   * @returns {Object} - Workflow template
   */
  createSpecialtyTemplate(specialty) {
    const baseTemplate = {
      specialty,
      automationRules: this.automationRules[specialty] || this.automationRules.general,
      taskPatterns: Object.values(this.taskPatterns),
      customTasks: [],
    };

    return baseTemplate;
  }
}

module.exports = WorkflowService;
