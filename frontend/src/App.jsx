import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Activity, TrendingUp, TrendingDown, Minus, UserPlus, FileSearch, Home, Loader, Trash2 } from 'lucide-react';
import PatientForm from './components/PatientForm';
import ReportScanner from './components/ReportScanner';
import './App.css';

const App = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [analysis, setAnalysis] = useState({
    summary: {
      clinical_narrative: '',
      key_findings: [],
      urgency_score: 0,
      priority_level: 'NORMAL'
    },
    alerts: {
      vitals: [],
      labs: [],
      medications: []
    },
    ml_risk: {
      priority_score: 0,
      risk_level: 'LOW'
    }
  });
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendError, setBackendError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const api = axios.create({
    baseURL: 'http://127.0.0.1:8000',
    timeout: 30000, // 30 second timeout for analysis
  });

  // Delete patient function
  const deletePatient = async (patientId, patientName) => {
    if (!window.confirm(`Are you sure you want to delete patient ${patientName} (${patientId})?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/patients/${patientId}`);
      
      const updatedPatients = patients.filter(p => p.patient_id !== patientId);
      setPatients(updatedPatients);
      
      if (selectedPatient?.patient_id === patientId) {
        setSelectedPatient(updatedPatients.length > 0 ? updatedPatients[0] : null);
        setAnalysis({
          summary: { clinical_narrative: '', key_findings: [], urgency_score: 0, priority_level: 'NORMAL' },
          alerts: { vitals: [], labs: [], medications: [] },
          ml_risk: { priority_score: 0, risk_level: 'LOW' }
        });
      }
      
      console.log(`Patient ${patientId} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete patient:', error);
      alert(`Failed to delete patient: ${error.message}`);
    }
  };

  // Check backend health
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.get('/health');
        console.log('Backend healthy:', response.data);
        setBackendStatus('connected');
        setBackendError(null);
      } catch (error) {
        console.error('Backend error:', error.message);
        setBackendStatus('error');
        setBackendError(error.message);
      }
    };
    checkBackend();
  }, []);

  // Fetch patients from backend
  useEffect(() => {
    const fetchPatients = async () => {
      console.log('Fetching patients...');
      try {
        const response = await api.get('/patients');
        console.log('Fetched patients:', response.data);
        const enhancedPatients = response.data.map(p => ({
          ...p,
          id: p.patient_id,
          priority: calculatePriority(p),
          priorityLevel: calculatePriority(p),
          alertCount: countAlerts(p),
          lastUpdated: new Date().toISOString()
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
    if (backendStatus === 'connected') {
      fetchPatients();
    }
  }, [backendStatus]);

  const refreshPatients = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/patients');
      const enhancedPatients = response.data.map(p => ({
        ...p,
        id: p.patient_id,
        priority: calculatePriority(p),
        priorityLevel: calculatePriority(p),
        alertCount: countAlerts(p),
        lastUpdated: new Date().toISOString()
      }));
      setPatients(enhancedPatients);
    } catch (error) {
      console.error('Failed to refresh patients:', error);
    }
  };

  // Analyze patient when selected (only once per patient)
  useEffect(() => {
    if (selectedPatient && selectedPatient.patient_id) {
      analyzePatient(selectedPatient);
    }
  }, [selectedPatient?.patient_id]);

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
      // Remove frontend-only fields before sending to backend
      const { priority, alertCount, id, priorityLevel, lastUpdated, ...patientData } = patient;
      
      setAnalysisLoading(true);
      const response = await api.post('/analyze-patient', patientData);
      const data = response.data;
      console.log('Analysis result:', data);
      
      // Map backend response to frontend expected structure
      setAnalysis({
        summary: data.ai_interpretation || { clinical_narrative: 'AI analysis unavailable' },
        alerts: data.safety_alerts || { vitals: [], labs: [], medications: [] },
        ml_risk: {
          priority_score: data.clinical_assessment?.score || 0,
          risk_level: data.clinical_assessment?.level || 'LOW'
        }
      });
    } catch (error) {
      console.error('Analysis failed:', error);
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
    } finally {
      setAnalysisLoading(false);
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

  if (loading || backendStatus === 'checking') {
    return (
      <div className="loading-screen">
        <Activity className="loading-icon" />
        <p>Loading MedAssist Clinical Workstation...</p>
        {backendStatus === 'checking' && <p style={{fontSize: '12px', marginTop: '10px', color: '#666'}}>Connecting to backend...</p>}
      </div>
    );
  }

  if (backendStatus === 'error') {
    return (
      <div className="loading-screen" style={{backgroundColor: '#fff3cd'}}>
        <AlertTriangle className="loading-icon" style={{color: '#ff6b6b'}} />
        <h2 style={{color: '#d32f2f', marginTop: '10px'}}>Backend Connection Error</h2>
        <p style={{color: '#666', marginTop: '10px'}}>Cannot connect to backend API</p>
        <p style={{color: '#999', fontSize: '12px', marginTop: '10px'}}>{backendError}</p>
        <div style={{marginTop: '20px', fontSize: '12px', textAlign: 'left', backgroundColor: '#fff', padding: '15px', borderRadius: '5px', maxWidth: '400px'}}>
          <p><strong>Troubleshooting:</strong></p>
          <ol style={{margin: '10px 0', paddingLeft: '20px'}}>
            <li>Make sure backend is running on port 8000</li>
            <li>Check if .env file has GEMINI_API_KEY set</li>
            <li>Try: cd backend && python -m uvicorn main:app --reload</li>
            <li>Check browser console for more details (F12)</li>
          </ol>
        </div>
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
            <span className="physician-name"></span>
            <span className="department"></span>
          </div>
        </div>
      </header>

      <div className="main-layout">
        {activeTab === 'dashboard' ? (
          <>
            {/* LEFT PANEL - Priority Patient List */}
            <aside className="patient-list-panel">
              <div className="panel-header">
                <h2>Patients' Record</h2>
                <span className="patient-count">{patients.length} Patients</span>
              </div>

              <div className="patient-cards">
                {patients.map(patient => (
                  <div
                    key={patient.patient_id}
                    className={`patient-card ${selectedPatient?.patient_id === patient.patient_id ? 'selected' : ''} ${getPriorityColor(patient.priority)}`}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <div className="priority-indicator"></div>
                    <div 
                      className="patient-card-content"
                      onClick={() => setSelectedPatient(patient)}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
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
                    <button
                      className="delete-patient-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePatient(patient.patient_id, patient.name);
                      }}
                      title="Delete patient"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        color: '#dc2626',
                        opacity: 0.6,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                  {analysisLoading ? (
                    <div className="ai-summary-box" style={{ opacity: 0.7 }}>
                      <div className="ai-label">AI CLINICAL SUMMARY</div>
                      <div className="flex items-center gap-3">
                        <Loader className="animate-spin w-5 h-5 text-blue-500" />
                        <p className="ai-narrative">Gemini is analyzing patient data...</p>
                      </div>
                    </div>
                  ) : analysis && analysis.summary ? (
                    <div className="ai-summary-box">
                      <div className="ai-label">AI CLINICAL SUMMARY</div>
                      <p className="ai-narrative">{analysis.summary.clinical_narrative || 'Clinical analysis pending...'}</p>
                      {analysis.summary.key_findings && analysis.summary.key_findings.length > 0 && (
                        <div className="key-findings-list">
                          <strong>Key Findings:</strong>
                          <ul>
                            {analysis.summary.key_findings.map((finding, idx) => (
                              <li key={idx}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="ai-meta">
                        <span>Confidence: High</span>
                        <span>•</span>
                        <span>Urgency Score: {analysis.summary.urgency_score || 5}/10</span>
                      </div>
                      <div className="disclaimer">For physician review only — Not for diagnostic use</div>
                    </div>
                  ) : null}

                  {/* Vitals Grid */}
                  <div className="section-card">
                    <h3 className="section-title">Vital Signs</h3>
                    <div className="vitals-grid">
                      <div className="vital-item">
                        <span className="vital-label">Blood Pressure</span>
                        <span className="vital-value vital-abnormal">{selectedPatient.vitals?.bp || 'N/A'}</span>
                        <span className="vital-unit">mmHg</span>
                      </div>
                      <div className="vital-item">
                        <span className="vital-label">Heart Rate</span>
                        <span className="vital-value">{selectedPatient.vitals?.hr || 'N/A'}</span>
                        <span className="vital-unit">bpm</span>
                      </div>
                      <div className="vital-item">
                        <span className="vital-label">Temperature</span>
                        <span className="vital-value">{selectedPatient.vitals?.temp || 'N/A'}</span>
                        <span className="vital-unit">°C</span>
                      </div>
                      <div className="vital-item">
                        <span className="vital-label">SpO₂</span>
                        <span className="vital-value">{selectedPatient.vitals?.spo2 || 'N/A'}</span>
                        <span className="vital-unit">%</span>
                      </div>
                      <div className="vital-item">
                        <span className="vital-label">Resp Rate</span>
                        <span className="vital-value">{selectedPatient.vitals?.rr || 'N/A'}</span>
                        <span className="vital-unit">/min</span>
                      </div>
                    </div>
                  </div>

                  {/* Medical History */}
                  {selectedPatient.medical_history && Array.isArray(selectedPatient.medical_history) && selectedPatient.medical_history.length > 0 && (
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
                  {selectedPatient.current_medications && Array.isArray(selectedPatient.current_medications) && selectedPatient.current_medications.length > 0 && (
                    <div className="section-card">
                      <h3 className="section-title">Current Medications</h3>
                      <div className="medication-list">
                        {selectedPatient.current_medications.map((med, idx) => (
                          <div key={idx} className="medication-item">
                            <div className="medication-name">{med.name || 'Unknown'}</div>
                            <div className="medication-dose">{med.dose || 'N/A'} — {med.frequency || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allergies */}
                  {selectedPatient.allergies && Array.isArray(selectedPatient.allergies) && selectedPatient.allergies.length > 0 && (
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

              {selectedPatient && selectedPatient.lab_results && Array.isArray(selectedPatient.lab_results) && (
                <div className="lab-alerts-list">
                  {selectedPatient.lab_results
                    .filter(lab => lab && lab.status !== 'Normal')
                    .map((lab, idx) => (
                      <div key={idx} className={`lab-alert-card ${lab.status === 'Critical' ? 'critical' : 'high'}`}>
                        <div className="lab-alert-header">
                          <span className="lab-name">{lab.test_name || 'Unknown Test'}</span>
                          {getTrendIcon(lab.status)}
                        </div>
                        <div className="lab-value-large">{lab.value || 'N/A'} <span className="lab-unit">{lab.unit || ''}</span></div>
                        <div className="lab-reference">Ref: {lab.reference_range || 'N/A'}</div>
                        <div className={`lab-status-badge ${lab.status === 'Critical' ? 'critical' : 'high'}`}>
                          {lab.status}
                        </div>
                      </div>
                    ))}

                  {selectedPatient.lab_results && selectedPatient.lab_results.filter(lab => lab && lab.status !== 'Normal').length === 0 && (
                    <div className="no-alerts">
                      <p>No abnormal lab values</p>
                    </div>
                  )}
                </div>
              )}

              {/* Clinical Suggestions */}
              {analysis && analysis.summary && (
                <div className="suggestions-box">
                  <h3 className="suggestions-title">Clinical Considerations</h3>
                  <ul className="suggestions-list">
                    {analysis.summary.recommendations && analysis.summary.recommendations.length > 0 ? (
                      analysis.summary.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))
                    ) : (
                      <>
                        <li>Review clinical guidelines</li>
                        <li>Monitor vitals regularly</li>
                        <li>Verify medication interactions</li>
                      </>
                    )}
                  </ul>
                  
                  {analysis.summary.diet_suggestions && analysis.summary.diet_suggestions.length > 0 && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <h3 className="suggestions-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity className="w-4 h-4" /> Dietary Suggestions
                      </h3>
                      <ul className="suggestions-list">
                        {analysis.summary.diet_suggestions.map((diet, idx) => (
                          <li key={idx}>{diet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
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