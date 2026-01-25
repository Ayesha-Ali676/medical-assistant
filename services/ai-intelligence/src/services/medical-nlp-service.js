/**
 * Medical NLP Processing Service
 * Extracts clinical entities, symptoms, medications, and conditions from unstructured text
 * For physician review only
 */

const natural = require('natural');
const { v4: uuidv4 } = require('uuid');

class MedicalNLPService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    
    // Medical terminology dictionaries
    this.medicalTerms = {
      symptoms: new Set([
        'fever', 'pain', 'headache', 'nausea', 'vomiting', 'diarrhea', 'constipation',
        'fatigue', 'weakness', 'dizziness', 'shortness of breath', 'chest pain',
        'abdominal pain', 'back pain', 'joint pain', 'muscle pain', 'sore throat',
        'cough', 'runny nose', 'congestion', 'rash', 'itching', 'swelling',
        'palpitations', 'anxiety', 'depression', 'insomnia', 'confusion',
        'memory loss', 'vision changes', 'hearing loss', 'numbness', 'tingling'
      ]),
      
      medications: new Set([
        'aspirin', 'ibuprofen', 'acetaminophen', 'metformin', 'lisinopril',
        'amlodipine', 'metoprolol', 'atorvastatin', 'omeprazole', 'levothyroxine',
        'warfarin', 'insulin', 'digoxin', 'furosemide', 'prednisone',
        'albuterol', 'gabapentin', 'tramadol', 'hydrocodone', 'oxycodone',
        'sertraline', 'fluoxetine', 'lorazepam', 'alprazolam', 'zolpidem'
      ]),
      
      conditions: new Set([
        'diabetes', 'hypertension', 'hyperlipidemia', 'asthma', 'copd',
        'heart failure', 'coronary artery disease', 'atrial fibrillation',
        'stroke', 'myocardial infarction', 'pneumonia', 'bronchitis',
        'urinary tract infection', 'kidney disease', 'liver disease',
        'cancer', 'depression', 'anxiety', 'arthritis', 'osteoporosis',
        'thyroid disease', 'anemia', 'obesity', 'sleep apnea'
      ]),
      
      anatomicalSites: new Set([
        'head', 'neck', 'chest', 'abdomen', 'back', 'arm', 'leg', 'hand', 'foot',
        'heart', 'lung', 'liver', 'kidney', 'brain', 'stomach', 'intestine',
        'bladder', 'prostate', 'breast', 'skin', 'eye', 'ear', 'nose', 'throat'
      ]),
      
      procedures: new Set([
        'surgery', 'biopsy', 'endoscopy', 'colonoscopy', 'mammography',
        'ct scan', 'mri', 'x-ray', 'ultrasound', 'ecg', 'ekg', 'echocardiogram',
        'blood test', 'urine test', 'culture', 'vaccination', 'injection'
      ])
    };

    
    // Clinical patterns for entity recognition
    this.clinicalPatterns = {
      vitals: {
        bloodPressure: /\b(\d{2,3})\/(\d{2,3})\s*(?:mmhg|mm hg)?/gi,
        heartRate: /\b(?:hr|heart rate|pulse)\s*:?\s*(\d{2,3})\s*(?:bpm|beats per minute)?/gi,
        temperature: /\b(?:temp|temperature)\s*:?\s*(\d{2,3}(?:\.\d+)?)\s*(?:°f|°c|f|c|degrees)?/gi,
        oxygenSaturation: /\b(?:o2 sat|oxygen saturation|spo2)\s*:?\s*(\d{2,3})\s*%?/gi,
        respiratoryRate: /\b(?:rr|respiratory rate|resp rate)\s*:?\s*(\d{1,2})\s*(?:per minute|min)?/gi
      },
      
      dosages: /\b(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|units?)\b/gi,
      frequencies: /\b(?:once|twice|three times|four times)\s+(?:daily|a day|per day)|\b(?:bid|tid|qid|qd|prn)\b/gi,
      dates: /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{2,4})\b/gi,
      
      negation: /\b(?:no|not|never|without|absent|denies|negative for)\b/gi,
      severity: /\b(?:mild|moderate|severe|critical|acute|chronic)\b/gi,
      temporal: /\b(?:today|yesterday|last week|last month|recently|currently|ongoing)\b/gi
    };
  }

  /**
   * Normalize medical text for processing
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\d\/\-\.]/g, ' ')  // Keep decimal points
      .replace(/\s+/g, ' ')  // Collapse multiple spaces
      .trim();
  }

  /**
   * Process medical text and extract clinical entities
   */
  async processMedicalText(text, options = {}) {
    try {
      const processingId = uuidv4();
      const startTime = Date.now();
      
      // Normalize text
      const normalizedText = this.normalizeText(text);
      
      // Extract entities
      const entities = await this.extractClinicalEntities(normalizedText);
      
      // Analyze sentiment and urgency
      const sentiment = this.analyzeClinicalSentiment(normalizedText);
      
      // Extract relationships
      const relationships = this.extractClinicalRelationships(normalizedText, entities);
      
      // Generate structured output
      const result = {
        processingId,
        originalText: text,
        normalizedText,
        entities,
        classification: { intent: 'clinical_note', confidence: 0.85 },
        relationships,
        sentiment,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        confidence: this.calculateOverallConfidence(entities),
        disclaimer: 'For physician review only'
      };
      
      return result;
    } catch (error) {
      throw new Error(`Medical NLP processing failed: ${error.message}`);
    }
  }


  /**
   * Extract clinical entities from text
   */
  async extractClinicalEntities(text) {
    const entities = {
      symptoms: [],
      medications: [],
      conditions: [],
      vitals: {},
      procedures: [],
      anatomicalSites: [],
      dosages: [],
      frequencies: [],
      dates: [],
      negations: [],
      severities: [],
      temporalExpressions: []
    };
    
    // Extract symptoms
    entities.symptoms = this.extractSymptoms(text);
    
    // Extract medications
    entities.medications = this.extractMedications(text);
    
    // Extract conditions
    entities.conditions = this.extractConditions(text);
    
    // Extract vital signs
    entities.vitals = this.extractVitalSigns(text);
    
    // Extract procedures
    entities.procedures = this.extractProcedures(text);
    
    // Extract anatomical sites
    entities.anatomicalSites = this.extractAnatomicalSites(text);
    
    // Extract dosages and frequencies
    entities.dosages = this.extractDosages(text);
    entities.frequencies = this.extractFrequencies(text);
    
    // Extract dates
    entities.dates = this.extractDates(text);
    
    // Extract modifiers
    entities.negations = this.extractNegations(text);
    entities.severities = this.extractSeverities(text);
    entities.temporalExpressions = this.extractTemporalExpressions(text);
    
    return entities;
  }

  /**
   * Extract symptoms from text
   */
  extractSymptoms(text) {
    const symptoms = [];
    const foundTerms = new Set();
    
    // Check for multi-word symptoms first (to avoid partial matches)
    const multiWordSymptoms = Array.from(this.medicalTerms.symptoms).filter(s => s.includes(' ')).sort((a, b) => b.length - a.length);
    for (const symptom of multiWordSymptoms) {
      const regex = new RegExp(`\\b${symptom}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        symptoms.push({
          term: symptom,
          matches: matches.length,
          confidence: 0.9,
          positions: this.findTermPositions(text, symptom)
        });
        foundTerms.add(symptom);
      }
    }
    
    // Check for single-word symptoms (excluding those already found as part of multi-word)
    const singleWordSymptoms = Array.from(this.medicalTerms.symptoms).filter(s => !s.includes(' '));
    for (const symptom of singleWordSymptoms) {
      // Skip if this term is part of an already found multi-word symptom
      let isPartOfMultiWord = false;
      for (const found of foundTerms) {
        if (found.includes(symptom)) {
          isPartOfMultiWord = true;
          break;
        }
      }
      if (isPartOfMultiWord) continue;
      
      const regex = new RegExp(`\\b${symptom}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        symptoms.push({
          term: symptom,
          matches: matches.length,
          confidence: 0.9,
          positions: this.findTermPositions(text, symptom)
        });
        foundTerms.add(symptom);
      }
    }
    
    // Check for partial matches and synonyms
    const symptomSynonyms = {
      'chest pain': ['chest discomfort', 'chest tightness'],
      'shortness of breath': ['dyspnea', 'difficulty breathing', 'breathlessness'],
      'abdominal pain': ['stomach pain', 'belly pain', 'tummy ache'],
      'headache': ['head pain', 'cephalgia'],
      'nausea': ['feeling sick', 'queasy']
    };
    
    for (const [symptom, synonyms] of Object.entries(symptomSynonyms)) {
      for (const synonym of synonyms) {
        const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches && !symptoms.find(s => s.term === symptom)) {
          symptoms.push({
            term: symptom,
            synonym: synonym,
            matches: matches.length,
            confidence: 0.8,
            positions: this.findTermPositions(text, synonym)
          });
        }
      }
    }
    
    return symptoms;
  }


  /**
   * Extract medications from text
   */
  extractMedications(text) {
    const medications = [];
    
    for (const medication of this.medicalTerms.medications) {
      const regex = new RegExp(`\\b${medication}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        medications.push({
          name: medication,
          matches: matches.length,
          confidence: 0.95,
          positions: this.findTermPositions(text, medication)
        });
      }
    }
    
    return medications;
  }

  /**
   * Extract medical conditions from text
   */
  extractConditions(text) {
    const conditions = [];
    
    for (const condition of this.medicalTerms.conditions) {
      const regex = new RegExp(`\\b${condition}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        conditions.push({
          name: condition,
          matches: matches.length,
          confidence: 0.9,
          positions: this.findTermPositions(text, condition)
        });
      }
    }
    
    return conditions;
  }

  /**
   * Extract vital signs from text
   */
  extractVitalSigns(text) {
    const vitals = {};
    
    // Blood pressure
    const bpMatches = [...text.matchAll(this.clinicalPatterns.vitals.bloodPressure)];
    if (bpMatches.length > 0) {
      vitals.bloodPressure = bpMatches.map(match => ({
        systolic: parseInt(match[1]),
        diastolic: parseInt(match[2]),
        raw: match[0],
        confidence: 0.95
      }));
    }
    
    // Heart rate
    const hrMatches = [...text.matchAll(this.clinicalPatterns.vitals.heartRate)];
    if (hrMatches.length > 0) {
      vitals.heartRate = hrMatches.map(match => ({
        value: parseInt(match[1]),
        raw: match[0],
        confidence: 0.9
      }));
    }
    
    // Temperature
    const tempMatches = [...text.matchAll(this.clinicalPatterns.vitals.temperature)];
    if (tempMatches.length > 0) {
      vitals.temperature = tempMatches.map(match => ({
        value: parseFloat(match[1]),
        raw: match[0],
        confidence: 0.9
      }));
    }
    
    // Oxygen saturation
    const o2Matches = [...text.matchAll(this.clinicalPatterns.vitals.oxygenSaturation)];
    if (o2Matches.length > 0) {
      vitals.oxygenSaturation = o2Matches.map(match => ({
        value: parseInt(match[1]),
        raw: match[0],
        confidence: 0.9
      }));
    }
    
    // Respiratory rate
    const rrMatches = [...text.matchAll(this.clinicalPatterns.vitals.respiratoryRate)];
    if (rrMatches.length > 0) {
      vitals.respiratoryRate = rrMatches.map(match => ({
        value: parseInt(match[1]),
        raw: match[0],
        confidence: 0.9
      }));
    }
    
    return vitals;
  }


  /**
   * Extract procedures from text
   */
  extractProcedures(text) {
    const procedures = [];
    
    for (const procedure of this.medicalTerms.procedures) {
      const regex = new RegExp(`\\b${procedure}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        procedures.push({
          name: procedure,
          matches: matches.length,
          confidence: 0.85,
          positions: this.findTermPositions(text, procedure)
        });
      }
    }
    
    return procedures;
  }

  /**
   * Extract anatomical sites from text
   */
  extractAnatomicalSites(text) {
    const sites = [];
    
    for (const site of this.medicalTerms.anatomicalSites) {
      const regex = new RegExp(`\\b${site}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        sites.push({
          name: site,
          matches: matches.length,
          confidence: 0.8,
          positions: this.findTermPositions(text, site)
        });
      }
    }
    
    return sites;
  }

  /**
   * Extract dosages from text
   */
  extractDosages(text) {
    const dosages = [];
    const matches = [...text.matchAll(this.clinicalPatterns.dosages)];
    
    for (const match of matches) {
      dosages.push({
        amount: parseFloat(match[1]),
        unit: match[2],
        raw: match[0],
        confidence: 0.9
      });
    }
    
    return dosages;
  }

  /**
   * Extract frequencies from text
   */
  extractFrequencies(text) {
    const frequencies = [];
    const matches = [...text.matchAll(this.clinicalPatterns.frequencies)];
    
    for (const match of matches) {
      frequencies.push({
        frequency: match[0],
        confidence: 0.85
      });
    }
    
    return frequencies;
  }

  /**
   * Extract dates from text
   */
  extractDates(text) {
    const dates = [];
    const matches = [...text.matchAll(this.clinicalPatterns.dates)];
    
    for (const match of matches) {
      dates.push({
        date: match[0],
        confidence: 0.9
      });
    }
    
    return dates;
  }

  /**
   * Extract negations from text
   */
  extractNegations(text) {
    const negations = [];
    const matches = [...text.matchAll(this.clinicalPatterns.negation)];
    
    for (const match of matches) {
      negations.push({
        negation: match[0],
        position: match.index,
        confidence: 0.9
      });
    }
    
    return negations;
  }

  /**
   * Extract severity indicators from text
   */
  extractSeverities(text) {
    const severities = [];
    const matches = [...text.matchAll(this.clinicalPatterns.severity)];
    
    for (const match of matches) {
      severities.push({
        severity: match[0],
        position: match.index,
        confidence: 0.85
      });
    }
    
    return severities;
  }

  /**
   * Extract temporal expressions from text
   */
  extractTemporalExpressions(text) {
    const temporal = [];
    const matches = [...text.matchAll(this.clinicalPatterns.temporal)];
    
    for (const match of matches) {
      temporal.push({
        expression: match[0],
        position: match.index,
        confidence: 0.8
      });
    }
    
    return temporal;
  }


  /**
   * Extract clinical relationships between entities
   */
  extractClinicalRelationships(text, entities) {
    const relationships = [];
    
    // Symptom-anatomical site relationships
    for (const symptom of entities.symptoms) {
      for (const site of entities.anatomicalSites) {
        const distance = this.calculateEntityDistance(text, symptom.term, site.name);
        if (distance < 50) { // Within 50 characters
          relationships.push({
            type: 'symptom_location',
            source: symptom.term,
            target: site.name,
            confidence: Math.max(0.5, 1 - distance / 100),
            distance
          });
        }
      }
    }
    
    // Medication-condition relationships
    for (const medication of entities.medications) {
      for (const condition of entities.conditions) {
        const distance = this.calculateEntityDistance(text, medication.name, condition.name);
        if (distance < 100) { // Within 100 characters
          relationships.push({
            type: 'medication_indication',
            source: medication.name,
            target: condition.name,
            confidence: Math.max(0.4, 1 - distance / 200),
            distance
          });
        }
      }
    }
    
    // Medication-dosage relationships
    for (const medication of entities.medications) {
      for (const dosage of entities.dosages) {
        const distance = this.calculateEntityDistance(text, medication.name, dosage.raw);
        if (distance < 30) { // Within 30 characters
          relationships.push({
            type: 'medication_dosage',
            source: medication.name,
            target: `${dosage.amount} ${dosage.unit}`,
            confidence: Math.max(0.7, 1 - distance / 50),
            distance
          });
        }
      }
    }
    
    return relationships;
  }

  /**
   * Analyze clinical sentiment and urgency
   */
  analyzeClinicalSentiment(text) {
    const urgencyKeywords = {
      high: ['emergency', 'urgent', 'severe', 'critical', 'acute', 'immediate'],
      medium: ['moderate', 'concerning', 'significant', 'notable'],
      low: ['mild', 'slight', 'minor', 'stable']
    };
    
    let urgencyScore = 0;
    let urgencyLevel = 'low';
    
    for (const [level, keywords] of Object.entries(urgencyKeywords)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          const score = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
          urgencyScore += score * matches.length;
        }
      }
    }
    
    if (urgencyScore >= 6) urgencyLevel = 'high';
    else if (urgencyScore >= 3) urgencyLevel = 'medium';
    
    return {
      urgencyLevel,
      urgencyScore,
      confidence: Math.min(0.9, urgencyScore / 10)
    };
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(entities) {
    const entityCounts = Object.values(entities).reduce((sum, entityList) => {
      if (Array.isArray(entityList)) {
        return sum + entityList.length;
      } else if (typeof entityList === 'object' && entityList !== null) {
        return sum + Object.keys(entityList).length;
      }
      return sum;
    }, 0);
    
    return Math.min(0.9, entityCounts / 10);
  }

  /**
   * Find positions of terms in text
   */
  findTermPositions(text, term) {
    const positions = [];
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return positions;
  }

  /**
   * Calculate distance between entities in text
   */
  calculateEntityDistance(text, entity1, entity2) {
    const pos1 = text.indexOf(entity1.toLowerCase());
    const pos2 = text.indexOf(entity2.toLowerCase());
    
    if (pos1 === -1 || pos2 === -1) return Infinity;
    
    return Math.abs(pos1 - pos2);
  }

  /**
   * Batch process multiple medical texts
   */
  async batchProcessMedicalTexts(texts, options = {}) {
    const results = [];
    const batchId = uuidv4();
    
    for (let i = 0; i < texts.length; i++) {
      try {
        const result = await this.processMedicalText(texts[i], options);
        result.batchId = batchId;
        result.batchIndex = i;
        results.push(result);
      } catch (error) {
        results.push({
          batchId,
          batchIndex: i,
          error: error.message,
          originalText: texts[i],
          disclaimer: 'For physician review only'
        });
      }
    }
    
    return {
      batchId,
      totalTexts: texts.length,
      successfulProcessing: results.filter(r => !r.error).length,
      results,
      disclaimer: 'For physician review only'
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      medicalTermsCount: {
        symptoms: this.medicalTerms.symptoms.size,
        medications: this.medicalTerms.medications.size,
        conditions: this.medicalTerms.conditions.size,
        anatomicalSites: this.medicalTerms.anatomicalSites.size,
        procedures: this.medicalTerms.procedures.size
      },
      patternsCount: Object.keys(this.clinicalPatterns).length,
      disclaimer: 'For physician review only'
    };
  }
}

module.exports = MedicalNLPService;
