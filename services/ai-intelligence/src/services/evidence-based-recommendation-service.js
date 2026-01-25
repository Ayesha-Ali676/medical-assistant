/**
 * Evidence-Based Recommendation Engine
 * 
 * Provides clinical guideline recommendations with source citations
 * and evidence linking for clinical decision support.
 * 
 * Requirements: 2.3
 */

class EvidenceBasedRecommendationService {
  constructor() {
    // Clinical guidelines database
    this.guidelines = new Map();
    
    // Evidence sources
    this.evidenceSources = new Map();
    
    // Recommendation cache
    this.recommendationCache = new Map();
    
    // Initialize with common clinical guidelines
    this.initializeGuidelines();
  }

  /**
   * Initialize common clinical guidelines
   */
  initializeGuidelines() {
    // Cardiovascular guidelines
    this.addGuideline({
      guidelineId: 'cv-001',
      category: 'cardiovascular',
      condition: 'hypertension',
      title: 'Management of Hypertension in Adults',
      recommendations: [
        {
          id: 'cv-001-r1',
          text: 'For adults with confirmed hypertension and known CVD or 10-year ASCVD risk ≥10%, a BP target of <130/80 mm Hg is recommended',
          strength: 'STRONG',
          evidenceLevel: 'A',
          sources: ['ACC/AHA 2017', 'PMID: 29146535']
        },
        {
          id: 'cv-001-r2',
          text: 'Lifestyle modifications including weight loss, DASH diet, sodium reduction, and increased physical activity are recommended for all patients',
          strength: 'STRONG',
          evidenceLevel: 'A',
          sources: ['ACC/AHA 2017', 'PMID: 29146535']
        }
      ],
      lastUpdated: new Date('2017-11-13')
    });

    // Diabetes guidelines
    this.addGuideline({
      guidelineId: 'dm-001',
      category: 'endocrinology',
      condition: 'type2_diabetes',
      title: 'Standards of Medical Care in Diabetes',
      recommendations: [
        {
          id: 'dm-001-r1',
          text: 'A1C target of <7% is appropriate for most adults with diabetes to reduce microvascular complications',
          strength: 'STRONG',
          evidenceLevel: 'A',
          sources: ['ADA 2024', 'PMID: 38078589']
        },
        {
          id: 'dm-001-r2',
          text: 'Metformin is the preferred initial pharmacologic agent for type 2 diabetes unless contraindicated',
          strength: 'STRONG',
          evidenceLevel: 'A',
          sources: ['ADA 2024', 'PMID: 38078589']
        }
      ],
      lastUpdated: new Date('2024-01-01')
    });

    // Antibiotic stewardship
    this.addGuideline({
      guidelineId: 'id-001',
      category: 'infectious_disease',
      condition: 'community_acquired_pneumonia',
      title: 'Community-Acquired Pneumonia Treatment Guidelines',
      recommendations: [
        {
          id: 'id-001-r1',
          text: 'For outpatient treatment of CAP in adults without comorbidities, amoxicillin or doxycycline is recommended',
          strength: 'STRONG',
          evidenceLevel: 'A',
          sources: ['IDSA/ATS 2019', 'PMID: 31573350']
        },
        {
          id: 'id-001-r2',
          text: 'Empiric antibiotic therapy should be initiated within 4 hours of hospital arrival for patients with CAP',
          strength: 'STRONG',
          evidenceLevel: 'B',
          sources: ['IDSA/ATS 2019', 'PMID: 31573350']
        }
      ],
      lastUpdated: new Date('2019-10-01')
    });

    // Anticoagulation guidelines
    this.addGuideline({
      guidelineId: 'cv-002',
      category: 'cardiovascular',
      condition: 'atrial_fibrillation',
      title: 'Anticoagulation for Atrial Fibrillation',
      recommendations: [
        {
          id: 'cv-002-r1',
          text: 'For patients with nonvalvular AF and CHA2DS2-VASc score ≥2 in men or ≥3 in women, oral anticoagulation is recommended',
          strength: 'STRONG',
          evidenceLevel: 'A',
          sources: ['AHA/ACC/HRS 2019', 'PMID: 30686041']
        },
        {
          id: 'cv-002-r2',
          text: 'Direct oral anticoagulants (DOACs) are preferred over warfarin for most patients with nonvalvular AF',
          strength: 'STRONG',
          evidenceLevel: 'A',
          sources: ['AHA/ACC/HRS 2019', 'PMID: 30686041']
        }
      ],
      lastUpdated: new Date('2019-01-28')
    });
  }

  /**
   * Add a clinical guideline to the database
   * @param {Object} guideline - Guideline object
   */
  addGuideline(guideline) {
    this.guidelines.set(guideline.guidelineId, guideline);
    
    // Index by condition for faster lookup
    const conditionKey = `condition:${guideline.condition}`;
    if (!this.guidelines.has(conditionKey)) {
      this.guidelines.set(conditionKey, []);
    }
    this.guidelines.get(conditionKey).push(guideline.guidelineId);
  }

  /**
   * Get recommendations for a clinical scenario
   * @param {Object} clinicalScenario - Clinical scenario details
   * @returns {Object} Recommendations with evidence
   */
  getRecommendations(clinicalScenario) {
    const {
      condition,
      patientAge,
      comorbidities = [],
      currentMedications = [],
      labResults = {},
      vitalSigns = {}
    } = clinicalScenario;

    if (!condition) {
      throw new Error('Clinical condition is required');
    }

    // Check cache
    const cacheKey = this.generateCacheKey(clinicalScenario);
    if (this.recommendationCache.has(cacheKey)) {
      return this.recommendationCache.get(cacheKey);
    }

    // Find relevant guidelines
    const relevantGuidelines = this.findRelevantGuidelines(condition);

    if (relevantGuidelines.length === 0) {
      return {
        condition,
        recommendations: [],
        message: 'No specific guidelines found for this condition',
        disclaimer: 'For physician review only'
      };
    }

    // Extract and rank recommendations
    const recommendations = this.extractRecommendations(
      relevantGuidelines,
      clinicalScenario
    );

    // Add contextual information
    const contextualizedRecommendations = this.contextualizeRecommendations(
      recommendations,
      clinicalScenario
    );

    const result = {
      condition,
      patientContext: {
        age: patientAge,
        comorbidities,
        currentMedications: currentMedications.length
      },
      recommendations: contextualizedRecommendations,
      guidelinesConsulted: relevantGuidelines.map(g => ({
        title: g.title,
        source: g.guidelineId,
        lastUpdated: g.lastUpdated
      })),
      generatedAt: new Date(),
      disclaimer: 'For physician review only. Clinical judgment should always supersede guideline recommendations.'
    };

    // Cache result
    this.recommendationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Find relevant guidelines for a condition
   * @param {string} condition - Clinical condition
   * @returns {Array} Relevant guidelines
   */
  findRelevantGuidelines(condition) {
    const guidelines = [];
    const conditionKey = `condition:${condition}`;

    if (this.guidelines.has(conditionKey)) {
      const guidelineIds = this.guidelines.get(conditionKey);
      for (const id of guidelineIds) {
        guidelines.push(this.guidelines.get(id));
      }
    }

    return guidelines;
  }

  /**
   * Extract recommendations from guidelines
   * @param {Array} guidelines - Relevant guidelines
   * @param {Object} clinicalScenario - Clinical scenario
   * @returns {Array} Extracted recommendations
   */
  extractRecommendations(guidelines, clinicalScenario) {
    const recommendations = [];

    for (const guideline of guidelines) {
      for (const rec of guideline.recommendations) {
        // Check if recommendation is applicable
        if (this.isRecommendationApplicable(rec, clinicalScenario)) {
          recommendations.push({
            ...rec,
            guidelineTitle: guideline.title,
            guidelineId: guideline.guidelineId,
            category: guideline.category
          });
        }
      }
    }

    // Sort by strength and evidence level
    return recommendations.sort((a, b) => {
      const strengthOrder = { 'STRONG': 0, 'MODERATE': 1, 'WEAK': 2 };
      const evidenceOrder = { 'A': 0, 'B': 1, 'C': 2 };
      
      const strengthDiff = strengthOrder[a.strength] - strengthOrder[b.strength];
      if (strengthDiff !== 0) return strengthDiff;
      
      return evidenceOrder[a.evidenceLevel] - evidenceOrder[b.evidenceLevel];
    });
  }

  /**
   * Check if recommendation is applicable to clinical scenario
   * @param {Object} recommendation - Recommendation
   * @param {Object} clinicalScenario - Clinical scenario
   * @returns {boolean} Whether recommendation is applicable
   */
  isRecommendationApplicable(recommendation, clinicalScenario) {
    // For this minimal implementation, all recommendations are considered applicable
    // In production, this would include complex logic for contraindications,
    // patient-specific factors, etc.
    return true;
  }

  /**
   * Contextualize recommendations based on patient scenario
   * @param {Array} recommendations - Recommendations
   * @param {Object} clinicalScenario - Clinical scenario
   * @returns {Array} Contextualized recommendations
   */
  contextualizeRecommendations(recommendations, clinicalScenario) {
    return recommendations.map(rec => {
      const contextualized = { ...rec };

      // Add applicability notes based on patient factors
      const notes = [];

      if (clinicalScenario.patientAge) {
        if (clinicalScenario.patientAge < 18) {
          notes.push('Pediatric dosing and considerations may apply');
        } else if (clinicalScenario.patientAge > 65) {
          notes.push('Geriatric considerations may apply');
        }
      }

      if (clinicalScenario.comorbidities && clinicalScenario.comorbidities.length > 0) {
        notes.push(`Consider interactions with comorbidities: ${clinicalScenario.comorbidities.join(', ')}`);
      }

      if (notes.length > 0) {
        contextualized.clinicalNotes = notes;
      }

      return contextualized;
    });
  }

  /**
   * Generate cache key for clinical scenario
   * @param {Object} clinicalScenario - Clinical scenario
   * @returns {string} Cache key
   */
  generateCacheKey(clinicalScenario) {
    const { condition, patientAge, comorbidities = [] } = clinicalScenario;
    return `${condition}:${patientAge}:${comorbidities.sort().join(',')}`;
  }

  /**
   * Search guidelines by keyword
   * @param {string} keyword - Search keyword
   * @returns {Array} Matching guidelines
   */
  searchGuidelines(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();

    for (const [id, guideline] of this.guidelines) {
      if (id.startsWith('condition:')) continue;

      const titleMatch = guideline.title.toLowerCase().includes(searchTerm);
      const conditionMatch = guideline.condition.toLowerCase().includes(searchTerm);
      const categoryMatch = guideline.category.toLowerCase().includes(searchTerm);

      if (titleMatch || conditionMatch || categoryMatch) {
        results.push({
          guidelineId: guideline.guidelineId,
          title: guideline.title,
          condition: guideline.condition,
          category: guideline.category,
          recommendationCount: guideline.recommendations.length,
          lastUpdated: guideline.lastUpdated
        });
      }
    }

    return results;
  }

  /**
   * Get guideline details by ID
   * @param {string} guidelineId - Guideline ID
   * @returns {Object} Guideline details
   */
  getGuidelineDetails(guidelineId) {
    const guideline = this.guidelines.get(guidelineId);
    
    if (!guideline) {
      return null;
    }

    return {
      ...guideline,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Get all guidelines by category
   * @param {string} category - Category name
   * @returns {Array} Guidelines in category
   */
  getGuidelinesByCategory(category) {
    const results = [];

    for (const [id, guideline] of this.guidelines) {
      if (id.startsWith('condition:')) continue;

      if (guideline.category === category) {
        results.push({
          guidelineId: guideline.guidelineId,
          title: guideline.title,
          condition: guideline.condition,
          recommendationCount: guideline.recommendations.length,
          lastUpdated: guideline.lastUpdated
        });
      }
    }

    return results;
  }

  /**
   * Get evidence source details
   * @param {string} sourceId - Source identifier (e.g., PMID)
   * @returns {Object} Source details
   */
  getEvidenceSource(sourceId) {
    // In production, this would query a medical literature database
    // For now, return basic information
    if (sourceId.startsWith('PMID:')) {
      const pmid = sourceId.split(':')[1].trim();
      return {
        sourceId,
        type: 'PubMed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        citation: `PubMed ID: ${pmid}`
      };
    }

    return {
      sourceId,
      type: 'Clinical Guideline',
      citation: sourceId
    };
  }

  /**
   * Validate recommendation against patient contraindications
   * @param {Object} recommendation - Recommendation
   * @param {Object} patientData - Patient data
   * @returns {Object} Validation result
   */
  validateRecommendation(recommendation, patientData) {
    const warnings = [];
    const contraindications = [];

    // Check for basic contraindications
    if (patientData.allergies) {
      // In production, this would check drug allergies against recommendations
      warnings.push('Check for drug allergies before prescribing');
    }

    if (patientData.renalFunction && patientData.renalFunction < 30) {
      warnings.push('Renal dose adjustment may be required');
    }

    if (patientData.hepaticFunction && patientData.hepaticFunction === 'impaired') {
      warnings.push('Hepatic dose adjustment may be required');
    }

    return {
      recommendationId: recommendation.id,
      applicable: contraindications.length === 0,
      contraindications,
      warnings,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Get recommendation statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    let totalGuidelines = 0;
    let totalRecommendations = 0;
    const categoryCounts = {};

    for (const [id, guideline] of this.guidelines) {
      if (id.startsWith('condition:')) continue;

      totalGuidelines++;
      totalRecommendations += guideline.recommendations.length;

      categoryCounts[guideline.category] = (categoryCounts[guideline.category] || 0) + 1;
    }

    return {
      totalGuidelines,
      totalRecommendations,
      categoryCounts,
      cacheSize: this.recommendationCache.size
    };
  }

  /**
   * Clear recommendation cache
   */
  clearCache() {
    this.recommendationCache.clear();
  }

  /**
   * Clear all data (for testing)
   */
  clearAll() {
    this.guidelines.clear();
    this.evidenceSources.clear();
    this.recommendationCache.clear();
  }
}

module.exports = EvidenceBasedRecommendationService;
