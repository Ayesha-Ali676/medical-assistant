/**
 * Triage Service - Patient Priority Scoring and Queue Management
 * For physician review only
 */

const { RiskScoringModel } = require('../models/risk-scoring');
const { TriageScore } = require('../../../shared/models/clinical');
const { v4: uuidv4 } = require('uuid');

class TriageService {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.riskModel = new RiskScoringModel();
    this.priorityThresholds = {
      CRITICAL: 80,
      HIGH: 60,
      NORMAL: 0
    };
  }

  /**
   * Calculate patient triage priority
   */
  async calculateTriagePriority(patientData, tenantId) {
    try {
      // Calculate multi-dimensional risk scores
      const riskAssessment = this.riskModel.calculateRiskScores(patientData);
      
      // Determine priority level based on overall risk
      const priorityLevel = this.determinePriorityLevel(riskAssessment.overallRisk.score);
      
      // Create triage score object
      const triageScore = new TriageScore();
      triageScore.patientId = patientData.id || patientData.patient_id;
      triageScore.encounterId = patientData.encounter_id;
      triageScore.priorityLevel = priorityLevel;
      triageScore.urgencyScore = riskAssessment.overallRisk.score;
      triageScore.factors = this.extractFactors(riskAssessment);
      triageScore.explanation = this.generateExplanation(riskAssessment, priorityLevel);
      triageScore.tenantId = tenantId;
      triageScore.createdBy = patientData.created_by || 'system';

      // Save to database
      await this.saveTriageScore(triageScore);

      return {
        triageScore,
        riskAssessment,
        recommendations: this.generateRecommendations(riskAssessment, priorityLevel),
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Triage calculation failed: ${error.message}`);
    }
  }

  /**
   * Get patient queue ordered by priority
   */
  async getPatientQueue(tenantId, filters = {}) {
    try {
      const query = `
        SELECT 
          ts.*,
          p.family_name,
          p.given_names,
          p.birth_date,
          ce.encounter_type,
          ce.start_time as encounter_start
        FROM triage_scores ts
        JOIN patients p ON ts.patient_id = p.id
        LEFT JOIN clinical_encounters ce ON ts.encounter_id = ce.id
        WHERE ts.tenant_id = $1
          AND ts.expires_at > NOW()
          ${filters.priorityLevel ? 'AND ts.priority_level = $2' : ''}
        ORDER BY 
          CASE ts.priority_level 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'NORMAL' THEN 3 
          END,
          ts.urgency_score DESC,
          ts.calculated_at ASC
      `;

      const params = [tenantId];
      if (filters.priorityLevel) {
        params.push(filters.priorityLevel);
      }

      const result = await this.dbManager.executeQuery(query, params);
      
      return result.rows.map(row => ({
        triageId: row.id,
        patientId: row.patient_id,
        patientName: `${row.given_names.join(' ')} ${row.family_name}`,
        priorityLevel: row.priority_level,
        urgencyScore: row.urgency_score,
        factors: row.factors,
        explanation: row.explanation,
        calculatedAt: row.calculated_at,
        encounterType: row.encounter_type,
        encounterStart: row.encounter_start,
        disclaimer: 'For physician review only'
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve patient queue: ${error.message}`);
    }
  }

  /**
   * Update triage priority for a patient
   */
  async updateTriagePriority(patientId, newPriority, physicianId, tenantId) {
    try {
      const query = `
        UPDATE triage_scores 
        SET 
          priority_level = $1,
          updated_at = NOW(),
          updated_by = $2
        WHERE patient_id = $3 
          AND tenant_id = $4
          AND expires_at > NOW()
        RETURNING *
      `;

      const result = await this.dbManager.executeQuery(query, [
        newPriority, physicianId, patientId, tenantId
      ]);

      if (result.rows.length === 0) {
        throw new Error('No active triage score found for patient');
      }

      // Log the priority change in audit trail
      await this.logPriorityChange(patientId, newPriority, physicianId, tenantId);

      return {
        success: true,
        updatedScore: result.rows[0],
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Failed to update triage priority: ${error.message}`);
    }
  }

  /**
   * Get triage statistics for dashboard
   */
  async getTriageStatistics(tenantId, timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const query = `
        SELECT 
          priority_level,
          COUNT(*) as count,
          AVG(urgency_score) as avg_score,
          MAX(urgency_score) as max_score
        FROM triage_scores 
        WHERE tenant_id = $1 
          AND calculated_at >= $2
          AND expires_at > NOW()
        GROUP BY priority_level
        ORDER BY 
          CASE priority_level 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'NORMAL' THEN 3 
          END
      `;

      const result = await this.dbManager.executeQuery(query, [tenantId, timeFilter]);
      
      const totalPatients = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
      
      return {
        totalPatients,
        priorityBreakdown: result.rows.map(row => ({
          level: row.priority_level,
          count: parseInt(row.count),
          percentage: Math.round((parseInt(row.count) / totalPatients) * 100),
          averageScore: Math.round(parseFloat(row.avg_score)),
          maxScore: parseInt(row.max_score)
        })),
        timeRange,
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Failed to retrieve triage statistics: ${error.message}`);
    }
  }

  /**
   * Recalculate triage for all active patients
   */
  async recalculateAllTriage(tenantId) {
    try {
      // Get all active patients with recent encounters
      const query = `
        SELECT DISTINCT p.*, ce.id as encounter_id
        FROM patients p
        JOIN clinical_encounters ce ON p.id = ce.patient_id
        WHERE p.tenant_id = $1 
          AND ce.status = 'in-progress'
          AND ce.start_time >= NOW() - INTERVAL '24 hours'
      `;

      const result = await this.dbManager.executeQuery(query, [tenantId]);
      const recalculatedCount = result.rows.length;
      
      // Recalculate triage for each patient
      for (const patientRow of result.rows) {
        const patientData = this.formatPatientData(patientRow);
        await this.calculateTriagePriority(patientData, tenantId);
      }

      return {
        success: true,
        recalculatedCount,
        message: `Recalculated triage for ${recalculatedCount} patients`,
        disclaimer: 'For physician review only'
      };
    } catch (error) {
      throw new Error(`Failed to recalculate triage: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Determine priority level from risk score
   */
  determinePriorityLevel(riskScore) {
    if (riskScore >= this.priorityThresholds.CRITICAL) return 'CRITICAL';
    if (riskScore >= this.priorityThresholds.HIGH) return 'HIGH';
    return 'NORMAL';
  }

  /**
   * Extract key factors from risk assessment
   */
  extractFactors(riskAssessment) {
    const factors = [];
    
    for (const [category, risk] of Object.entries(riskAssessment.riskCategories)) {
      if (risk.factors && risk.factors.length > 0) {
        factors.push(...risk.factors.map(factor => `${category}: ${factor}`));
      }
    }
    
    return factors;
  }

  /**
   * Generate explanation for triage decision
   */
  generateExplanation(riskAssessment, priorityLevel) {
    const explanations = [];
    
    explanations.push(`Overall risk score: ${riskAssessment.overallRisk.score}/100`);
    explanations.push(`Priority level: ${priorityLevel}`);
    
    // Add category-specific explanations
    for (const [category, risk] of Object.entries(riskAssessment.riskCategories)) {
      if (risk.score > 40) {
        explanations.push(`${category} risk: ${risk.level} (${risk.score}/100)`);
      }
    }
    
    return explanations;
  }

  /**
   * Generate clinical recommendations
   */
  generateRecommendations(riskAssessment, priorityLevel) {
    const recommendations = [];
    
    // Priority-based recommendations
    switch (priorityLevel) {
      case 'CRITICAL':
        recommendations.push('Immediate physician evaluation required');
        recommendations.push('Consider continuous monitoring');
        break;
      case 'HIGH':
        recommendations.push('Physician evaluation within 30 minutes');
        recommendations.push('Frequent vital sign monitoring');
        break;
      case 'NORMAL':
        recommendations.push('Standard monitoring protocol');
        break;
    }
    
    // Category-specific recommendations
    for (const [category, risk] of Object.entries(riskAssessment.riskCategories)) {
      if (risk.recommendations && risk.recommendations.length > 0) {
        recommendations.push(...risk.recommendations);
      }
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Save triage score to database
   */
  async saveTriageScore(triageScore) {
    const query = `
      INSERT INTO triage_scores (
        id, patient_id, encounter_id, priority_level, urgency_score,
        factors, explanation, calculated_at, expires_at, created_by, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (patient_id, tenant_id) 
      DO UPDATE SET
        priority_level = EXCLUDED.priority_level,
        urgency_score = EXCLUDED.urgency_score,
        factors = EXCLUDED.factors,
        explanation = EXCLUDED.explanation,
        calculated_at = EXCLUDED.calculated_at,
        expires_at = EXCLUDED.expires_at
      RETURNING *
    `;

    const values = [
      triageScore.id,
      triageScore.patientId,
      triageScore.encounterId,
      triageScore.priorityLevel,
      triageScore.urgencyScore,
      JSON.stringify(triageScore.factors),
      JSON.stringify(triageScore.explanation),
      triageScore.calculatedAt,
      triageScore.expiresAt,
      triageScore.createdBy,
      triageScore.tenantId
    ];

    return await this.dbManager.executeQuery(query, values);
  }

  /**
   * Log priority change in audit trail
   */
  async logPriorityChange(patientId, newPriority, physicianId, tenantId) {
    const auditQuery = `
      INSERT INTO audit_trail (
        id, user_id, patient_id, action, system_recommendation, 
        physician_decision, created_at, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
    `;

    const auditValues = [
      uuidv4(),
      physicianId,
      patientId,
      'triage_priority_update',
      'System calculated priority based on clinical data',
      `Physician updated priority to ${newPriority}`,
      tenantId
    ];

    await this.dbManager.executeQuery(auditQuery, auditValues);
  }

  /**
   * Get time filter for statistics
   */
  getTimeFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Format patient data for risk calculation
   */
  formatPatientData(patientRow) {
    return {
      id: patientRow.id,
      patient_id: patientRow.id,
      encounter_id: patientRow.encounter_id,
      age: this.calculateAge(patientRow.birth_date),
      vitals: patientRow.vitals || {},
      past_history: patientRow.past_history || [],
      current_medications: patientRow.current_medications || [],
      lab_results: patientRow.lab_results || []
    };
  }

  /**
   * Calculate age from birth date
   */
  calculateAge(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }
}

module.exports = TriageService;