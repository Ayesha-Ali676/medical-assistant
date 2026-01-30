import React from 'react';

const RiskGauge = ({ riskScore = 78, showAnimation = true }) => {
  const getRiskColor = (score) => {
    if (score >= 70) return { color: '#ef4444', label: 'CRITICAL', bg: '#fee2e2' };
    if (score >= 40) return { color: '#f59e0b', label: 'WARNING', bg: '#fef3c7' };
    return { color: '#10b981', label: 'NORMAL', bg: '#dcfce7' };
  };

  const riskLevel = getRiskColor(riskScore);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="risk-gauge-container">
      <style>{`
        @keyframes pulse-critical {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .risk-gauge-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 2px solid ${riskLevel.color};
        }

        .gauge-svg {
          transform: rotate(-90deg);
          margin-bottom: 16px;
        }

        .gauge-circle {
          fill: none;
          stroke-width: 8;
          stroke-linecap: round;
        }

        .gauge-background {
          stroke: #e5e7eb;
        }

        .gauge-progress {
          stroke: ${riskLevel.color};
          stroke-dasharray: ${circumference};
          stroke-dashoffset: ${strokeDashoffset};
          transition: stroke-dashoffset 1s ease-in-out;
          filter: drop-shadow(0 0 8px ${riskLevel.color}40);
        }

        ${showAnimation && riskScore >= 70 ? `
          .gauge-progress {
            animation: pulse-critical 1.5s ease-in-out infinite;
          }
        ` : ''}

        .risk-score-display {
          text-align: center;
          margin-bottom: 12px;
        }

        .risk-number {
          font-size: 48px;
          font-weight: 900;
          color: ${riskLevel.color};
          line-height: 1;
          margin-bottom: 4px;
          ${riskScore >= 70 ? 'animation: pulse-critical 1.5s ease-in-out infinite;' : ''}
        }

        .risk-label {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .urgency-text {
          font-size: 13px;
          font-weight: 600;
          color: ${riskLevel.color};
          text-align: center;
          padding: 8px 12px;
          background: ${riskLevel.bg};
          border-radius: 6px;
          margin-top: 12px;
          width: 100%;
        }

        .risk-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          background: ${riskLevel.color};
          border-radius: 50%;
          margin-right: 8px;
          ${riskScore >= 70 ? 'animation: pulse-critical 1.5s ease-in-out infinite;' : ''}
        }
      `}</style>

      <div className="risk-gauge-wrapper">
        <div className="risk-score-display">
          <div className="risk-number">{riskScore}</div>
          <div className="risk-label">out of 100</div>
        </div>

        <svg className="gauge-svg" width="120" height="120" viewBox="0 0 120 120">
          <circle
            className="gauge-circle gauge-background"
            cx="60"
            cy="60"
            r="45"
          />
          <circle
            className="gauge-circle gauge-progress"
            cx="60"
            cy="60"
            r="45"
          />
        </svg>

        <div className="urgency-text">
          <span className="risk-indicator"></span>
          {riskScore >= 70 && '🚨 '}
          {riskScore >= 40 && riskScore < 70 && '⚠️ '}
          {riskScore < 40 && '✅ '}
          {riskLevel.label}
          {riskScore >= 70 && ' - Immediate Medical Evaluation Required'}
          {riskScore >= 40 && riskScore < 70 && ' - Urgent Physician Attention Needed'}
          {riskScore < 40 && ' - Continue Routine Monitoring'}
        </div>
      </div>
    </div>
  );
};

export default RiskGauge;
