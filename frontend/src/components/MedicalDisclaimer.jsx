import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Medical Disclaimer Component
 * Displays required medical disclaimers on clinical outputs
 * Requirements: 3.5
 */
const MedicalDisclaimer = ({ variant = 'default', className = '' }) => {
  const disclaimers = {
    default: {
      text: 'For physician review only. This AI-generated content is for clinical decision support and should not replace professional medical judgment.',
      icon: <AlertCircle className="w-4 h-4" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-slate-700',
      iconColor: 'text-blue-600',
    },
    warning: {
      text: 'For physician review only. All clinical recommendations must be verified by a licensed healthcare professional before implementation.',
      icon: <AlertCircle className="w-4 h-4" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-slate-800',
      iconColor: 'text-yellow-600',
    },
    critical: {
      text: 'CRITICAL: For physician review only. This system provides decision support only and does not diagnose, treat, or prescribe. All actions require physician authorization.',
      icon: <AlertCircle className="w-4 h-4" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-slate-900',
      iconColor: 'text-red-600',
    },
  };

  const config = disclaimers[variant] || disclaimers.default;

  return (
    <div 
      className={`flex items-start gap-2 p-3 ${config.bgColor} border ${config.borderColor} rounded text-xs ${config.textColor} ${className}`}
      role="note"
      aria-label="Medical disclaimer"
    >
      <span className={config.iconColor}>{config.icon}</span>
      <p className="flex-1 italic">
        <strong>Disclaimer:</strong> {config.text}
      </p>
    </div>
  );
};

export default MedicalDisclaimer;
