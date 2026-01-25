/**
 * Unit tests for Workflow Automation Service
 * Requirements: 1.3, 1.5
 */

const WorkflowService = require('./workflow-service');

describe('WorkflowService', () => {
  let workflowService;

  beforeEach(() => {
    workflowService = new WorkflowService();
  });

  describe('Task Identification', () => {
    it('should identify lab review tasks', () => {
      const clinicalData = {
        newLabResults: [
          { name: 'Glucose', value: 156, abnormal: true },
          { name: 'HbA1c', value: 8.2, abnormal: true },
        ],
      };

      const tasks = workflowService.identifyRoutineTasks(clinicalData);
      const labTask = tasks.find(t => t.id === 'lab-review');

      expect(labTask).toBeDefined();
      expect(labTask.name).toBe('Lab Result Review');
      expect(labTask.automatable).toBe(true);
    });

    it('should identify medication refill tasks', () => {
      const clinicalData = {
        medications: [
          { name: 'Metformin', daysRemaining: 5 },
          { name: 'Lisinopril', daysRemaining: 15 },
        ],
      };

      const tasks = workflowService.identifyRoutineTasks(clinicalData);
      const refillTask = tasks.find(t => t.id === 'medication-refill');

      expect(refillTask).toBeDefined();
      expect(refillTask.data.length).toBe(1);
      expect(refillTask.data[0].name).toBe('Metformin');
    });

    it('should identify vital signs monitoring tasks', () => {
      const clinicalData = {
        vitals: {
          systolicBP: 165,
          diastolicBP: 95,
          heartRate: 88,
        },
      };

      const tasks = workflowService.identifyRoutineTasks(clinicalData);
      const vitalsTask = tasks.find(t => t.id === 'vitals-monitoring');

      expect(vitalsTask).toBeDefined();
      expect(vitalsTask.priority).toBe('high');
    });

    it('should identify follow-up scheduling tasks', () => {
      const clinicalData = {
        requiresFollowUp: true,
        followUpReason: 'Post-discharge check',
      };

      const tasks = workflowService.identifyRoutineTasks(clinicalData);
      const followUpTask = tasks.find(t => t.id === 'follow-up');

      expect(followUpTask).toBeDefined();
      expect(followUpTask.data.reason).toBe('Post-discharge check');
    });

    it('should identify documentation review tasks', () => {
      const clinicalData = {
        incompleteDocumentation: ['Missing signature', 'Incomplete notes'],
      };

      const tasks = workflowService.identifyRoutineTasks(clinicalData);
      const docTask = tasks.find(t => t.id === 'doc-review');

      expect(docTask).toBeDefined();
      expect(docTask.automatable).toBe(false);
    });
  });

  describe('Abnormal Vitals Detection', () => {
    it('should detect high blood pressure', () => {
      const vitals = { systolicBP: 165, diastolicBP: 95 };
      expect(workflowService.hasAbnormalVitals(vitals)).toBe(true);
    });

    it('should detect low blood pressure', () => {
      const vitals = { systolicBP: 85, diastolicBP: 55 };
      expect(workflowService.hasAbnormalVitals(vitals)).toBe(true);
    });

    it('should detect abnormal heart rate', () => {
      const vitals = { heartRate: 115 };
      expect(workflowService.hasAbnormalVitals(vitals)).toBe(true);
    });

    it('should return false for normal vitals', () => {
      const vitals = {
        systolicBP: 120,
        diastolicBP: 80,
        heartRate: 75,
        temperature: 37.0,
        oxygenSaturation: 98,
      };
      expect(workflowService.hasAbnormalVitals(vitals)).toBe(false);
    });
  });

  describe('Automation Suggestions', () => {
    it('should generate suggestions for automatable tasks', () => {
      const tasks = [
        {
          id: 'lab-review',
          name: 'Lab Result Review',
          automatable: true,
          automationSuggestion: 'Auto-flag abnormal values',
        },
      ];

      const suggestions = workflowService.generateAutomationSuggestions(tasks);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].canAutomate).toBe(true);
      expect(suggestions[0].automationLevel).toBeDefined();
      expect(suggestions[0].estimatedTimeSaved).toBeGreaterThan(0);
    });

    it('should handle non-automatable tasks', () => {
      const tasks = [
        {
          id: 'doc-review',
          name: 'Documentation Review',
          automatable: false,
          automationSuggestion: 'Flag for physician review',
        },
      ];

      const suggestions = workflowService.generateAutomationSuggestions(tasks);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].canAutomate).toBe(false);
      expect(suggestions[0].reason).toBe('Requires physician judgment');
    });

    it('should apply specialty-specific rules', () => {
      const tasks = [
        {
          id: 'vitals-monitoring',
          name: 'Vital Signs Monitoring',
          automatable: true,
          automationSuggestion: 'Auto-alert on threshold breaches',
        },
      ];

      const suggestions = workflowService.generateAutomationSuggestions(tasks, 'cardiology');

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].automationLevel).toBe('full');
    });
  });

  describe('Workflow Configuration', () => {
    it('should save workflow configuration', () => {
      const userId = 'user123';
      const config = {
        specialty: 'cardiology',
        autoApproveRefills: false,
        autoScheduleFollowUps: true,
      };

      workflowService.saveWorkflowConfiguration(userId, config);
      const saved = workflowService.getWorkflowConfiguration(userId);

      expect(saved.specialty).toBe('cardiology');
      expect(saved.autoScheduleFollowUps).toBe(true);
      expect(saved.updatedAt).toBeDefined();
    });

    it('should return default configuration for new users', () => {
      const config = workflowService.getWorkflowConfiguration('newuser');

      expect(config).toBeDefined();
      expect(config.autoFlagAbnormalLabs).toBeDefined();
    });
  });

  describe('Specialty Templates', () => {
    it('should create general medicine template', () => {
      const template = workflowService.createSpecialtyTemplate('general');

      expect(template.specialty).toBe('general');
      expect(template.automationRules).toBeDefined();
      expect(template.taskPatterns.length).toBeGreaterThan(0);
    });

    it('should create cardiology template', () => {
      const template = workflowService.createSpecialtyTemplate('cardiology');

      expect(template.specialty).toBe('cardiology');
      expect(template.automationRules.autoMonitorVitals).toBe(true);
    });

    it('should create endocrinology template', () => {
      const template = workflowService.createSpecialtyTemplate('endocrinology');

      expect(template.specialty).toBe('endocrinology');
      expect(template.automationRules.autoTrackGlucose).toBe(true);
    });
  });

  describe('Time Estimation', () => {
    it('should estimate time saved for lab review', () => {
      const task = { id: 'lab-review' };
      const timeSaved = workflowService.estimateTimeSaved(task);

      expect(timeSaved).toBe(5);
    });

    it('should estimate time saved for medication refill', () => {
      const task = { id: 'medication-refill' };
      const timeSaved = workflowService.estimateTimeSaved(task);

      expect(timeSaved).toBe(3);
    });

    it('should return 0 for non-automatable tasks', () => {
      const task = { id: 'doc-review' };
      const timeSaved = workflowService.estimateTimeSaved(task);

      expect(timeSaved).toBe(0);
    });
  });
});
