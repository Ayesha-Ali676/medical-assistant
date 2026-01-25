/**
 * Data Validator
 * Validates medical device data for accuracy and completeness
 * For physician review only
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class DataValidator {
  constructor() {
    // Physiologically plausible ranges
    this.validationRules = {
      heartRate: { min: 30, max: 250, unit: 'bpm' },
      systolic: { min: 60, max: 250, unit: 'mmHg' },
      diastolic: { min: 40, max: 150, unit: 'mmHg' },
      spo2: { min: 70, max: 100, unit: '%' },
      temperature: { min: 32, max: 43, unit: '°C' },
      respiratoryRate: { min: 5, max: 60, unit: 'breaths/min' }
    };
  }

  /**
   * Validate device data
   * Implements data validation as per requirement 5.3
   */
  validate(data, deviceType) {
    const errors = [];
    const warnings = [];
    
    // Check for required fields
    if (!data) {
      errors.push('Data is null or undefined');
      return { isValid: false, errors, warnings };
    }
    
    // Validate timestamp
    if (data.timestamp) {
      const timestampValidation = this.validateTimestamp(data.timestamp);
      if (!timestampValidation.isValid) {
        errors.push(...timestampValidation.errors);
      }
    }
    
    // Validate readings based on device type
    switch (deviceType) {
      case 'vital_signs_monitor':
        this.validateVitalSignsMonitor(data, errors, warnings);
        break;
      case 'heart_rate_monitor':
        this.validateHeartRateMonitor(data, errors, warnings);
        break;
      case 'blood_pressure':
        this.validateBloodPressure(data, errors, warnings);
        break;
      case 'pulse_oximeter':
        this.validatePulseOximeter(data, errors, warnings);
        break;
      case 'thermometer':
        this.validateThermometer(data, errors, warnings);
        break;
      case 'respiratory_monitor':
        this.validateRespiratoryMonitor(data, errors, warnings);
        break;
      default:
        // Generic validation
        this.validateGeneric(data, errors, warnings);
    }
    
    // Check data quality indicators
    if (data.signalQuality !== undefined) {
      if (typeof data.signalQuality !== 'number' || 
          data.signalQuality < 0 || 
          data.signalQuality > 100) {
        warnings.push('Invalid signal quality value');
      } else if (data.signalQuality < 50) {
        warnings.push('Low signal quality detected');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate vital signs monitor data
   */
  validateVitalSignsMonitor(data, errors, warnings) {
    // Heart rate
    if (data.heartRate !== undefined || data.hr !== undefined || data.pulse !== undefined) {
      const hr = data.heartRate || data.hr || data.pulse;
      const validation = this.validateValue(hr, 'heartRate');
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }
    
    // Blood pressure
    if (data.systolic !== undefined || data.sbp !== undefined || data.bloodPressure?.systolic !== undefined) {
      const systolic = data.systolic || data.sbp || data.bloodPressure?.systolic;
      const validation = this.validateValue(systolic, 'systolic');
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }
    
    if (data.diastolic !== undefined || data.dbp !== undefined || data.bloodPressure?.diastolic !== undefined) {
      const diastolic = data.diastolic || data.dbp || data.bloodPressure?.diastolic;
      const validation = this.validateValue(diastolic, 'diastolic');
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }
    
    // SpO2
    if (data.spo2 !== undefined || data.oxygenSaturation !== undefined) {
      const spo2 = data.spo2 || data.oxygenSaturation;
      const validation = this.validateValue(spo2, 'spo2');
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }
    
    // Temperature
    if (data.temperature !== undefined || data.temp !== undefined) {
      const temp = data.temperature || data.temp;
      const validation = this.validateValue(temp, 'temperature');
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }
    
    // Respiratory rate
    if (data.respiratoryRate !== undefined || data.rr !== undefined || data.respRate !== undefined) {
      const rr = data.respiratoryRate || data.rr || data.respRate;
      const validation = this.validateValue(rr, 'respiratoryRate');
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }
  }

  /**
   * Validate heart rate monitor data
   */
  validateHeartRateMonitor(data, errors, warnings) {
    const hr = data.heartRate || data.hr || data.bpm;
    
    if (hr === undefined) {
      errors.push('Heart rate is required for heart rate monitor');
      return;
    }
    
    const validation = this.validateValue(hr, 'heartRate');
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }
    warnings.push(...validation.warnings);
  }

  /**
   * Validate blood pressure monitor data
   */
  validateBloodPressure(data, errors, warnings) {
    const systolic = data.systolic || data.sbp;
    const diastolic = data.diastolic || data.dbp;
    
    if (systolic === undefined || diastolic === undefined) {
      errors.push('Both systolic and diastolic values are required');
      return;
    }
    
    const systolicValidation = this.validateValue(systolic, 'systolic');
    const diastolicValidation = this.validateValue(diastolic, 'diastolic');
    
    if (!systolicValidation.isValid) {
      errors.push(...systolicValidation.errors);
    }
    if (!diastolicValidation.isValid) {
      errors.push(...diastolicValidation.errors);
    }
    
    warnings.push(...systolicValidation.warnings);
    warnings.push(...diastolicValidation.warnings);
    
    // Check relationship between systolic and diastolic
    if (systolic <= diastolic) {
      errors.push('Systolic pressure must be greater than diastolic pressure');
    }
  }

  /**
   * Validate pulse oximeter data
   */
  validatePulseOximeter(data, errors, warnings) {
    const spo2 = data.spo2 || data.oxygenSaturation;
    
    if (spo2 === undefined) {
      errors.push('SpO2 is required for pulse oximeter');
      return;
    }
    
    const validation = this.validateValue(spo2, 'spo2');
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }
    warnings.push(...validation.warnings);
  }

  /**
   * Validate thermometer data
   */
  validateThermometer(data, errors, warnings) {
    const temp = data.temperature || data.temp;
    
    if (temp === undefined) {
      errors.push('Temperature is required for thermometer');
      return;
    }
    
    const validation = this.validateValue(temp, 'temperature');
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }
    warnings.push(...validation.warnings);
  }

  /**
   * Validate respiratory monitor data
   */
  validateRespiratoryMonitor(data, errors, warnings) {
    const rr = data.respiratoryRate || data.rr;
    
    if (rr === undefined) {
      errors.push('Respiratory rate is required for respiratory monitor');
      return;
    }
    
    const validation = this.validateValue(rr, 'respiratoryRate');
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }
    warnings.push(...validation.warnings);
  }

  /**
   * Generic validation for unknown device types
   */
  validateGeneric(data, errors, warnings) {
    // Validate any present vital signs
    if (data.heartRate !== undefined) {
      const validation = this.validateValue(data.heartRate, 'heartRate');
      if (!validation.isValid) errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }
    
    if (data.bloodPressure) {
      if (data.bloodPressure.systolic !== undefined) {
        const validation = this.validateValue(data.bloodPressure.systolic, 'systolic');
        if (!validation.isValid) errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }
      if (data.bloodPressure.diastolic !== undefined) {
        const validation = this.validateValue(data.bloodPressure.diastolic, 'diastolic');
        if (!validation.isValid) errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }
    }
    
    if (data.spo2 !== undefined) {
      const validation = this.validateValue(data.spo2, 'spo2');
      if (!validation.isValid) errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }
    
    if (data.temperature !== undefined) {
      const validation = this.validateValue(data.temperature, 'temperature');
      if (!validation.isValid) errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }
    
    if (data.respiratoryRate !== undefined) {
      const validation = this.validateValue(data.respiratoryRate, 'respiratoryRate');
      if (!validation.isValid) errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }
  }

  /**
   * Validate a single value against rules
   */
  validateValue(value, type) {
    const errors = [];
    const warnings = [];
    
    const rule = this.validationRules[type];
    
    if (!rule) {
      warnings.push(`No validation rule for type: ${type}`);
      return { isValid: true, errors, warnings };
    }
    
    // Check if value is a number
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${type} must be a valid number`);
      return { isValid: false, errors, warnings };
    }
    
    // Check range
    if (value < rule.min || value > rule.max) {
      errors.push(`${type} out of plausible range (${rule.min}-${rule.max} ${rule.unit}): ${value}`);
      return { isValid: false, errors, warnings };
    }
    
    return { isValid: true, errors, warnings };
  }

  /**
   * Validate timestamp
   */
  validateTimestamp(timestamp) {
    const errors = [];
    
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      errors.push('Invalid timestamp format');
      return { isValid: false, errors };
    }
    
    // Check if timestamp is not too far in the future (allow 1 minute)
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60000);
    
    if (date > oneMinuteFromNow) {
      errors.push('Timestamp is in the future');
      return { isValid: false, errors };
    }
    
    // Check if timestamp is not too old (allow 24 hours)
    const oneDayAgo = new Date(now.getTime() - 86400000);
    
    if (date < oneDayAgo) {
      errors.push('Timestamp is more than 24 hours old');
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors };
  }
}

module.exports = DataValidator;
