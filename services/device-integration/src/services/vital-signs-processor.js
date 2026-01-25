/**
 * Vital Signs Processor
 * Processes and analyzes vital signs data from medical devices
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

class VitalSignsProcessor {
  constructor() {
    // Normal ranges for vital signs
    this.normalRanges = {
      heartRate: { min: 60, max: 100, critical: { min: 40, max: 150 } },
      systolic: { min: 90, max: 140, critical: { min: 70, max: 180 } },
      diastolic: { min: 60, max: 90, critical: { min: 40, max: 120 } },
      spo2: { min: 95, max: 100, critical: { min: 90, max: 100 } },
      temperature: { min: 36.1, max: 37.2, critical: { min: 35, max: 39 } },
      respiratoryRate: { min: 12, max: 20, critical: { min: 8, max: 30 } }
    };
  }

  /**
   * Process vital signs data
   * Analyzes readings and generates alerts for abnormal values
   */
  async process(rawData, deviceType) {
    try {
      // Extract readings based on device type
      const readings = this.extractReadings(rawData, deviceType);
      
      // Calculate quality metrics
      const quality = this.assessQuality(rawData, readings);
      
      // Generate alerts for abnormal values
      const alerts = this.generateAlerts(readings);
      
      return {
        readings,
        quality,
        alerts
      };
    } catch (error) {
      logger.error('Failed to process vital signs', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract readings from raw device data
   */
  extractReadings(rawData, deviceType) {
    const readings = {};
    
    switch (deviceType) {
      case 'vital_signs_monitor':
        readings.heartRate = rawData.heartRate || rawData.hr || rawData.pulse;
        readings.bloodPressure = {
          systolic: rawData.systolic || rawData.sbp || rawData.bloodPressure?.systolic,
          diastolic: rawData.diastolic || rawData.dbp || rawData.bloodPressure?.diastolic
        };
        readings.spo2 = rawData.spo2 || rawData.oxygenSaturation;
        readings.temperature = rawData.temperature || rawData.temp;
        readings.respiratoryRate = rawData.respiratoryRate || rawData.rr || rawData.respRate;
        break;
        
      case 'heart_rate_monitor':
        readings.heartRate = rawData.heartRate || rawData.hr || rawData.bpm;
        break;
        
      case 'blood_pressure':
        readings.bloodPressure = {
          systolic: rawData.systolic || rawData.sbp,
          diastolic: rawData.diastolic || rawData.dbp
        };
        readings.heartRate = rawData.heartRate || rawData.pulse;
        break;
        
      case 'pulse_oximeter':
        readings.spo2 = rawData.spo2 || rawData.oxygenSaturation;
        readings.heartRate = rawData.heartRate || rawData.pulse;
        break;
        
      case 'thermometer':
        readings.temperature = rawData.temperature || rawData.temp;
        break;
        
      case 'respiratory_monitor':
        readings.respiratoryRate = rawData.respiratoryRate || rawData.rr;
        break;
        
      default:
        // Generic extraction
        readings.heartRate = rawData.heartRate;
        readings.bloodPressure = rawData.bloodPressure;
        readings.spo2 = rawData.spo2;
        readings.temperature = rawData.temperature;
        readings.respiratoryRate = rawData.respiratoryRate;
    }
    
    // Remove undefined values
    Object.keys(readings).forEach(key => {
      if (readings[key] === undefined || readings[key] === null) {
        delete readings[key];
      }
    });
    
    return readings;
  }

  /**
   * Assess data quality
   */
  assessQuality(rawData, readings) {
    const quality = {
      signalQuality: 100,
      confidence: 1.0,
      issues: []
    };
    
    // Check signal quality from device
    if (rawData.signalQuality !== undefined) {
      quality.signalQuality = rawData.signalQuality;
    }
    
    // Check for missing readings
    const expectedReadings = ['heartRate', 'bloodPressure', 'spo2', 'temperature'];
    const missingCount = expectedReadings.filter(r => !readings[r]).length;
    
    if (missingCount > 0) {
      quality.confidence -= missingCount * 0.1;
      quality.issues.push(`Missing ${missingCount} expected readings`);
    }
    
    // Check for out-of-range values
    let outOfRangeCount = 0;
    
    if (readings.heartRate) {
      if (readings.heartRate < 30 || readings.heartRate > 250) {
        outOfRangeCount++;
        quality.issues.push('Heart rate out of plausible range');
      }
    }
    
    if (readings.bloodPressure) {
      if (readings.bloodPressure.systolic < 60 || readings.bloodPressure.systolic > 250) {
        outOfRangeCount++;
        quality.issues.push('Systolic BP out of plausible range');
      }
      if (readings.bloodPressure.diastolic < 40 || readings.bloodPressure.diastolic > 150) {
        outOfRangeCount++;
        quality.issues.push('Diastolic BP out of plausible range');
      }
    }
    
    if (readings.spo2) {
      if (readings.spo2 < 70 || readings.spo2 > 100) {
        outOfRangeCount++;
        quality.issues.push('SpO2 out of plausible range');
      }
    }
    
    if (readings.temperature) {
      if (readings.temperature < 32 || readings.temperature > 43) {
        outOfRangeCount++;
        quality.issues.push('Temperature out of plausible range');
      }
    }
    
    if (outOfRangeCount > 0) {
      quality.confidence -= outOfRangeCount * 0.15;
      quality.signalQuality = Math.max(0, quality.signalQuality - outOfRangeCount * 20);
    }
    
    // Ensure confidence is between 0 and 1
    quality.confidence = Math.max(0, Math.min(1, quality.confidence));
    
    return quality;
  }

  /**
   * Generate alerts for abnormal vital signs
   */
  generateAlerts(readings) {
    const alerts = [];
    
    // Heart rate alerts
    if (readings.heartRate) {
      if (readings.heartRate < this.normalRanges.heartRate.critical.min) {
        alerts.push({
          type: 'heart_rate',
          severity: 'CRITICAL',
          message: `Critical bradycardia: ${readings.heartRate} bpm`,
          value: readings.heartRate,
          normalRange: this.normalRanges.heartRate
        });
      } else if (readings.heartRate > this.normalRanges.heartRate.critical.max) {
        alerts.push({
          type: 'heart_rate',
          severity: 'CRITICAL',
          message: `Critical tachycardia: ${readings.heartRate} bpm`,
          value: readings.heartRate,
          normalRange: this.normalRanges.heartRate
        });
      } else if (readings.heartRate < this.normalRanges.heartRate.min) {
        alerts.push({
          type: 'heart_rate',
          severity: 'MEDIUM',
          message: `Low heart rate: ${readings.heartRate} bpm`,
          value: readings.heartRate,
          normalRange: this.normalRanges.heartRate
        });
      } else if (readings.heartRate > this.normalRanges.heartRate.max) {
        alerts.push({
          type: 'heart_rate',
          severity: 'MEDIUM',
          message: `Elevated heart rate: ${readings.heartRate} bpm`,
          value: readings.heartRate,
          normalRange: this.normalRanges.heartRate
        });
      }
    }
    
    // Blood pressure alerts
    if (readings.bloodPressure) {
      const { systolic, diastolic } = readings.bloodPressure;
      
      if (systolic < this.normalRanges.systolic.critical.min || 
          diastolic < this.normalRanges.diastolic.critical.min) {
        alerts.push({
          type: 'blood_pressure',
          severity: 'CRITICAL',
          message: `Critical hypotension: ${systolic}/${diastolic} mmHg`,
          value: { systolic, diastolic },
          normalRange: {
            systolic: this.normalRanges.systolic,
            diastolic: this.normalRanges.diastolic
          }
        });
      } else if (systolic > this.normalRanges.systolic.critical.max || 
                 diastolic > this.normalRanges.diastolic.critical.max) {
        alerts.push({
          type: 'blood_pressure',
          severity: 'CRITICAL',
          message: `Critical hypertension: ${systolic}/${diastolic} mmHg`,
          value: { systolic, diastolic },
          normalRange: {
            systolic: this.normalRanges.systolic,
            diastolic: this.normalRanges.diastolic
          }
        });
      } else if (systolic < this.normalRanges.systolic.min || 
                 diastolic < this.normalRanges.diastolic.min) {
        alerts.push({
          type: 'blood_pressure',
          severity: 'MEDIUM',
          message: `Low blood pressure: ${systolic}/${diastolic} mmHg`,
          value: { systolic, diastolic },
          normalRange: {
            systolic: this.normalRanges.systolic,
            diastolic: this.normalRanges.diastolic
          }
        });
      } else if (systolic > this.normalRanges.systolic.max || 
                 diastolic > this.normalRanges.diastolic.max) {
        alerts.push({
          type: 'blood_pressure',
          severity: 'HIGH',
          message: `Elevated blood pressure: ${systolic}/${diastolic} mmHg`,
          value: { systolic, diastolic },
          normalRange: {
            systolic: this.normalRanges.systolic,
            diastolic: this.normalRanges.diastolic
          }
        });
      }
    }
    
    // SpO2 alerts
    if (readings.spo2) {
      if (readings.spo2 < this.normalRanges.spo2.critical.min) {
        alerts.push({
          type: 'spo2',
          severity: 'CRITICAL',
          message: `Critical hypoxemia: ${readings.spo2}%`,
          value: readings.spo2,
          normalRange: this.normalRanges.spo2
        });
      } else if (readings.spo2 < this.normalRanges.spo2.min) {
        alerts.push({
          type: 'spo2',
          severity: 'HIGH',
          message: `Low oxygen saturation: ${readings.spo2}%`,
          value: readings.spo2,
          normalRange: this.normalRanges.spo2
        });
      }
    }
    
    // Temperature alerts
    if (readings.temperature) {
      if (readings.temperature < this.normalRanges.temperature.critical.min) {
        alerts.push({
          type: 'temperature',
          severity: 'CRITICAL',
          message: `Critical hypothermia: ${readings.temperature}°C`,
          value: readings.temperature,
          normalRange: this.normalRanges.temperature
        });
      } else if (readings.temperature > this.normalRanges.temperature.critical.max) {
        alerts.push({
          type: 'temperature',
          severity: 'CRITICAL',
          message: `Critical hyperthermia: ${readings.temperature}°C`,
          value: readings.temperature,
          normalRange: this.normalRanges.temperature
        });
      } else if (readings.temperature < this.normalRanges.temperature.min) {
        alerts.push({
          type: 'temperature',
          severity: 'MEDIUM',
          message: `Low temperature: ${readings.temperature}°C`,
          value: readings.temperature,
          normalRange: this.normalRanges.temperature
        });
      } else if (readings.temperature > this.normalRanges.temperature.max) {
        alerts.push({
          type: 'temperature',
          severity: 'HIGH',
          message: `Elevated temperature: ${readings.temperature}°C`,
          value: readings.temperature,
          normalRange: this.normalRanges.temperature
        });
      }
    }
    
    // Respiratory rate alerts
    if (readings.respiratoryRate) {
      if (readings.respiratoryRate < this.normalRanges.respiratoryRate.critical.min) {
        alerts.push({
          type: 'respiratory_rate',
          severity: 'CRITICAL',
          message: `Critical bradypnea: ${readings.respiratoryRate} breaths/min`,
          value: readings.respiratoryRate,
          normalRange: this.normalRanges.respiratoryRate
        });
      } else if (readings.respiratoryRate > this.normalRanges.respiratoryRate.critical.max) {
        alerts.push({
          type: 'respiratory_rate',
          severity: 'CRITICAL',
          message: `Critical tachypnea: ${readings.respiratoryRate} breaths/min`,
          value: readings.respiratoryRate,
          normalRange: this.normalRanges.respiratoryRate
        });
      } else if (readings.respiratoryRate < this.normalRanges.respiratoryRate.min) {
        alerts.push({
          type: 'respiratory_rate',
          severity: 'MEDIUM',
          message: `Low respiratory rate: ${readings.respiratoryRate} breaths/min`,
          value: readings.respiratoryRate,
          normalRange: this.normalRanges.respiratoryRate
        });
      } else if (readings.respiratoryRate > this.normalRanges.respiratoryRate.max) {
        alerts.push({
          type: 'respiratory_rate',
          severity: 'MEDIUM',
          message: `Elevated respiratory rate: ${readings.respiratoryRate} breaths/min`,
          value: readings.respiratoryRate,
          normalRange: this.normalRanges.respiratoryRate
        });
      }
    }
    
    return alerts;
  }
}

module.exports = VitalSignsProcessor;
