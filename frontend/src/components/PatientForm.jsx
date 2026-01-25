import React, { useState } from 'react';
import { User, Activity, AlertCircle, Save, X } from 'lucide-react';
import axios from 'axios';

const PatientForm = ({ onPatientAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    patient_id: `P${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    name: '',
    age: '',
    gender: 'Male',
    chief_complaint: '',
    vitals: { bp: '120/80', hr: '72', temp: '37.0', rr: '16', spo2: '98' },
    lab_results: [],
    current_medications: [],
    allergies: [],
    medical_history: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/patients', {
        ...formData,
        age: parseInt(formData.age),
        lab_results: [], // Simplified for now
        current_medications: [],
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
    <div className="section-card animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <User className="text-blue-500" /> New Patient Record
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Jane Doe" />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" name="age" value={formData.age} onChange={handleChange} required placeholder="e.g. 45" />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Chief Complaint</label>
          <textarea name="chief_complaint" value={formData.chief_complaint} onChange={handleChange} required placeholder="Reason for visit..." rows="2" />
        </div>

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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label>Medical History (comma separated)</label>
            <input type="text" name="medical_history" value={formData.medical_history} onChange={handleChange} placeholder="Diabetes, Hypertension..." />
          </div>
          <div className="form-group">
            <label>Allergies (comma separated)</label>
            <input type="text" name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Penicillin, Latex..." />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-8">
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
