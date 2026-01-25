/**
 * Drug Interaction Checking Service
 * Detects drug interactions and provides clinical recommendations
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');

class DrugInteractionService {
  constructor() {
    // Comprehensive drug interaction database
    // In production, this would be loaded from a medical database like DrugBank or FDA
    this.interactionDatabase = this.initializeInteractionDatabase();
    this.contraindicationDatabase = this.initializeContraindicationDatabase();
  }

  /**
   * Initialize drug interaction database
   */
  initializeInteractionDatabase() {
    return {
      // Anticoagulants
      'warfarin': {
        interactions: [
          {
            drug: 'aspirin',
            severity: 'HIGH',
            mechanism: 'Increased bleeding risk due to antiplatelet effects',
            recommendation: 'Monitor INR closely. Consider alternative antiplatelet if possible.',
            clinicalSignificance: 'Major bleeding risk'
          },
          {
            drug: 'ibuprofen',
            severity: 'MEDIUM',
            mechanism: 'NSAIDs increase bleeding risk and may affect warfarin metabolism',
            recommendation: 'Use acetaminophen instead. If NSAID necessary, monitor INR.',
            clinicalSignificance: 'Increased bleeding risk'
          },
          {
            drug: 'amiodarone',
            severity: 'HIGH',
            mechanism: 'Inhibits warfarin metabolism, increasing anticoagulation',
            recommendation: 'Reduce warfarin dose by 30-50%. Monitor INR weekly.',
            clinicalSignificance: 'Severe bleeding risk'
          }
        ]
      },
      
      // Beta blockers
      'metoprolol': {
        interactions: [
          {
            drug: 'verapamil',
            severity: 'HIGH',
            mechanism: 'Additive negative inotropic and chronotropic effects',
            recommendation: 'Avoid combination. Risk of bradycardia and heart block.',
            clinicalSignificance: 'Cardiac conduction abnormalities'
          },
          {
            drug: 'insulin',
            severity: 'MEDIUM',
            mechanism: 'Beta blockers may mask hypoglycemia symptoms',
            recommendation: 'Monitor blood glucose closely. Educate patient on hypoglycemia.',
            clinicalSignificance: 'Masked hypoglycemia'
          }
        ]
      },
      
      // ACE Inhibitors
      'lisinopril': {
        interactions: [
          {
            drug: 'spironolactone',
            severity: 'HIGH',
            mechanism: 'Both increase potassium levels',
            recommendation: 'Monitor potassium levels closely. Risk of hyperkalemia.',
            clinicalSignificance: 'Life-threatening hyperkalemia'
          },
          {
            drug: 'ibuprofen',
            severity: 'MEDIUM',
            mechanism: 'NSAIDs reduce ACE inhibitor effectiveness and increase renal risk',
            recommendation: 'Use acetaminophen instead. Monitor renal function and BP.',
            clinicalSignificance: 'Reduced antihypertensive effect, acute kidney injury'
          }
        ]
      },
      
      // Statins
      'simvastatin': {
        interactions: [
          {
            drug: 'amiodarone',
            severity: 'HIGH',
            mechanism: 'Inhibits simvastatin metabolism, increasing myopathy risk',
            recommendation: 'Limit simvastatin to 20mg daily or switch to alternative statin.',
            clinicalSignificance: 'Rhabdomyolysis risk'
          },
          {
            drug: 'clarithromycin',
            severity: 'CRITICAL',
            mechanism: 'Strong CYP3A4 inhibition dramatically increases statin levels',
            recommendation: 'Contraindicated. Suspend simvastatin during antibiotic course.',
            clinicalSignificance: 'Severe rhabdomyolysis, acute renal failure'
          }
        ]
      },
      
      // Antibiotics
      'clarithromycin': {
        interactions: [
          {
            drug: 'simvastatin',
            severity: 'CRITICAL',
            mechanism: 'Strong CYP3A4 inhibition',
            recommendation: 'Contraindicated. Suspend statin or use azithromycin instead.',
            clinicalSignificance: 'Rhabdomyolysis'
          },
          {
            drug: 'warfarin',
            severity: 'HIGH',
            mechanism: 'Inhibits warfarin metabolism',
            recommendation: 'Monitor INR closely. May need warfarin dose reduction.',
            clinicalSignificance: 'Increased bleeding risk'
          }
        ]
      },
      
      // Antidiabetics
      'metformin': {
        interactions: [
          {
            drug: 'contrast-dye',
            severity: 'HIGH',
            mechanism: 'Increased risk of lactic acidosis with renal impairment',
            recommendation: 'Hold metformin 48 hours before and after contrast procedures.',
            clinicalSignificance: 'Lactic acidosis'
          }
        ]
      },
      
      // SSRIs
      'sertraline': {
        interactions: [
          {
            drug: 'tramadol',
            severity: 'HIGH',
            mechanism: 'Increased serotonin levels',
            recommendation: 'Avoid combination. Risk of serotonin syndrome.',
            clinicalSignificance: 'Serotonin syndrome'
          },
          {
            drug: 'aspirin',
            severity: 'MEDIUM',
            mechanism: 'Both affect platelet function',
            recommendation: 'Monitor for bleeding. Consider PPI for GI protection.',
            clinicalSignificance: 'Increased bleeding risk'
          }
        ]
      }
    };
  }

  /**
   * Initialize contraindication database
   */
  initializeContraindicationDatabase() {
    return {
      'metformin': [
        {
          condition: 'severe renal impairment',
          severity: 'CRITICAL',
          reason: 'Risk of lactic acidosis',
          recommendation: 'Contraindicated if eGFR < 30 mL/min'
        },
        {
          condition: 'acute heart failure',
          severity: 'CRITICAL',
          reason: 'Risk of lactic acidosis',
          recommendation: 'Discontinue immediately'
        }
      ],
      'warfarin': [
        {
          condition: 'active bleeding',
          severity: 'CRITICAL',
          reason: 'Anticoagulation will worsen bleeding',
          recommendation: 'Contraindicated. Consider reversal if currently on warfarin.'
        },
        {
          condition: 'pregnancy',
          severity: 'CRITICAL',
          reason: 'Teratogenic effects',
          recommendation: 'Use heparin instead'
        }
      ],
      'lisinopril': [
        {
          condition: 'pregnancy',
          severity: 'CRITICAL',
          reason: 'Fetal toxicity',
          recommendation: 'Contraindicated in pregnancy. Switch to alternative.'
        },
        {
          condition: 'bilateral renal artery stenosis',
          severity: 'CRITICAL',
          reason: 'Risk of acute renal failure',
          recommendation: 'Contraindicated'
        }
      ]
    };
  }

  /**
   * Check for drug interactions in a medication list
   */
  async checkDrugInteractions(medications, patientConditions = []) {
    try {
      const checkId = uuidv4();
      const interactions = [];
      const contraindications = [];
      
      // Normalize medication names and filter out invalid entries
      const normalizedMeds = medications
        .map(med => ({
          ...med,
          normalizedName: this.normalizeDrugName(med.name)
        }))
        .filter(med => med.normalizedName && med.normalizedName.length > 0);
      
      // Check pairwise interactions
      for (let i = 0; i < normalizedMeds.length; i++) {
        for (let j = i + 1; j < normalizedMeds.length; j++) {
          const interaction = this.checkPairInteraction(
            normalizedMeds[i],
            normalizedMeds[j]
          );
          
          if (interaction) {
            interactions.push(interaction);
          }
        }
      }
      
      // Check contraindications
      for (const med of normalizedMeds) {
        const medContraindications = this.checkContraindications(
          med,
          patientConditions
        );
        contraindications.push(...medContraindications);
      }
      
      // Calculate overall risk level
      const overallRisk = this.calculateOverallRisk(interactions, contraindications);
      
      return {
        checkId,
        timestamp: new Date().toISOString(),
        medicationsChecked: medications.length,
        interactionsFound: interactions.length,
        contraindicationsFound: contraindications.length,
        overallRisk,
        interactions: this.sortBySeverity(interactions),
        contraindications: this.sortBySeverity(contraindications),
        requiresPhysicianReview: overallRisk === 'CRITICAL' || overallRisk === 'HIGH',
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Drug interaction check failed: ${error.message}`);
    }
  }

  /**
   * Check interaction between two drugs
   */
  checkPairInteraction(med1, med2) {
    const drug1 = med1.normalizedName;
    const drug2 = med2.normalizedName;
    
    // Check both directions
    let interaction = this.findInteraction(drug1, drug2);
    if (!interaction) {
      interaction = this.findInteraction(drug2, drug1);
    }
    
    if (interaction) {
      return {
        interactionId: uuidv4(),
        drug1: med1.name,
        drug2: med2.name,
        severity: interaction.severity,
        mechanism: interaction.mechanism,
        recommendation: interaction.recommendation,
        clinicalSignificance: interaction.clinicalSignificance,
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  }

  /**
   * Find interaction in database
   */
  findInteraction(drug1, drug2) {
    const drugData = this.interactionDatabase[drug1];
    if (!drugData) return null;
    
    const interaction = drugData.interactions.find(
      int => int.drug === drug2
    );
    
    return interaction || null;
  }

  /**
   * Check contraindications for a medication
   */
  checkContraindications(medication, patientConditions) {
    const contraindications = [];
    const drugName = medication.normalizedName;
    const drugContraindications = this.contraindicationDatabase[drugName];
    
    if (!drugContraindications) return contraindications;
    
    for (const condition of patientConditions) {
      const normalizedCondition = condition.toLowerCase().trim();
      
      for (const contraindication of drugContraindications) {
        if (normalizedCondition.includes(contraindication.condition)) {
          contraindications.push({
            contraindicationId: uuidv4(),
            medication: medication.name,
            condition: condition,
            severity: contraindication.severity,
            reason: contraindication.reason,
            recommendation: contraindication.recommendation,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return contraindications;
  }

  /**
   * Normalize drug name for matching
   */
  normalizeDrugName(drugName) {
    // Handle invalid inputs
    if (!drugName || typeof drugName !== 'string') {
      return '';
    }
    
    // Extract the drug name by removing dosage information and special characters
    // Keep only alphabetic characters
    const normalized = drugName.toLowerCase().trim().split(/[\s\-\d]+/)[0].replace(/[^a-z]/g, '');
    
    // Protect against JavaScript reserved words and prototype pollution
    if (normalized === 'constructor' || normalized === 'prototype' || normalized === '__proto__') {
      return '';
    }
    
    return normalized;
  }

  /**
   * Calculate overall risk level
   */
  calculateOverallRisk(interactions, contraindications) {
    const allIssues = [...interactions, ...contraindications];
    
    if (allIssues.length === 0) return 'NONE';
    
    const hasCritical = allIssues.some(issue => issue.severity === 'CRITICAL');
    if (hasCritical) return 'CRITICAL';
    
    const hasHigh = allIssues.some(issue => issue.severity === 'HIGH');
    if (hasHigh) return 'HIGH';
    
    const hasMedium = allIssues.some(issue => issue.severity === 'MEDIUM');
    if (hasMedium) return 'MEDIUM';
    
    return 'LOW';
  }

  /**
   * Sort issues by severity
   */
  sortBySeverity(issues) {
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    return issues.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );
  }

  /**
   * Get detailed interaction information
   */
  async getInteractionDetails(drug1, drug2) {
    const normalizedDrug1 = this.normalizeDrugName(drug1);
    const normalizedDrug2 = this.normalizeDrugName(drug2);
    
    let interaction = this.findInteraction(normalizedDrug1, normalizedDrug2);
    if (!interaction) {
      interaction = this.findInteraction(normalizedDrug2, normalizedDrug1);
    }
    
    if (!interaction) {
      return {
        found: false,
        message: 'No known interaction found in database',
        disclaimer: 'For physician review only'
      };
    }
    
    return {
      found: true,
      drug1,
      drug2,
      severity: interaction.severity,
      mechanism: interaction.mechanism,
      recommendation: interaction.recommendation,
      clinicalSignificance: interaction.clinicalSignificance,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Add custom interaction to database
   */
  addInteraction(drug1, interactionData) {
    const normalizedDrug = this.normalizeDrugName(drug1);
    
    if (!this.interactionDatabase[normalizedDrug]) {
      this.interactionDatabase[normalizedDrug] = { interactions: [] };
    }
    
    this.interactionDatabase[normalizedDrug].interactions.push({
      drug: this.normalizeDrugName(interactionData.drug),
      severity: interactionData.severity,
      mechanism: interactionData.mechanism,
      recommendation: interactionData.recommendation,
      clinicalSignificance: interactionData.clinicalSignificance
    });
    
    return {
      success: true,
      message: `Interaction added for ${drug1}`,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Get severity level statistics
   */
  getSeverityStatistics(checkResult) {
    const allIssues = [
      ...checkResult.interactions,
      ...checkResult.contraindications
    ];
    
    return {
      critical: allIssues.filter(i => i.severity === 'CRITICAL').length,
      high: allIssues.filter(i => i.severity === 'HIGH').length,
      medium: allIssues.filter(i => i.severity === 'MEDIUM').length,
      low: allIssues.filter(i => i.severity === 'LOW').length,
      total: allIssues.length
    };
  }

  /**
   * Generate clinical alert for high-risk interactions
   */
  generateClinicalAlert(checkResult) {
    if (checkResult.overallRisk === 'NONE' || checkResult.overallRisk === 'LOW') {
      return null;
    }
    
    const criticalIssues = [
      ...checkResult.interactions,
      ...checkResult.contraindications
    ].filter(issue => issue.severity === 'CRITICAL' || issue.severity === 'HIGH');
    
    return {
      alertId: uuidv4(),
      alertType: 'DRUG_INTERACTION',
      severity: checkResult.overallRisk,
      timestamp: new Date().toISOString(),
      message: `${criticalIssues.length} critical/high severity drug interaction(s) detected`,
      issues: criticalIssues,
      requiresAcknowledgment: true,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Get database statistics
   */
  getDatabaseStats() {
    const drugCount = Object.keys(this.interactionDatabase).length;
    let totalInteractions = 0;
    
    for (const drug in this.interactionDatabase) {
      totalInteractions += this.interactionDatabase[drug].interactions.length;
    }
    
    const contraindicationCount = Object.keys(this.contraindicationDatabase).length;
    
    return {
      drugsInDatabase: drugCount,
      totalInteractions,
      contraindicationsTracked: contraindicationCount,
      disclaimer: 'For physician review only'
    };
  }
}

module.exports = DrugInteractionService;
