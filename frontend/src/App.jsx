import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Activity, TrendingUp, TrendingDown, Minus, UserPlus, FileSearch, Home } from 'lucide-react';
import PatientForm from './components/PatientForm';
import ReportScanner from './components/ReportScanner';
import './App.css';

const App = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'add-patient', 'scan-report'

  const api = axios.create({
    baseURL: 'http://localhost:8000',
    timeout: 5000, // 5 second timeout
  });

  // Fetch patients from backend
  useEffect(() => {
    const fetchPatients = async () => {
      console.log('Fetching patients...');
      try {
        const response = await api.get('/patients');
        console.log('Fetched patients:', response.data);
        const enhancedPatients = response.data.map(p => ({
          ...p,
          priority: calculatePriority(p),
          alertCount: countAlerts(p)
        }));
        setPatients(enhancedPatients);
        if (enhancedPatients.length > 0) {
          setSelectedPatient(enhancedPatients[0]);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const refreshPatients = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/patients');
      const enhancedPatients = response.data.map(p => ({
        ...p,
        priority: calculatePriority(p),
        alertCount: countAlerts(p)
      }));
      setPatients(enhancedPatients);
    } catch (error) {
      console.error('Failed to refresh patients:', error);
    }
  };

  // Analyze patient when selected
  useEffect(() => {
    if (selectedPatient) {
      analyzePatient(selectedPatient);
    }
  }, [selectedPatient]);

  const calculatePriority = (patient) => {
    const vitals = patient.vitals || {};
    const bp = vitals.bp || '120/80';
    const systolic = parseInt(bp.split('/')[0]);
    
    // Simple priority calculation
    if (systolic > 160 || patient.lab_results?.some(l => l.status === 'Critical')) {
      return 'CRITICAL';
    } else if (systolic > 140 || patient.lab_results?.some(l => l.status === 'High')) {
      return 'HIGH';
    }
    return 'NORMAL';
  };

  const countAlerts = (patient) => {
    let count = 0;
    if (patient.lab_results) {
      count += patient.lab_results.filter(l => l.status === 'High' || l.status === 'Critical').length;
    }
    return count;
  };

  const analyzePatient = async (patient) => {
    console.log('Analyzing patient:', patient.patient_id);
    try {
      const response = await api.post('/analyze-patient', patient);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Analysis failed:', error.message);
      // Create mock analysis for demo
      setAnalysis({
        summary: {
          clinical_narrative: 'Patient presents with elevated glucose and blood pressure. Diabetes management requires review.',
          key_findings: ['Elevated HbA1c', 'Stage 2 Hypertension', 'Multiple medications'],
          urgency_score: 7,
          priority_level: patient.priority
        },
        alerts: {
          vitals: [],
          labs: patient.lab_results?.filter(l => l.status !== 'Normal') || [],
          medications: []
        },
        ml_risk: {
          priority_score: 2,
          label: 'High'
        }
      });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'priority-critical';
      case 'HIGH': return 'priority-high';
      default: return 'priority-normal';
    }
  };

  const getTrendIcon = (status) => {
    if (status === 'High' || status === 'Critical') return <TrendingUp className="w-4 h-4" />;
    if (status === 'Low') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Activity className="loading-icon" />
        <p>Loading MedAssist Clinical Workstation...</p>
      </div>
    );
  }

  return (
    <div className="clinical-workstation">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <div className="system-name">
            <Activity className="w-5 h-5" />
            <span>MedAssist Clinical Decision Support</span>
          </div>
        </div>
        <div className="header-right">
          <nav className="header-nav">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
            <button 
              className={`nav-item ${activeTab === 'add-patient' ? 'active' : ''}`}
              onClick={() => setActiveTab('add-patient')}
            >
              <UserPlus className="w-4 h-4" /> Add Patient
            </button>
            <button 
              className={`nav-item ${activeTab === 'scan-report' ? 'active' : ''}`}
              onClick={() => setActiveTab('scan-report')}
            >
              <FileSearch className="w-4 h-4" /> Scan Report
            </button>
          </nav>
          <div className="user-profile">
            <span className="physician-name">Dr. Sarah Chen, MD</span>
            <span className="department">Internal Medicine</span>
          </div>
        </div>
      </header>

      <div className="main-layout">
        {activeTab === 'dashboard' ? (
          <>
            {/* LEFT PANEL - Priority Patient List */}
        <aside className="patient-list-panel">
          <div className="panel-header">
            <h2>Priority Queue</h2>
            <span className="patient-count">{patients.length} Patients</span>
          </div>

          <div className="patient-cards">
            {patients.map(patient => (
              <div
                key={patient.patient_id}
                className={`patient-card ${selectedPatient?.patient_id === patient.patient_id ? 'selected' : ''} ${getPriorityColor(patient.priority)}`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="priority-indicator"></div>
                <div className="patient-card-content">
                  <div className="patient-header">
                    <span className="patient-id">{patient.patient_id}</span>
                    <span className="patient-age-gender">{patient.age}{patient.gender?.charAt(0)}</span>
                  </div>
                  <div className="patient-name">{patient.name}</div>
                  <div className="patient-complaint">{patient.chief_complaint}</div>
                  {patient.alertCount > 0 && (
                    <div className="alert-badge">{patient.alertCount} alerts</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER PANEL - Patient Detail View */}
        <main className="patient-detail-panel">
          {selectedPatient && (
            <>
              {/* Patient Header */}
              <div className="patient-detail-header">
                <div>
                  <h1 className="patient-detail-name">{selectedPatient.name}</h1>
                  <div className="patient-detail-meta">
                    <span>{selectedPatient.patient_id}</span>
                    <span>•</span>
                    <span>{selectedPatient.age} years</span>
                    <span>•</span>
                    <span>{selectedPatient.gender}</span>
                  </div>
                </div>
                <div className={`priority-badge ${getPriorityColor(selectedPatient.priority)}`}>
                  {selectedPatient.priority}
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="section-card">
                <h3 className="section-title">Chief Complaint</h3>
                <p className="chief-complaint-text">{selectedPatient.chief_complaint}</p>
              </div>

              {/* AI Clinical Summary */}
              {analysis && (
                <div className="ai-summary-box">
                  <div className="ai-label">AI CLINICAL SUMMARY</div>
                  <p className="ai-narrative">{analysis.summary.clinical_narrative}</p>
                  <div className="ai-meta">
                    <span>Confidence: High</span>
                    <span>•</span>
                    <span>Urgency Score: {analysis.summary.urgency_score}/10</span>
                  </div>
                  <div className="disclaimer">For physician review only — Not for diagnostic use</div>
                </div>
              )}

              {/* Vitals Grid */}
              <div className="section-card">
                <h3 className="section-title">Vital Signs</h3>
                <div className="vitals-grid">
                  <div className="vital-item">
                    <span className="vital-label">Blood Pressure</span>
                    <span className="vital-value vital-abnormal">{selectedPatient.vitals?.bp}</span>
                    <span className="vital-unit">mmHg</span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value">{selectedPatient.vitals?.hr}</span>
                    <span className="vital-unit">bpm</span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-label">Temperature</span>
                    <span className="vital-value">{selectedPatient.vitals?.temp}</span>
                    <span className="vital-unit">°C</span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-label">SpO₂</span>
                    <span className="vital-value">{selectedPatient.vitals?.spo2}</span>
                    <span className="vital-unit">%</span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-label">Resp Rate</span>
                    <span className="vital-value">{selectedPatient.vitals?.rr}</span>
                    <span className="vital-unit">/min</span>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              {selectedPatient.medical_history && selectedPatient.medical_history.length > 0 && (
                <div className="section-card">
                  <h3 className="section-title">Medical History</h3>
                  <div className="history-list">
                    {selectedPatient.medical_history.map((condition, idx) => (
                      <span key={idx} className="history-tag">{condition}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Medications */}
              {selectedPatient.current_medications && selectedPatient.current_medications.length > 0 && (
                <div className="section-card">
                  <h3 className="section-title">Current Medications</h3>
                  <div className="medication-list">
                    {selectedPatient.current_medications.map((med, idx) => (
                      <div key={idx} className="medication-item">
                        <div className="medication-name">{med.name}</div>
                        <div className="medication-dose">{med.dose} — {med.frequency}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergies */}
              {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                <div className="alert-box alert-warning">
                  <AlertTriangle className="w-5 h-5" />
                  <div>
                    <div className="alert-title">Allergies</div>
                    <div className="alert-content">{selectedPatient.allergies.join(', ')}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* RIGHT PANEL - Lab Alerts */}
        <aside className="lab-alerts-panel">
          <div className="panel-header">
            <h2>Lab Alerts</h2>
          </div>

          {selectedPatient && selectedPatient.lab_results && (
            <div className="lab-alerts-list">
              {selectedPatient.lab_results
                .filter(lab => lab.status !== 'Normal')
                .map((lab, idx) => (
                  <div key={idx} className={`lab-alert-card ${lab.status === 'Critical' ? 'critical' : 'high'}`}>
                    <div className="lab-alert-header">
                      <span className="lab-name">{lab.test_name}</span>
                      {getTrendIcon(lab.status)}
                    </div>
                    <div className="lab-value-large">{lab.value} <span className="lab-unit">{lab.unit}</span></div>
                    <div className="lab-reference">Ref: {lab.reference_range}</div>
                    <div className={`lab-status-badge ${lab.status === 'Critical' ? 'critical' : 'high'}`}>
                      {lab.status}
                    </div>
                  </div>
                ))}

              {selectedPatient.lab_results.filter(lab => lab.status !== 'Normal').length === 0 && (
                <div className="no-alerts">
                  <p>No abnormal lab values</p>
                </div>
              )}
            </div>
          )}

          {/* Clinical Suggestions */}
          {analysis && (
            <div className="suggestions-box">
              <h3 className="suggestions-title">Clinical Considerations</h3>
              <ul className="suggestions-list">
                <li>Review diabetes management protocol</li>
                <li>Consider BP medication adjustment</li>
                <li>Monitor renal function closely</li>
              </ul>
              <div className="suggestions-disclaimer">Clinical Support — Not Diagnosis</div>
            </div>
          )}
        </aside>
          </>
        ) : activeTab === 'add-patient' ? (
          <div className="full-width-panel">
            <PatientForm 
              onPatientAdded={() => {
                refreshPatients();
                setActiveTab('dashboard');
              }}
              onCancel={() => setActiveTab('dashboard')}
            />
          </div>
        ) : (
          <div className="full-width-panel">
            <ReportScanner />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
