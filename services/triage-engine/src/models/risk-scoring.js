/**
 * Risk Scoring Models for Clinical Triage
 * For physician review only
 */

class RiskScoringModel {
  constructor(modelType = 'ensemble') {
    this.modelType = modelType;
    this.models = {
      cardiac: new CardiacRiskModel(),
      respiratory: new RespiratoryRiskModel(),
      infection: new InfectionRiskModel(),
      medication: new MedicationRiskModel()
    };
    this.ensembleWeights = {
      cardiac: 0.3,
      respiratory: 0.25,
      infection: 0.25,
      medication: 0.2
    };
    this.trained = false;
  }

  /**
   * Calculate multi-dimensional risk scores
   */
  calculateRiskScores(patientData) {
    const riskScores = {};
    const explanations = {};
    
    // Calculate individual risk scores
    for (const [category, model] of Object.entries(this.models)) {
      const result = model.calculateRisk(patientData);
      riskScores[category] = {
        score: result.score,
        level: this.scoreToLevel(result.score),
        factors: result.factors,
        recommendations: result.recommendations,
        confidence: result.confidence
      };
      explanations[category] = result.explanation;
    }

    // Calculate overall risk using ensemble approach
    const overallScore = this.calculateEnsembleScore(riskScores);
    
    return {
      overallRisk: {
        score: overallScore,
        level: this.scoreToLevel(overallScore),
        confidence: this.calculateOverallConfidence(riskScores)
      },
      riskCategories: riskScores,
      explanations: explanations,
      modelVersion: '1.0.0',
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Calculate ensemble score from individual risk scores
   */
  calculateEnsembleScore(riskScores) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [category, weight] of Object.entries(this.ensembleWeights)) {
      if (riskScores[category] && riskScores[category].score !== undefined) {
        weightedSum += riskScores[category].score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Calculate overall confidence from individual confidences
   */
  calculateOverallConfidence(riskScores) {
    const confidences = Object.values(riskScores)
      .map(risk => risk.confidence)
      .filter(conf => conf !== undefined);
    
    if (confidences.length === 0) return 50;
    
    const sum = confidences.reduce((acc, conf) => acc + conf, 0);
    return Math.round(sum / confidences.length);
  }

  /**
   * Convert numeric score to risk level
   */
  scoreToLevel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    return 'Low';
  }

  /**
   * Train models with historical data
   */
  async trainModels(trainingData) {
    for (const [category, model] of Object.entries(this.models)) {
      if (model.train) {
        await model.train(trainingData);
      }
    }
    this.trained = true;
  }
}

class CardiacRiskModel {
  constructor() {
    this.riskFactors = {
      age: { weight: 0.2, threshold: 65 },
      systolicBP: { weight: 0.25, threshold: 140 },
      diastolicBP: { weight: 0.15, threshold: 90 },
      heartRate: { weight: 0.15, threshold: 100 },
      cholesterol: { weight: 0.1, threshold: 200 },
      diabetes: { weight: 0.15, threshold: 0 }
    };
  }

  calculateRisk(patientData) {
    const factors = [];
    const recommendations = [];
    let score = 0;
    let confidence = 80;

    // Age factor
    if (patientData.age >= this.riskFactors.age.threshold) {
      const ageScore = Math.min(30, (patientData.age - 65) * 2);
      score += ageScore * this.riskFactors.age.weight;
      factors.push(`Advanced age (${patientData.age} years)`);
    }

    // Blood pressure factors
    const vitals = patientData.vitals || {};
    if (vitals.bp) {
      const [systolic, diastolic] = vitals.bp.split('/').map(Number);
      
      if (systolic >= this.riskFactors.systolicBP.threshold) {
        const bpScore = Math.min(40, (systolic - 140) * 0.5);
        score += bpScore * this.riskFactors.systolicBP.weight;
        factors.push(`Elevated systolic BP (${systolic} mmHg)`);
        recommendations.push('Monitor blood pressure closely');
      }

      if (diastolic >= this.riskFactors.diastolicBP.threshold) {
        const dbpScore = Math.min(30, (diastolic - 90) * 0.8);
        score += dbpScore * this.riskFactors.diastolicBP.weight;
        factors.push(`Elevated diastolic BP (${diastolic} mmHg)`);
      }
    }

    // Heart rate factor
    if (vitals.hr) {
      const heartRate = parseInt(vitals.hr);
      if (heartRate > this.riskFactors.heartRate.threshold) {
        const hrScore = Math.min(25, (heartRate - 100) * 0.3);
        score += hrScore * this.riskFactors.heartRate.weight;
        factors.push(`Elevated heart rate (${heartRate} bpm)`);
        recommendations.push('Consider cardiac monitoring');
      }
    }

    // Medical history factors
    const history = patientData.past_history || patientData.pastHistory || [];
    if (history.some(h => h.toLowerCase().includes('diabetes'))) {
      score += 20 * this.riskFactors.diabetes.weight;
      factors.push('History of diabetes mellitus');
      recommendations.push('Monitor glucose levels');
    }

    if (history.some(h => h.toLowerCase().includes('hypertension'))) {
      score += 15;
      factors.push('History of hypertension');
    }

    if (history.some(h => h.toLowerCase().includes('cardiac') || h.toLowerCase().includes('heart'))) {
      score += 25;
      factors.push('History of cardiac disease');
      recommendations.push('Cardiology consultation may be warranted');
      confidence = Math.max(confidence, 85);
    }

    // Lab results factors
    const labs = patientData.lab_results || patientData.labResults || [];
    for (const lab of labs) {
      if (lab.test_name && lab.test_name.toLowerCase().includes('cholesterol') && lab.value > 200) {
        score += 10 * this.riskFactors.cholesterol.weight;
        factors.push(`Elevated cholesterol (${lab.value} ${lab.unit})`);
        recommendations.push('Consider lipid management');
      }
    }

    return {
      score: Math.min(100, Math.round(score)),
      factors,
      recommendations,
      confidence,
      explanation: `Cardiac risk assessment based on age, vital signs, medical history, and lab values`
    };
  }
}

class RespiratoryRiskModel {
  constructor() {
    this.riskFactors = {
      age: { weight: 0.15, threshold: 70 },
      oxygenSaturation: { weight: 0.3, threshold: 95 },
      respiratoryRate: { weight: 0.25, threshold: 20 },
      asthma: { weight: 0.15 },
      copd: { weight: 0.15 }
    };
  }

  calculateRisk(patientData) {
    const factors = [];
    const recommendations = [];
    let score = 0;
    let confidence = 75;

    // Age factor
    if (patientData.age >= this.riskFactors.age.threshold) {
      score += 15 * this.riskFactors.age.weight;
      factors.push(`Advanced age (${patientData.age} years)`);
    }

    // Oxygen saturation
    const vitals = patientData.vitals || {};
    if (vitals.spo2 || vitals.oxygenSaturation) {
      const spo2 = parseInt(vitals.spo2 || vitals.oxygenSaturation);
      if (spo2 < this.riskFactors.oxygenSaturation.threshold) {
        const o2Score = Math.min(50, (95 - spo2) * 3);
        score += o2Score * this.riskFactors.oxygenSaturation.weight;
        factors.push(`Low oxygen saturation (${spo2}%)`);
        recommendations.push('Oxygen therapy may be required');
        confidence = Math.max(confidence, 90);
      }
    }

    // Respiratory rate
    if (vitals.rr || vitals.respiratoryRate) {
      const rr = parseInt(vitals.rr || vitals.respiratoryRate);
      if (rr > this.riskFactors.respiratoryRate.threshold) {
        const rrScore = Math.min(30, (rr - 20) * 2);
        score += rrScore * this.riskFactors.respiratoryRate.weight;
        factors.push(`Elevated respiratory rate (${rr}/min)`);
        recommendations.push('Monitor respiratory status closely');
      }
    }

    // Medical history factors
    const history = patientData.past_history || patientData.pastHistory || [];
    if (history.some(h => h.toLowerCase().includes('asthma'))) {
      score += 20 * this.riskFactors.asthma.weight;
      factors.push('History of asthma');
      recommendations.push('Ensure bronchodilator availability');
    }

    if (history.some(h => h.toLowerCase().includes('copd') || h.toLowerCase().includes('emphysema'))) {
      score += 25 * this.riskFactors.copd.weight;
      factors.push('History of COPD');
      recommendations.push('Consider pulmonology consultation');
      confidence = Math.max(confidence, 85);
    }

    return {
      score: Math.min(100, Math.round(score)),
      factors,
      recommendations,
      confidence,
      explanation: `Respiratory risk assessment based on vital signs, oxygen levels, and pulmonary history`
    };
  }
}

class InfectionRiskModel {
  constructor() {
    this.riskFactors = {
      temperature: { weight: 0.3, threshold: 100.4 },
      whiteBloodCells: { weight: 0.25, threshold: 11000 },
      immunocompromised: { weight: 0.2 },
      age: { weight: 0.15, threshold: 75 },
      diabetes: { weight: 0.1 }
    };
  }

  calculateRisk(patientData) {
    const factors = [];
    const recommendations = [];
    let score = 0;
    let confidence = 70;

    // Temperature factor
    const vitals = patientData.vitals || {};
    if (vitals.temp || vitals.temperature) {
      const temp = parseFloat(vitals.temp || vitals.temperature);
      if (temp >= this.riskFactors.temperature.threshold) {
        const tempScore = Math.min(40, (temp - 100.4) * 10);
        score += tempScore * this.riskFactors.temperature.weight;
        factors.push(`Fever (${temp}°F)`);
        recommendations.push('Consider infection workup');
        confidence = Math.max(confidence, 85);
      }
    }

    // Lab results - WBC count
    const labs = patientData.lab_results || patientData.labResults || [];
    for (const lab of labs) {
      if (lab.test_name && lab.test_name.toLowerCase().includes('wbc')) {
        if (lab.value > this.riskFactors.whiteBloodCells.threshold) {
          score += 30 * this.riskFactors.whiteBloodCells.weight;
          factors.push(`Elevated WBC count (${lab.value})`);
          recommendations.push('Blood cultures may be indicated');
          confidence = Math.max(confidence, 80);
        }
      }
    }

    // Age factor
    if (patientData.age >= this.riskFactors.age.threshold) {
      score += 20 * this.riskFactors.age.weight;
      factors.push(`Advanced age (${patientData.age} years)`);
    }

    // Medical history factors
    const history = patientData.past_history || patientData.pastHistory || [];
    if (history.some(h => h.toLowerCase().includes('diabetes'))) {
      score += 15 * this.riskFactors.diabetes.weight;
      factors.push('Diabetes mellitus (infection risk factor)');
    }

    if (history.some(h => 
      h.toLowerCase().includes('immunocompromised') || 
      h.toLowerCase().includes('cancer') ||
      h.toLowerCase().includes('transplant'))) {
      score += 35 * this.riskFactors.immunocompromised.weight;
      factors.push('Immunocompromised state');
      recommendations.push('Aggressive infection monitoring required');
      confidence = Math.max(confidence, 90);
    }

    return {
      score: Math.min(100, Math.round(score)),
      factors,
      recommendations,
      confidence,
      explanation: `Infection risk assessment based on vital signs, lab values, and immune status`
    };
  }
}

class MedicationRiskModel {
  constructor() {
    this.highRiskMedications = [
      'warfarin', 'heparin', 'insulin', 'digoxin', 'lithium', 'phenytoin'
    ];
    this.drugInteractions = [
      { drugs: ['warfarin', 'aspirin'], risk: 'bleeding', severity: 'high' },
      { drugs: ['ace inhibitor', 'potassium'], risk: 'hyperkalemia', severity: 'high' },
      { drugs: ['digoxin', 'amiodarone'], risk: 'toxicity', severity: 'moderate' }
    ];
  }

  calculateRisk(patientData) {
    const factors = [];
    const recommendations = [];
    let score = 0;
    let confidence = 85;

    const medications = patientData.current_medications || patientData.currentMedications || [];
    
    // High-risk medication assessment
    for (const med of medications) {
      const medName = (med.name || med.medication_name || '').toLowerCase();
      
      if (this.highRiskMedications.some(hrm => medName.includes(hrm))) {
        score += 20;
        factors.push(`High-risk medication: ${med.name || med.medication_name}`);
        recommendations.push(`Monitor ${med.name || med.medication_name} levels and effects closely`);
      }
    }

    // Drug interaction assessment
    const medNames = medications.map(med => 
      (med.name || med.medication_name || '').toLowerCase()
    );

    for (const interaction of this.drugInteractions) {
      const hasInteraction = interaction.drugs.every(drug => 
        medNames.some(medName => medName.includes(drug))
      );

      if (hasInteraction) {
        const interactionScore = interaction.severity === 'high' ? 30 : 20;
        score += interactionScore;
        factors.push(`Drug interaction risk: ${interaction.drugs.join(' + ')}`);
        recommendations.push(`Monitor for ${interaction.risk} due to drug interaction`);
        confidence = Math.max(confidence, 90);
      }
    }

    // Polypharmacy assessment
    if (medications.length >= 5) {
      score += 15;
      factors.push(`Polypharmacy (${medications.length} medications)`);
      recommendations.push('Review medication list for potential interactions');
    }

    // Age-related medication risk
    if (patientData.age >= 65 && medications.length > 0) {
      score += 10;
      factors.push('Elderly patient with medications');
      recommendations.push('Consider age-appropriate dosing');
    }

    return {
      score: Math.min(100, Math.round(score)),
      factors,
      recommendations,
      confidence,
      explanation: `Medication risk assessment based on drug interactions, high-risk medications, and polypharmacy`
    };
  }
}

module.exports = {
  RiskScoringModel,
  CardiacRiskModel,
  RespiratoryRiskModel,
  InfectionRiskModel,
  MedicationRiskModel
};