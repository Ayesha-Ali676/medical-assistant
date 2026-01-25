/**
 * Predictive Analytics Service for MedAssist
 * Implements patient deterioration prediction, population health analytics, and trend analysis
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');

class PredictiveAnalyticsService {
  constructor() {
    this.modelVersion = '1.0.0';
    this.predictionWindow = { min: 2, max: 6 }; // hours
    this.deteriorationModel = new PatientDeteriorationModel();
    this.populationHealthAnalyzer = new PopulationHealthAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
    this.anomalyDetector = new AnomalyDetector();
  }

  /**
   * Predict patient deterioration risk
   * Generates alerts 2-6 hours before critical events
   */
  async predictDeterioration(patientData, historicalData = []) {
    try {
      const predictionId = uuidv4();
      const startTime = Date.now();

      // Calculate deterioration risk score
      const riskScore = this.deteriorationModel.calculateDeteriorationRisk(patientData, historicalData);

      // Determine prediction window based on risk level
      const predictionWindow = this.calculatePredictionWindow(riskScore.score);

      // Generate recommendations
      const recommendations = this.generateDeteriorationRecommendations(riskScore);

      // Calculate confidence intervals
      const confidenceInterval = this.calculateConfidenceInterval(riskScore.score, historicalData.length);

      const result = {
        predictionId,
        patientId: patientData.id || patientData.patient_id,
        deteriorationRisk: {
          score: riskScore.score,
          level: this.scoreToRiskLevel(riskScore.score),
          confidence: riskScore.confidence,
          confidenceInterval
        },
        predictionWindow: {
          hours: predictionWindow,
          estimatedTime: new Date(Date.now() + predictionWindow * 60 * 60 * 1000).toISOString()
        },
        riskFactors: riskScore.factors,
        vitalTrends: riskScore.vitalTrends,
        recommendations,
        modelVersion: this.modelVersion,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        disclaimer: 'For physician review only'
      };

      return result;
    } catch (error) {
      throw new Error(`Deterioration prediction failed: ${error.message}`);
    }
  }

  /**
   * Analyze population health across patient cohorts
   */
  async analyzePopulationHealth(patientCohort, options = {}) {
    try {
      const analysisId = uuidv4();
      const startTime = Date.now();

      // Perform cohort analysis
      const cohortAnalysis = this.populationHealthAnalyzer.analyzeCohort(patientCohort);

      // Identify trends and patterns
      const trends = this.populationHealthAnalyzer.identifyTrends(patientCohort);

      // Risk stratification
      const riskStratification = this.populationHealthAnalyzer.stratifyRisk(patientCohort);

      // Outcome predictions
      const outcomePredictions = this.populationHealthAnalyzer.predictOutcomes(patientCohort);

      const result = {
        analysisId,
        cohortSize: patientCohort.length,
        cohortAnalysis,
        trends,
        riskStratification,
        outcomePredictions,
        modelVersion: this.modelVersion,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        disclaimer: 'For physician review only'
      };

      return result;
    } catch (error) {
      throw new Error(`Population health analysis failed: ${error.message}`);
    }
  }

  /**
   * Perform trend analysis on patient data
   */
  async analyzeTrends(patientData, timeSeriesData, options = {}) {
    try {
      const analysisId = uuidv4();
      const startTime = Date.now();

      // Analyze vital sign trends
      const vitalTrends = this.trendAnalyzer.analyzeVitalTrends(timeSeriesData);

      // Detect anomalies
      const anomalies = this.anomalyDetector.detectAnomalies(timeSeriesData);

      // Predict future values
      const predictions = this.trendAnalyzer.predictFutureTrends(timeSeriesData);

      // Calculate trend significance
      const significance = this.trendAnalyzer.calculateTrendSignificance(vitalTrends);

      const result = {
        analysisId,
        patientId: patientData.id || patientData.patient_id,
        vitalTrends,
        anomalies,
        predictions,
        significance,
        modelVersion: this.modelVersion,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        disclaimer: 'For physician review only'
      };

      return result;
    } catch (error) {
      throw new Error(`Trend analysis failed: ${error.message}`);
    }
  }

  /**
   * Calculate prediction window based on risk score
   */
  calculatePredictionWindow(riskScore) {
    if (riskScore >= 80) return 2; // Critical - 2 hours
    if (riskScore >= 60) return 3; // High - 3 hours
    if (riskScore >= 40) return 4; // Moderate - 4 hours
    return 6; // Low - 6 hours
  }

  /**
   * Generate recommendations based on deterioration risk
   */
  generateDeteriorationRecommendations(riskScore) {
    const recommendations = [];

    if (riskScore.score >= 70) {
      recommendations.push('Consider immediate physician evaluation');
      recommendations.push('Increase monitoring frequency');
    }

    if (riskScore.vitalTrends.some(t => t.direction === 'worsening')) {
      recommendations.push('Monitor trending vital signs closely');
    }

    if (riskScore.factors.some(f => f.includes('respiratory'))) {
      recommendations.push('Assess respiratory status and oxygen requirements');
    }

    if (riskScore.factors.some(f => f.includes('cardiac'))) {
      recommendations.push('Consider cardiac monitoring or consultation');
    }

    return recommendations;
  }

  /**
   * Calculate confidence interval for predictions
   */
  calculateConfidenceInterval(score, dataPoints) {
    const baseConfidence = Math.min(95, 60 + (dataPoints * 2));
    const margin = Math.max(5, 20 - dataPoints);

    return {
      lower: Math.max(0, score - margin),
      upper: Math.min(100, score + margin),
      confidence: baseConfidence
    };
  }

  /**
   * Convert numeric score to risk level
   */
  scoreToRiskLevel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    return 'Low';
  }
}

/**
 * Patient Deterioration Prediction Model
 */
class PatientDeteriorationModel {
  constructor() {
    this.weights = {
      vitalTrends: 0.35,
      labTrends: 0.25,
      clinicalHistory: 0.20,
      currentStatus: 0.20
    };
  }

  calculateDeteriorationRisk(patientData, historicalData) {
    const factors = [];
    const vitalTrends = [];
    let score = 0;
    let confidence = 70;

    // Analyze vital sign trends
    const vitalScore = this.analyzeVitalTrends(patientData, historicalData, factors, vitalTrends);
    score += vitalScore * this.weights.vitalTrends;

    // Analyze lab result trends
    const labScore = this.analyzeLabTrends(patientData, historicalData, factors);
    score += labScore * this.weights.labTrends;

    // Analyze clinical history
    const historyScore = this.analyzeClinicalHistory(patientData, factors);
    score += historyScore * this.weights.clinicalHistory;

    // Analyze current clinical status
    const statusScore = this.analyzeCurrentStatus(patientData, factors);
    score += statusScore * this.weights.currentStatus;

    // Adjust confidence based on data availability
    if (historicalData.length >= 5) confidence += 10;
    if (historicalData.length >= 10) confidence += 10;

    return {
      score: Math.min(100, Math.round(score)),
      factors,
      vitalTrends,
      confidence: Math.min(95, confidence)
    };
  }

  analyzeVitalTrends(patientData, historicalData, factors, vitalTrends) {
    let score = 0;
    const vitals = patientData.vitals || {};

    // Blood pressure trend
    if (vitals.bp) {
      const [systolic, diastolic] = vitals.bp.split('/').map(Number);
      if (systolic > 160 || systolic < 90) {
        score += 30;
        factors.push(`Abnormal blood pressure: ${vitals.bp}`);
        vitalTrends.push({ vital: 'blood_pressure', direction: 'worsening', severity: 'high' });
      }
    }

    // Heart rate trend
    if (vitals.hr) {
      const hr = parseInt(vitals.hr);
      if (hr > 110 || hr < 50) {
        score += 25;
        factors.push(`Abnormal heart rate: ${hr} bpm`);
        vitalTrends.push({ vital: 'heart_rate', direction: 'worsening', severity: 'moderate' });
      }
    }

    // Oxygen saturation trend
    if (vitals.spo2) {
      const spo2 = parseInt(vitals.spo2);
      if (spo2 < 92) {
        score += 35;
        factors.push(`Low oxygen saturation: ${spo2}%`);
        vitalTrends.push({ vital: 'oxygen_saturation', direction: 'worsening', severity: 'high' });
      }
    }

    // Temperature trend
    if (vitals.temp) {
      const temp = parseFloat(vitals.temp);
      if (temp > 101.5 || temp < 96) {
        score += 20;
        factors.push(`Abnormal temperature: ${temp}°F`);
        vitalTrends.push({ vital: 'temperature', direction: 'worsening', severity: 'moderate' });
      }
    }

    // Respiratory rate trend
    if (vitals.rr) {
      const rr = parseInt(vitals.rr);
      if (rr > 24 || rr < 10) {
        score += 25;
        factors.push(`Abnormal respiratory rate: ${rr}/min`);
        vitalTrends.push({ vital: 'respiratory_rate', direction: 'worsening', severity: 'moderate' });
      }
    }

    return score;
  }

  analyzeLabTrends(patientData, historicalData, factors) {
    let score = 0;
    const labs = patientData.lab_results || patientData.labResults || [];

    for (const lab of labs) {
      const testName = (lab.test_name || '').toLowerCase();
      const value = parseFloat(lab.value);

      // Critical lab values
      if (testName.includes('creatinine') && value > 2.0) {
        score += 20;
        factors.push(`Elevated creatinine: ${value}`);
      }

      if (testName.includes('lactate') && value > 2.0) {
        score += 25;
        factors.push(`Elevated lactate: ${value}`);
      }

      if (testName.includes('troponin') && value > 0.04) {
        score += 30;
        factors.push(`Elevated troponin: ${value}`);
      }

      if (testName.includes('wbc') && (value > 15000 || value < 4000)) {
        score += 15;
        factors.push(`Abnormal WBC: ${value}`);
      }
    }

    return score;
  }

  analyzeClinicalHistory(patientData, factors) {
    let score = 0;
    const history = patientData.past_history || patientData.pastHistory || [];

    // High-risk conditions
    const highRiskConditions = ['heart failure', 'copd', 'sepsis', 'stroke', 'renal failure'];
    for (const condition of highRiskConditions) {
      if (history.some(h => h.toLowerCase().includes(condition))) {
        score += 15;
        factors.push(`History of ${condition}`);
      }
    }

    // Age factor
    if (patientData.age >= 75) {
      score += 10;
      factors.push(`Advanced age: ${patientData.age} years`);
    }

    return score;
  }

  analyzeCurrentStatus(patientData, factors) {
    let score = 0;

    // Current medications indicating severity
    const medications = patientData.current_medications || patientData.currentMedications || [];
    const criticalMeds = ['vasopressor', 'inotrope', 'ventilator', 'dialysis'];
    
    for (const med of medications) {
      const medName = (med.name || med.medication_name || '').toLowerCase();
      if (criticalMeds.some(cm => medName.includes(cm))) {
        score += 20;
        factors.push(`Critical medication/support: ${med.name || med.medication_name}`);
      }
    }

    return score;
  }
}

/**
 * Population Health Analyzer
 */
class PopulationHealthAnalyzer {
  constructor() {
    this.minCohortSize = 10;
  }

  analyzeCohort(patientCohort) {
    const demographics = this.analyzeDemographics(patientCohort);
    const conditions = this.analyzeConditions(patientCohort);
    const outcomes = this.analyzeOutcomes(patientCohort);

    return {
      demographics,
      conditions,
      outcomes,
      cohortSize: patientCohort.length
    };
  }

  analyzeDemographics(patientCohort) {
    const ageGroups = { '0-17': 0, '18-44': 0, '45-64': 0, '65+': 0 };
    const genderDistribution = { male: 0, female: 0, other: 0 };

    for (const patient of patientCohort) {
      // Age distribution
      const age = patient.age || 0;
      if (age < 18) ageGroups['0-17']++;
      else if (age < 45) ageGroups['18-44']++;
      else if (age < 65) ageGroups['45-64']++;
      else ageGroups['65+']++;

      // Gender distribution
      const gender = (patient.gender || 'other').toLowerCase();
      if (gender === 'male' || gender === 'female') {
        genderDistribution[gender]++;
      } else {
        genderDistribution.other++;
      }
    }

    return {
      ageGroups,
      genderDistribution,
      averageAge: this.calculateAverageAge(patientCohort)
    };
  }

  analyzeConditions(patientCohort) {
    const conditionCounts = {};
    const comorbidityPatterns = [];

    for (const patient of patientCohort) {
      const history = patient.past_history || patient.pastHistory || [];
      
      for (const condition of history) {
        const normalizedCondition = condition.toLowerCase().trim();
        conditionCounts[normalizedCondition] = (conditionCounts[normalizedCondition] || 0) + 1;
      }

      // Track comorbidity patterns
      if (history.length >= 2) {
        comorbidityPatterns.push({
          patientId: patient.id || patient.patient_id,
          conditions: history,
          count: history.length
        });
      }
    }

    // Sort conditions by prevalence
    const topConditions = Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([condition, count]) => ({
        condition,
        count,
        prevalence: ((count / patientCohort.length) * 100).toFixed(1) + '%'
      }));

    return {
      topConditions,
      comorbidityRate: ((comorbidityPatterns.length / patientCohort.length) * 100).toFixed(1) + '%',
      averageConditionsPerPatient: (comorbidityPatterns.reduce((sum, p) => sum + p.count, 0) / patientCohort.length).toFixed(1)
    };
  }

  analyzeOutcomes(patientCohort) {
    let readmissionCount = 0;
    let averageLengthOfStay = 0;
    let mortalityCount = 0;

    for (const patient of patientCohort) {
      if (patient.readmitted) readmissionCount++;
      if (patient.lengthOfStay) averageLengthOfStay += patient.lengthOfStay;
      if (patient.deceased) mortalityCount++;
    }

    return {
      readmissionRate: ((readmissionCount / patientCohort.length) * 100).toFixed(1) + '%',
      averageLengthOfStay: (averageLengthOfStay / patientCohort.length).toFixed(1) + ' days',
      mortalityRate: ((mortalityCount / patientCohort.length) * 100).toFixed(1) + '%'
    };
  }

  identifyTrends(patientCohort) {
    const trends = [];

    // Identify age-related trends
    const elderlyPatients = patientCohort.filter(p => p.age >= 65);
    if (elderlyPatients.length / patientCohort.length > 0.5) {
      trends.push({
        type: 'demographic',
        trend: 'aging_population',
        description: 'Majority of cohort is elderly (65+)',
        significance: 'high',
        percentage: ((elderlyPatients.length / patientCohort.length) * 100).toFixed(1) + '%'
      });
    }

    // Identify chronic disease trends
    const chronicDiseases = ['diabetes', 'hypertension', 'heart failure', 'copd'];
    for (const disease of chronicDiseases) {
      const affectedCount = patientCohort.filter(p => {
        const history = p.past_history || p.pastHistory || [];
        return history.some(h => h.toLowerCase().includes(disease));
      }).length;

      if (affectedCount / patientCohort.length > 0.3) {
        trends.push({
          type: 'clinical',
          trend: `high_${disease.replace(' ', '_')}_prevalence`,
          description: `High prevalence of ${disease} in cohort`,
          significance: 'moderate',
          percentage: ((affectedCount / patientCohort.length) * 100).toFixed(1) + '%'
        });
      }
    }

    // Identify medication trends
    const medicationUsage = {};
    for (const patient of patientCohort) {
      const medications = patient.current_medications || patient.currentMedications || [];
      for (const med of medications) {
        const medName = (med.name || med.medication_name || '').toLowerCase();
        medicationUsage[medName] = (medicationUsage[medName] || 0) + 1;
      }
    }

    const commonMedications = Object.entries(medicationUsage)
      .filter(([_, count]) => count / patientCohort.length > 0.2)
      .map(([med, count]) => ({
        medication: med,
        usage: ((count / patientCohort.length) * 100).toFixed(1) + '%'
      }));

    if (commonMedications.length > 0) {
      trends.push({
        type: 'medication',
        trend: 'common_medication_patterns',
        description: 'Identified common medication usage patterns',
        significance: 'moderate',
        medications: commonMedications
      });
    }

    return trends;
  }

  stratifyRisk(patientCohort) {
    const riskLevels = { low: 0, moderate: 0, high: 0, critical: 0 };

    for (const patient of patientCohort) {
      const riskScore = this.calculatePatientRiskScore(patient);
      
      if (riskScore >= 80) riskLevels.critical++;
      else if (riskScore >= 60) riskLevels.high++;
      else if (riskScore >= 40) riskLevels.moderate++;
      else riskLevels.low++;
    }

    return {
      distribution: riskLevels,
      percentages: {
        low: ((riskLevels.low / patientCohort.length) * 100).toFixed(1) + '%',
        moderate: ((riskLevels.moderate / patientCohort.length) * 100).toFixed(1) + '%',
        high: ((riskLevels.high / patientCohort.length) * 100).toFixed(1) + '%',
        critical: ((riskLevels.critical / patientCohort.length) * 100).toFixed(1) + '%'
      },
      highRiskCount: riskLevels.high + riskLevels.critical
    };
  }

  predictOutcomes(patientCohort) {
    let predictedReadmissions = 0;
    let predictedComplications = 0;

    for (const patient of patientCohort) {
      const riskScore = this.calculatePatientRiskScore(patient);
      
      // Predict readmission risk
      if (riskScore >= 60) {
        predictedReadmissions++;
      }

      // Predict complication risk
      if (riskScore >= 70) {
        predictedComplications++;
      }
    }

    return {
      predictedReadmissionRate: ((predictedReadmissions / patientCohort.length) * 100).toFixed(1) + '%',
      predictedComplicationRate: ((predictedComplications / patientCohort.length) * 100).toFixed(1) + '%',
      highRiskPatients: predictedComplications,
      confidence: 75
    };
  }

  calculatePatientRiskScore(patient) {
    let score = 0;

    // Age factor
    if (patient.age >= 75) score += 20;
    else if (patient.age >= 65) score += 10;

    // Comorbidity factor
    const history = patient.past_history || patient.pastHistory || [];
    score += Math.min(30, history.length * 5);

    // Vital signs factor
    const vitals = patient.vitals || {};
    if (vitals.bp) {
      const [systolic] = vitals.bp.split('/').map(Number);
      if (systolic > 160 || systolic < 90) score += 15;
    }
    if (vitals.spo2 && parseInt(vitals.spo2) < 92) score += 20;

    // Medication factor
    const medications = patient.current_medications || patient.currentMedications || [];
    if (medications.length >= 5) score += 10;

    return Math.min(100, score);
  }

  calculateAverageAge(patientCohort) {
    const totalAge = patientCohort.reduce((sum, p) => sum + (p.age || 0), 0);
    return (totalAge / patientCohort.length).toFixed(1);
  }
}

/**
 * Trend Analyzer
 */
class TrendAnalyzer {
  constructor() {
    this.minDataPoints = 3;
  }

  analyzeVitalTrends(timeSeriesData) {
    const trends = [];

    // Group data by vital sign type
    const vitalGroups = this.groupByVitalType(timeSeriesData);

    for (const [vitalType, dataPoints] of Object.entries(vitalGroups)) {
      if (dataPoints.length < this.minDataPoints) continue;

      const trend = this.calculateTrend(dataPoints);
      trends.push({
        vitalType,
        direction: trend.direction,
        slope: trend.slope,
        confidence: trend.confidence,
        dataPoints: dataPoints.length,
        currentValue: dataPoints[dataPoints.length - 1].value,
        change: trend.change
      });
    }

    return trends;
  }

  groupByVitalType(timeSeriesData) {
    const groups = {};

    for (const dataPoint of timeSeriesData) {
      const vitalType = dataPoint.vitalType || dataPoint.type || 'unknown';
      if (!groups[vitalType]) {
        groups[vitalType] = [];
      }
      groups[vitalType].push(dataPoint);
    }

    // Sort each group by timestamp
    for (const vitalType in groups) {
      groups[vitalType].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    return groups;
  }

  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) {
      return { direction: 'stable', slope: 0, confidence: 0, change: 0 };
    }

    // Simple linear regression
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = parseFloat(dataPoints[i].value);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const firstValue = parseFloat(dataPoints[0].value);
    const lastValue = parseFloat(dataPoints[dataPoints.length - 1].value);
    const change = ((lastValue - firstValue) / firstValue * 100).toFixed(1);

    // Determine direction
    let direction = 'stable';
    if (Math.abs(slope) > 0.5) {
      direction = slope > 0 ? 'increasing' : 'decreasing';
    }

    // Calculate confidence based on data consistency
    const confidence = Math.min(95, 50 + (n * 5));

    return {
      direction,
      slope: slope.toFixed(3),
      confidence,
      change: parseFloat(change)
    };
  }

  predictFutureTrends(timeSeriesData) {
    const predictions = [];
    const vitalGroups = this.groupByVitalType(timeSeriesData);

    for (const [vitalType, dataPoints] of Object.entries(vitalGroups)) {
      if (dataPoints.length < this.minDataPoints) continue;

      const trend = this.calculateTrend(dataPoints);
      const lastValue = parseFloat(dataPoints[dataPoints.length - 1].value);
      const predictedValue = lastValue + (parseFloat(trend.slope) * 2); // Predict 2 time units ahead

      predictions.push({
        vitalType,
        currentValue: lastValue,
        predictedValue: predictedValue.toFixed(2),
        predictionWindow: '2-4 hours',
        confidence: Math.max(50, trend.confidence - 10),
        trend: trend.direction
      });
    }

    return predictions;
  }

  calculateTrendSignificance(vitalTrends) {
    const significance = [];

    for (const trend of vitalTrends) {
      let level = 'low';
      let clinicalImportance = 'Monitor';

      // Determine significance based on vital type and trend
      if (trend.vitalType === 'oxygen_saturation' && trend.direction === 'decreasing') {
        level = 'high';
        clinicalImportance = 'Immediate attention required';
      } else if (trend.vitalType === 'blood_pressure' && Math.abs(trend.change) > 20) {
        level = 'high';
        clinicalImportance = 'Significant hemodynamic change';
      } else if (trend.vitalType === 'heart_rate' && Math.abs(trend.change) > 15) {
        level = 'moderate';
        clinicalImportance = 'Notable cardiac change';
      } else if (Math.abs(trend.change) > 10) {
        level = 'moderate';
        clinicalImportance = 'Clinically relevant change';
      }

      significance.push({
        vitalType: trend.vitalType,
        significanceLevel: level,
        clinicalImportance,
        changePercentage: trend.change + '%'
      });
    }

    return significance;
  }
}

/**
 * Anomaly Detector
 */
class AnomalyDetector {
  constructor() {
    this.zScoreThreshold = 2.0; // Standard deviations from mean (lowered for better sensitivity)
  }

  detectAnomalies(timeSeriesData) {
    const anomalies = [];
    const vitalGroups = this.groupByVitalType(timeSeriesData);

    for (const [vitalType, dataPoints] of Object.entries(vitalGroups)) {
      if (dataPoints.length < 3) continue; // Need at least 3 data points for anomaly detection

      const values = dataPoints.map(dp => parseFloat(dp.value));
      const mean = this.calculateMean(values);
      const stdDev = this.calculateStdDev(values, mean);

      // Skip if standard deviation is too small (all values are similar)
      if (stdDev < 0.01) continue;

      for (let i = 0; i < dataPoints.length; i++) {
        const value = values[i];
        const zScore = Math.abs((value - mean) / stdDev);

        if (zScore > this.zScoreThreshold) {
          anomalies.push({
            vitalType,
            timestamp: dataPoints[i].timestamp,
            value,
            expectedRange: {
              min: (mean - this.zScoreThreshold * stdDev).toFixed(2),
              max: (mean + this.zScoreThreshold * stdDev).toFixed(2)
            },
            zScore: zScore.toFixed(2),
            severity: this.calculateAnomalySeverity(zScore),
            clinicalSignificance: this.assessClinicalSignificance(vitalType, value, mean)
          });
        }
      }
    }

    return anomalies;
  }

  groupByVitalType(timeSeriesData) {
    const groups = {};
    for (const dataPoint of timeSeriesData) {
      const vitalType = dataPoint.vitalType || dataPoint.type || 'unknown';
      if (!groups[vitalType]) {
        groups[vitalType] = [];
      }
      groups[vitalType].push(dataPoint);
    }
    return groups;
  }

  calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateStdDev(values, mean) {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  calculateAnomalySeverity(zScore) {
    if (zScore > 4) return 'critical';
    if (zScore > 3) return 'high';
    if (zScore > 2.5) return 'moderate';
    return 'low';
  }

  assessClinicalSignificance(vitalType, value, mean) {
    const deviation = ((value - mean) / mean * 100).toFixed(1);
    
    if (vitalType === 'oxygen_saturation' && value < mean) {
      return `Oxygen saturation ${deviation}% below baseline - requires immediate attention`;
    }
    if (vitalType === 'blood_pressure' && Math.abs(value - mean) > 20) {
      return `Significant blood pressure deviation - monitor closely`;
    }
    if (vitalType === 'heart_rate' && Math.abs(value - mean) > 20) {
      return `Notable heart rate change - assess patient status`;
    }
    
    return `${vitalType} deviation of ${deviation}% from baseline`;
  }
}

module.exports = PredictiveAnalyticsService;
