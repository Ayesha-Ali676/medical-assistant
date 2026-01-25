import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';

/**
 * Specialty Layout Configuration Component
 * Allows customization of dashboard layouts for different medical specialties
 * Requirements: 4.3, 1.5
 */
const SpecialtyLayout = ({ currentLayout, onLayoutChange }) => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(currentLayout || 'general');
  const [customWidgets, setCustomWidgets] = useState({
    vitals: true,
    labs: true,
    medications: true,
    trends: true,
    alerts: true,
    notes: true,
  });

  // Predefined specialty layouts
  const specialtyLayouts = {
    general: {
      name: 'General Medicine',
      widgets: ['vitals', 'labs', 'medications', 'trends', 'alerts', 'notes'],
      priority: ['labs', 'vitals', 'medications'],
    },
    cardiology: {
      name: 'Cardiology',
      widgets: ['vitals', 'trends', 'medications', 'labs', 'alerts'],
      priority: ['vitals', 'trends', 'medications'],
      focusMetrics: ['BP', 'HR', 'ECG', 'Troponin'],
    },
    endocrinology: {
      name: 'Endocrinology',
      widgets: ['labs', 'trends', 'medications', 'vitals', 'notes'],
      priority: ['labs', 'trends', 'medications'],
      focusMetrics: ['Glucose', 'HbA1c', 'TSH', 'Insulin'],
    },
    nephrology: {
      name: 'Nephrology',
      widgets: ['labs', 'vitals', 'medications', 'trends', 'alerts'],
      priority: ['labs', 'vitals', 'medications'],
      focusMetrics: ['Creatinine', 'eGFR', 'BUN', 'Electrolytes'],
    },
    emergency: {
      name: 'Emergency Medicine',
      widgets: ['vitals', 'alerts', 'labs', 'medications', 'trends'],
      priority: ['alerts', 'vitals', 'labs'],
      focusMetrics: ['BP', 'HR', 'SpO2', 'Lactate'],
    },
  };

  useEffect(() => {
    // Load saved layout from localStorage
    const saved = localStorage.getItem('medassist_specialty_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedSpecialty(parsed.specialty || 'general');
        setCustomWidgets(parsed.widgets || customWidgets);
      } catch (e) {
        console.error('Failed to load saved layout:', e);
      }
    }
  }, []);

  const handleSaveLayout = () => {
    const layoutConfig = {
      specialty: selectedSpecialty,
      widgets: customWidgets,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('medassist_specialty_layout', JSON.stringify(layoutConfig));
    onLayoutChange(layoutConfig);
    setIsConfiguring(false);
  };

  const handleSpecialtyChange = (specialty) => {
    setSelectedSpecialty(specialty);
    const layout = specialtyLayouts[specialty];
    if (layout) {
      const newWidgets = {};
      Object.keys(customWidgets).forEach(key => {
        newWidgets[key] = layout.widgets.includes(key);
      });
      setCustomWidgets(newWidgets);
    }
  };

  if (!isConfiguring) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600">
          Layout: <span className="font-semibold">{specialtyLayouts[selectedSpecialty]?.name || 'General'}</span>
        </span>
        <button
          onClick={() => setIsConfiguring(true)}
          className="p-1 hover:bg-slate-100 rounded transition"
          title="Configure Layout"
        >
          <Settings className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Customize Dashboard Layout</h2>
          <p className="text-sm text-slate-600 mt-1">Configure your dashboard for your medical specialty</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Specialty Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Medical Specialty
            </label>
            <select
              value={selectedSpecialty}
              onChange={(e) => handleSpecialtyChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
            >
              {Object.entries(specialtyLayouts).map(([key, layout]) => (
                <option key={key} value={key}>{layout.name}</option>
              ))}
            </select>
            {specialtyLayouts[selectedSpecialty]?.focusMetrics && (
              <p className="text-xs text-slate-600 mt-2">
                Focus metrics: {specialtyLayouts[selectedSpecialty].focusMetrics.join(', ')}
              </p>
            )}
          </div>

          {/* Widget Configuration */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Dashboard Widgets
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(customWidgets).map(([widget, enabled]) => (
                <label key={widget} className="flex items-center gap-2 p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setCustomWidgets({ ...customWidgets, [widget]: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700 capitalize">{widget}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Layout Preview</h3>
            <div className="text-xs text-slate-600">
              <p className="mb-1">Active widgets: {Object.values(customWidgets).filter(Boolean).length} of {Object.keys(customWidgets).length}</p>
              <p>Priority order: {specialtyLayouts[selectedSpecialty]?.priority.join(' → ')}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={() => setIsConfiguring(false)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveLayout}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpecialtyLayout;
