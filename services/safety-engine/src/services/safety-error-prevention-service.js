/**
 * Safety Error Prevention Service
 * Detects and prevents unsafe clinical actions
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');

class SafetyErrorPreventionService {
  constructor() {
    // Safety rules database
    this.safetyRules = this.initializeSafetyRules();
    this.preventionLog = [];
  }

  /**
   * Initialize safety rules
   */
  initializeSafetyRules() {
    return {
      // Medication safety rules
      medication: [
        {
          ruleId: 'MED-001',
          name: 'Duplicate Medication Prevention',
          severity: 'HIGH',
          check: (context) => {
            const { existingMedications, medication } = context;
            if (!existingMedications || !medication) {
              return { violated: false };
            }
            const duplicate = existingMedications.find(med => 
              this.normalizeDrugName(med.name) === this.normalizeDrugName(medication.name)
            );
            return {
              violated: !!duplicate,
              message: duplicate ? `Duplicate medication: ${medication.name} is already prescribed` : null,
              recommendation: 'Review existing medications before adding new prescription'
            };
          }
        },
        {
          ruleId: 'MED-002',
          name: 'Excessive Dose Prevention',
          severity: 'CRITICAL',
          check: (context) => {
            const { medication, maxDoses } = context;
            const drugName = this.normalizeDrugName(medication.name);
            const maxDose = maxDoses[drugName];
            
            if (!maxDose) return { violated: false };
            
            const prescribedDose = this.extractDoseValue(medication.dose);
            const violated = prescribedDose > maxDose;
            
            return {
              violated,
              message: violated ? `Dose ${medication.dose} exceeds maximum safe dose of ${maxDose}mg for ${medication.name}` : null,
              recommendation: 'Verify dose calculation and patient factors'
            };
          }
        },
        {
          ruleId: 'MED-003',
          name: 'Allergy Check',
          severity: 'CRITICAL',
          check: (context) => {
            const { medication, patientAllergies } = context;
            const drugName = this.normalizeDrugName(medication.name);
            
            const allergy = patientAllergies.find(a => 
              this.normalizeDrugName(a.allergen).includes(drugName) ||
              drugName.includes(this.normalizeDrugName(a.allergen))
            );
            
            return {
              violated: !!allergy,
              message: allergy ? `Patient has documented allergy to ${allergy.allergen}` : null,
              recommendation: 'Select alternative medication without cross-reactivity'
            };
          }
        }
      ],
      
      // Lab order safety rules
      labOrder: [
        {
          ruleId: 'LAB-001',
          name: 'Duplicate Lab Prevention',
          severity: 'MEDIUM',
          check: (context) => {
            const { existingOrders, newOrder, timeWindowHours } = context;
            if (!existingOrders || !newOrder) {
              return { violated: false };
            }
            const recentDuplicate = existingOrders.find(order => {
              const timeDiff = new Date(newOrder.orderTime).getTime() - new Date(order.orderTime).getTime();
              const hoursDiff = Math.abs(timeDiff) / (1000 * 60 * 60);
              return order.testName === newOrder.testName && hoursDiff < (timeWindowHours || 24);
            });
            
            return {
              violated: !!recentDuplicate,
              message: recentDuplicate ? `${newOrder.testName} was already ordered within ${timeWindowHours || 24} hours` : null,
              recommendation: 'Review recent lab orders before duplicating'
            };
          }
        }
      ],
      
      // Vital signs safety rules
      vitalSigns: [
        {
          ruleId: 'VITAL-001',
          name: 'Critical Vital Signs Alert',
          severity: 'CRITICAL',
          check: (context) => {
            const { vitals } = context;
            const criticalValues = [];
            
            if (vitals.systolicBP && vitals.systolicBP > 180) {
              criticalValues.push(`Systolic BP ${vitals.systolicBP} mmHg (critical high)`);
            }
            if (vitals.systolicBP && vitals.systolicBP < 90) {
              criticalValues.push(`Systolic BP ${vitals.systolicBP} mmHg (critical low)`);
            }
            if (vitals.heartRate && vitals.heartRate > 120) {
              criticalValues.push(`Heart rate ${vitals.heartRate} bpm (tachycardia)`);
            }
            if (vitals.heartRate && vitals.heartRate < 50) {
              criticalValues.push(`Heart rate ${vitals.heartRate} bpm (bradycardia)`);
            }
            if (vitals.oxygenSat && vitals.oxygenSat < 90) {
              criticalValues.push(`O2 saturation ${vitals.oxygenSat}% (critical low)`);
            }
            if (vitals.temperature && vitals.temperature > 103) {
              criticalValues.push(`Temperature ${vitals.temperature}°F (critical high)`);
            }
            
            return {
              violated: criticalValues.length > 0,
              message: criticalValues.length > 0 ? `Critical vital signs detected: ${criticalValues.join(', ')}` : null,
              recommendation: 'Immediate physician assessment required'
            };
          }
        }
      ],
      
      // Discharge safety rules
      discharge: [
        {
          ruleId: 'DISCH-001',
          name: 'Unstable Patient Discharge Prevention',
          severity: 'CRITICAL',
          check: (context) => {
            const { vitals, labResults, symptoms } = context;
            const unstableFactors = [];
            
            if (vitals && vitals.oxygenSat && vitals.oxygenSat < 92) {
              unstableFactors.push('Low oxygen saturation');
            }
            if (symptoms && symptoms.includes('chest pain')) {
              unstableFactors.push('Active chest pain');
            }
            if (labResults && labResults.troponin && labResults.troponin > 0.04) {
              unstableFactors.push('Elevated troponin');
            }
            
            return {
              violated: unstableFactors.length > 0,
              message: unstableFactors.length > 0 ? `Patient may be unstable for discharge: ${unstableFactors.join(', ')}` : null,
              recommendation: 'Consider extended observation or admission'
            };
          }
        }
      ]
    };
  }

  /**
   * Check action for safety violations
   */
  async checkActionSafety(action, context) {
    try {
      const checkId = uuidv4();
      const violations = [];
      const warnings = [];
      
      // Get applicable rules for this action type
      const rules = this.safetyRules[action.type] || [];
      
      // Check each rule
      for (const rule of rules) {
        const result = rule.check(context);
        
        if (result.violated) {
          const violation = {
            ruleId: rule.ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            message: result.message,
            recommendation: result.recommendation,
            timestamp: new Date().toISOString()
          };
          
          if (rule.severity === 'CRITICAL' || rule.severity === 'HIGH') {
            violations.push(violation);
          } else {
            warnings.push(violation);
          }
        }
      }
      
      // Determine if action should be blocked
      const shouldBlock = violations.some(v => v.severity === 'CRITICAL');
      const requiresConfirmation = violations.length > 0 || warnings.length > 0;
      
      const safetyCheck = {
        checkId,
        timestamp: new Date().toISOString(),
        actionType: action.type,
        actionDescription: action.description,
        safe: violations.length === 0,
        blocked: shouldBlock,
        requiresPhysicianConfirmation: requiresConfirmation,
        violations,
        warnings,
        overallRisk: this.calculateOverallRisk(violations, warnings),
        disclaimer: 'For physician review only'
      };
      
      // Log the check
      this.preventionLog.push(safetyCheck);
      
      return safetyCheck;
    } catch (error) {
      throw new Error(`Safety check failed: ${error.message}`);
    }
  }

  /**
   * Validate medication order
   */
  async validateMedicationOrder(medicationOrder, patientContext) {
    const action = {
      type: 'medication',
      description: `Prescribe ${medicationOrder.name} ${medicationOrder.dose}`
    };
    
    const context = {
      medication: medicationOrder,
      existingMedications: patientContext.currentMedications || [],
      patientAllergies: patientContext.allergies || [],
      maxDoses: {
        'warfarin': 10,
        'metformin': 2550,
        'lisinopril': 40,
        'simvastatin': 80,
        'aspirin': 325
      }
    };
    
    return this.checkActionSafety(action, context);
  }

  /**
   * Validate lab order
   */
  async validateLabOrder(labOrder, patientContext) {
    const action = {
      type: 'labOrder',
      description: `Order ${labOrder.testName}`
    };
    
    const context = {
      newOrder: labOrder,
      existingOrders: patientContext.recentLabOrders || [],
      timeWindowHours: 24
    };
    
    return this.checkActionSafety(action, context);
  }

  /**
   * Validate vital signs
   */
  async validateVitalSigns(vitals) {
    const action = {
      type: 'vitalSigns',
      description: 'Vital signs assessment'
    };
    
    const context = { vitals };
    
    return this.checkActionSafety(action, context);
  }

  /**
   * Validate discharge decision
   */
  async validateDischarge(patientContext) {
    const action = {
      type: 'discharge',
      description: 'Patient discharge'
    };
    
    const context = {
      vitals: patientContext.currentVitals,
      labResults: patientContext.latestLabResults,
      symptoms: patientContext.currentSymptoms || []
    };
    
    return this.checkActionSafety(action, context);
  }

  /**
   * Request physician confirmation for high-risk action
   */
  async requestPhysicianConfirmation(safetyCheck, physicianId) {
    const confirmationRequest = {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      safetyCheckId: safetyCheck.checkId,
      physicianId,
      actionType: safetyCheck.actionType,
      actionDescription: safetyCheck.actionDescription,
      violations: safetyCheck.violations,
      warnings: safetyCheck.warnings,
      overallRisk: safetyCheck.overallRisk,
      status: 'PENDING',
      requiresJustification: safetyCheck.violations.some(v => v.severity === 'CRITICAL'),
      disclaimer: 'For physician review only'
    };
    
    return confirmationRequest;
  }

  /**
   * Record physician override
   */
  async recordPhysicianOverride(confirmationRequest, overrideData) {
    const override = {
      overrideId: uuidv4(),
      timestamp: new Date().toISOString(),
      confirmationRequestId: confirmationRequest.requestId,
      safetyCheckId: confirmationRequest.safetyCheckId,
      physicianId: overrideData.physicianId,
      approved: overrideData.approved,
      justification: overrideData.justification,
      alternativeAction: overrideData.alternativeAction || null,
      disclaimer: 'For physician review only'
    };
    
    // Log the override
    this.preventionLog.push({
      type: 'PHYSICIAN_OVERRIDE',
      ...override
    });
    
    return override;
  }

  /**
   * Get prevention statistics
   */
  getPreventionStatistics(options = {}) {
    const {
      startDate = null,
      endDate = null,
      actionType = null
    } = options;
    
    let logs = [...this.preventionLog];
    
    // Filter by date
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
    }
    
    // Filter by action type
    if (actionType) {
      logs = logs.filter(log => log.actionType === actionType);
    }
    
    const stats = {
      totalChecks: logs.filter(log => log.checkId).length,
      safeActions: logs.filter(log => log.safe === true).length,
      unsafeActions: logs.filter(log => log.safe === false).length,
      blockedActions: logs.filter(log => log.blocked === true).length,
      confirmationsRequired: logs.filter(log => log.requiresPhysicianConfirmation === true).length,
      overrides: logs.filter(log => log.type === 'PHYSICIAN_OVERRIDE').length,
      violationsBySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      violationsByRule: {}
    };
    
    // Count violations
    logs.forEach(log => {
      if (log.violations) {
        log.violations.forEach(v => {
          stats.violationsBySeverity[v.severity]++;
          stats.violationsByRule[v.ruleId] = (stats.violationsByRule[v.ruleId] || 0) + 1;
        });
      }
    });
    
    return {
      ...stats,
      preventionRate: stats.totalChecks > 0 
        ? ((stats.blockedActions / stats.totalChecks) * 100).toFixed(2) + '%'
        : '0%',
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Get recent safety violations
   */
  getRecentViolations(limit = 10) {
    const violations = this.preventionLog
      .filter(log => log.violations && log.violations.length > 0)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return {
      count: violations.length,
      violations,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Add custom safety rule
   */
  addSafetyRule(actionType, rule) {
    if (!this.safetyRules[actionType]) {
      this.safetyRules[actionType] = [];
    }
    
    this.safetyRules[actionType].push({
      ruleId: rule.ruleId || `CUSTOM-${Date.now()}`,
      name: rule.name,
      severity: rule.severity,
      check: rule.check
    });
    
    return {
      success: true,
      message: `Safety rule added to ${actionType}`,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Calculate overall risk level
   */
  calculateOverallRisk(violations, warnings) {
    if (violations.some(v => v.severity === 'CRITICAL')) return 'CRITICAL';
    if (violations.some(v => v.severity === 'HIGH')) return 'HIGH';
    if (warnings.some(w => w.severity === 'MEDIUM')) return 'MEDIUM';
    if (warnings.length > 0) return 'LOW';
    return 'NONE';
  }

  /**
   * Normalize drug name
   */
  normalizeDrugName(drugName) {
    return drugName.toLowerCase().trim().split(/[\s\-\d]+/)[0].replace(/[^a-z]/g, '');
  }

  /**
   * Extract dose value from dose string
   */
  extractDoseValue(doseString) {
    const match = doseString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Clear prevention log (for testing)
   */
  clearPreventionLog() {
    this.preventionLog = [];
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    const ruleCount = Object.values(this.safetyRules).reduce((sum, rules) => sum + rules.length, 0);
    
    return {
      totalRules: ruleCount,
      rulesByType: Object.keys(this.safetyRules).reduce((acc, type) => {
        acc[type] = this.safetyRules[type].length;
        return acc;
      }, {}),
      totalChecks: this.preventionLog.filter(log => log.checkId).length,
      disclaimer: 'For physician review only'
    };
  }
}

module.exports = SafetyErrorPreventionService;
