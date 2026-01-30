import React from 'react';
import { AlertTriangle, Activity, TrendingUp, Droplets, Thermometer } from 'lucide-react';

const VitalSignsDisplay = ({ vitals = {} }) => {
  const {
    heartRate = 95,
    bloodPressure = '140/90',
    oxygenLevel = 92,
    temperature = 37.5,
    respiratoryRate = 18
  } = vitals;

  // Determine if vital is abnormal
  const isAbnormal = (vital, value) => {
    const thresholds = {
      heartRate: { min: 60, max: 100 },
      oxygenLevel: { min: 95, max: 100 },
      temperature: { min: 36.5, max: 37.5 },
      respiratoryRate: { min: 12, max: 20 }
    };
    
    if (vital === 'bloodPressure') {
      const [systolic] = value.split('/').map(Number);
      return systolic > 130 || systolic < 90;
    }
    
    const threshold = thresholds[vital];
    if (!threshold) return false;
    return value < threshold.min || value > threshold.max;
  };

  const VitalCard = ({ icon: Icon, label, value, unit, danger }) => (
    <div className={`vital-card ${danger ? 'danger' : 'normal'}`}>
      <style>{`
        .vital-card {
          padding: 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px solid transparent;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .vital-card.normal {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border-color: #10b981;
        }

        .vital-card.danger {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-color: #ef4444;
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .vital-icon {
          width: 32px;
          height: 32px;
          margin-bottom: 8px;
          color: ${danger ? '#ef4444' : '#10b981'};
        }

        .vital-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .vital-value {
          font-size: 24px;
          font-weight: 900;
          color: ${danger ? '#991b1b' : '#065f46'};
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .vital-unit {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
        }

        .vital-warning {
          font-size: 11px;
          color: #ef4444;
          font-weight: 600;
          margin-top: 4px;
          text-transform: uppercase;
        }
      `}</style>

      <Icon className="vital-icon" />
      <div className="vital-label">{label}</div>
      <div className="vital-value">
        <span>{value}</span>
        <span className="vital-unit">{unit}</span>
      </div>
      {danger && <div className="vital-warning">⚠️ ABNORMAL</div>}
    </div>
  );

  const criticalCount = [
    isAbnormal('heartRate', heartRate),
    isAbnormal('bloodPressure', bloodPressure),
    isAbnormal('oxygenLevel', oxygenLevel),
    isAbnormal('temperature', temperature)
  ].filter(Boolean).length;

  return (
    <div className="vitals-display-container">
      <style>{`
        .vitals-display-container {
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .vitals-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .vitals-title {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vitals-warning-badge {
          background: #fee2e2;
          color: #991b1b;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
        }

        @media (max-width: 640px) {
          .vitals-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="vitals-header">
        <div className="vitals-title">
          <Activity size={20} />
          Real-Time Vital Signs
        </div>
        {criticalCount > 0 && (
          <div className="vitals-warning-badge">
            {criticalCount} ABNORMAL
          </div>
        )}
      </div>

      <div className="vitals-grid">
        <VitalCard
          icon={TrendingUp}
          label="Heart Rate"
          value={heartRate}
          unit="bpm"
          danger={isAbnormal('heartRate', heartRate)}
        />
        <VitalCard
          icon={Droplets}
          label="Blood Pressure"
          value={bloodPressure}
          unit="mmHg"
          danger={isAbnormal('bloodPressure', bloodPressure)}
        />
        <VitalCard
          icon={Activity}
          label="O2 Level"
          value={oxygenLevel}
          unit="%"
          danger={isAbnormal('oxygenLevel', oxygenLevel)}
        />
        <VitalCard
          icon={Thermometer}
          label="Temperature"
          value={temperature}
          unit="°C"
          danger={isAbnormal('temperature', temperature)}
        />
      </div>
    </div>
  );
};

export default VitalSignsDisplay;
