import React, { useState } from 'react';
import { User, Activity, AlertCircle, Save, X, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import './patientform.css'
const PatientForm = ({ onPatientAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    patient_id: `P${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    name: '',
    age: '',
    gender: 'Male',
    chief_complaint: '',
    vitals: { bp: '120/80', hr: '72', temp: '37.0', rr: '16', spo2: '98', bmi: '' },
    lab_results: [],
    current_medications: [],
    allergies: [],
    medical_history: [],
    lifestyle: {
      smoking: 'No',
      activity_level: 'Moderate',
      sleep_hours: '7',
      diet_quality: 'Good'
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [labInput, setLabInput] = useState({ test_name: '', value: '', unit: '', reference_range: '', status: 'Normal' });
  const [medicationInput, setMedicationInput] = useState({ name: '', dose: '', frequency: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVitalChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [name]: value }
    }));
  };

  const handleLifestyleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      lifestyle: { ...prev.lifestyle, [name]: value }
    }));
  };

  const addLabResult = () => {
    if (labInput.test_name && labInput.value) {
      setFormData(prev => ({
        ...prev,
        lab_results: [...prev.lab_results, { ...labInput }]
      }));
      setLabInput({ test_name: '', value: '', unit: '', reference_range: '', status: 'Normal' });
    }
  };

  const removeLabResult = (idx) => {
    setFormData(prev => ({
      ...prev,
      lab_results: prev.lab_results.filter((_, i) => i !== idx)
    }));
  };

  const addMedication = () => {
    if (medicationInput.name && medicationInput.dose) {
      setFormData(prev => ({
        ...prev,
        current_medications: [...prev.current_medications, { ...medicationInput }]
      }));
      setMedicationInput({ name: '', dose: '', frequency: '' });
    }
  };

  const removeMedication = (idx) => {
    setFormData(prev => ({
      ...prev,
      current_medications: prev.current_medications.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/patients', {
        ...formData,
        age: parseInt(formData.age),
        allergies: formData.allergies.toString().split(',').map(s => s.trim()).filter(s => s),
        medical_history: formData.medical_history.toString().split(',').map(s => s.trim()).filter(s => s)
      });
      if (response.data.status === 'success') {
        onPatientAdded();
      }
    } catch (err) {
      setError('Failed to save patient record. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-card animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
      <div className="flex justify-between items-center mb-6" style={{  top: 0, backgroundColor: 'white', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb', zIndex: 10 }}>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <User className="text-blue-500" /> New Patient Record
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" style={{ paddingRight: '1rem' }}>
        {/* Demographics */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" /> Patient Demographics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Jane Doe" />
            </div>
            <div className="form-group">
              <label>Age *</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} required placeholder="e.g. 45" />
            </div>
            <div className="form-group">
              <label>Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chief Complaint */}
        <div>
          <div className="form-group">
            <label>Chief Complaint *</label>
            <textarea name="chief_complaint" value={formData.chief_complaint} onChange={handleChange} required placeholder="Reason for visit..." rows="2" />
          </div>
        </div>

        {/* Vital Signs */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Vital Signs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="form-group">
              <label>BP (mmHg)</label>
              <input type="text" name="bp" value={formData.vitals.bp} onChange={handleVitalChange} placeholder="120/80" />
            </div>
            <div className="form-group">
              <label>HR (bpm)</label>
              <input type="text" name="hr" value={formData.vitals.hr} onChange={handleVitalChange} placeholder="72" />
            </div>
            <div className="form-group">
              <label>Temp (°C)</label>
              <input type="text" name="temp" value={formData.vitals.temp} onChange={handleVitalChange} placeholder="37.0" />
            </div>
            <div className="form-group">
              <label>SpO₂ (%)</label>
              <input type="text" name="spo2" value={formData.vitals.spo2} onChange={handleVitalChange} placeholder="98" />
            </div>
            <div className="form-group">
              <label>RR (/min)</label>
              <input type="text" name="rr" value={formData.vitals.rr} onChange={handleVitalChange} placeholder="16" />
            </div>
            <div className="form-group">
              <label>BMI</label>
              <input type="text" name="bmi" value={formData.vitals.bmi} onChange={handleVitalChange} placeholder="22.5" />
            </div>
          </div>
        </div>

        {/* Lab Results */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Lab Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <input
              type="text"
              placeholder="Test name"
              value={labInput.test_name}
              onChange={(e) => setLabInput({...labInput, test_name: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Value"
              value={labInput.value}
              onChange={(e) => setLabInput({...labInput, value: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Unit"
              value={labInput.unit}
              onChange={(e) => setLabInput({...labInput, unit: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Ref range"
              value={labInput.reference_range}
              onChange={(e) => setLabInput({...labInput, reference_range: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={labInput.status}
              onChange={(e) => setLabInput({...labInput, status: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Low">Low</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <button
            type="button"
            onClick={addLabResult}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mb-3"
          >
            <Plus className="w-5 h-5" /> Add Lab Result
          </button>
          {formData.lab_results.length > 0 && (
            <div className="space-y-2">
              {formData.lab_results.map((lab, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span>{lab.test_name}: {lab.value} {lab.unit} ({lab.status})</span>
                  <button
                    type="button"
                    onClick={() => removeLabResult(idx)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Medications */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Current Medications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Medication name"
              value={medicationInput.name}
              onChange={(e) => setMedicationInput({...medicationInput, name: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Dose"
              value={medicationInput.dose}
              onChange={(e) => setMedicationInput({...medicationInput, dose: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Frequency"
              value={medicationInput.frequency}
              onChange={(e) => setMedicationInput({...medicationInput, frequency: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={addMedication}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mb-3"
          >
            <Plus className="w-5 h-5" /> Add Medication
          </button>
          {formData.current_medications.length > 0 && (
            <div className="space-y-2">
              {formData.current_medications.map((med, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span>{med.name} — {med.dose} {med.frequency && `(${med.frequency})`}</span>
                  <button
                    type="button"
                    onClick={() => removeMedication(idx)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medical History & Allergies */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Medical Background</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label>Medical History (comma separated)</label>
              <input
                type="text"
                name="medical_history"
                value={formData.medical_history}
                onChange={handleChange}
                placeholder="Diabetes, Hypertension, Asthma..."
              />
            </div>
            <div className="form-group">
              <label>Allergies (comma separated)</label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="Penicillin, Latex, Shellfish..."
              />
            </div>
          </div>
        </div>

        {/* Lifestyle Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Lifestyle Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="form-group">
              <label>Smoking Status</label>
              <select name="smoking" value={formData.lifestyle.smoking} onChange={handleLifestyleChange}>
                <option value="No">Non-smoker</option>
                <option value="Current">Current smoker</option>
                <option value="Former">Former smoker</option>
              </select>
            </div>
            <div className="form-group">
              <label>Activity Level</label>
              <select name="activity_level" value={formData.lifestyle.activity_level} onChange={handleLifestyleChange}>
                <option value="Sedentary">Sedentary</option>
                <option value="Light">Light</option>
                <option value="Moderate">Moderate</option>
                <option value="Vigorous">Vigorous</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sleep Hours/Night</label>
              <input
                type="number"
                name="sleep_hours"
                value={formData.lifestyle.sleep_hours}
                onChange={handleLifestyleChange}
                placeholder="7"
                min="0"
                max="24"
              />
            </div>
            <div className="form-group">
              <label>Diet Quality</label>
              <select name="diet_quality" value={formData.lifestyle.diet_quality} onChange={handleLifestyleChange}>
                <option value="Poor">Poor</option>
                <option value="Fair">Fair</option>
                <option value="Good">Good</option>
                <option value="Excellent">Excellent</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-8" style={{ position: 'sticky', bottom: 0, backgroundColor: 'white', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            {loading ? <Activity className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
            Save Patient Record
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
