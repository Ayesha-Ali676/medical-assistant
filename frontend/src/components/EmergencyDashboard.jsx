import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, MapPin, Zap, Clock, User } from 'lucide-react';
import RiskGauge from './RiskGauge';
import VitalSignsDisplay from './VitalSignsDisplay';
import axios from 'axios';

const EmergencyDashboard = ({ patient = null, onSOSTriggered = null }) => {
  const [sosActive, setSOSActive] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'history', 'doctor', 'hospital', 'updated', 'config'
  const [timeOffset, setTimeOffset] = useState(0); // 0 = current, higher = further back in mins
  
  // Contact Configuration State
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('emergency_contacts');
    return saved ? JSON.parse(saved) : {
      doctorName: 'Dr. Sarah Jenkins',
      doctorPhone: '555-0199',
      hospitalName: 'City General Hospital',
      hospitalPhone: '555-9111'
    };
  });

  const saveContacts = (newContacts) => {
    setContacts(newContacts);
    localStorage.setItem('emergency_contacts', JSON.stringify(newContacts));
    setActiveModal(null);
  };

  const api = axios.create({
    baseURL: 'http://127.0.0.1:8000',
  });

  const triggerSOS = async () => {
    const pId = patient?.patient_id || patient?.id;
    const pName = patient?.name || patient?.patient_name || 'Unknown Patient';

    if (!pId) {
      alert('No patient selected or patient ID missing');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/emergency-sos?patient_id=${pId}&patient_name=${encodeURIComponent(pName)}`);

      setSOSActive(true);
      setActiveAlertId(response.data.alert_id);
      
      // Visual feedback
      setTimeout(() => {
        alert('🚨 EMERGENCY SERVICES NOTIFIED\n\nAll emergency contacts have been alerted.\nEmergency services are being dispatched.');
      }, 500);

      // Trigger callback if provided
      if (onSOSTriggered) {
        onSOSTriggered(response.data);
      }

    } catch (error) {
      console.error('SOS Error:', error);
      alert('Error triggering emergency alert. Please call 911 directly.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientAlerts = async () => {
    const pId = patient?.patient_id || patient?.id;
    if (!pId) return;

    try {
      const response = await api.get(`/alerts/${pId}`);
      setAlerts(response.data || {});
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  useEffect(() => {
    fetchPatientAlerts();
    // Poll for new alerts every 5 seconds
    const interval = setInterval(fetchPatientAlerts, 5000);
    return () => clearInterval(interval);
  }, [patient?.patient_id, patient?.id]);

  // DERIVED DATA (calculated on every render for reactivity)
  const mockVitals = {
    heartRate: (patient?.vitals?.hr || 95) + Math.floor(timeOffset / 10),
    bloodPressure: patient?.vitals?.bp || '140/90',
    oxygenLevel: (patient?.vitals?.spo2 || 92) - Math.floor(timeOffset / 30),
    temperature: patient?.vitals?.temp || 37.5,
    respiratoryRate: (patient?.vitals?.rr || 18) + Math.floor(timeOffset / 20)
  };

  const baseRisk = patient?.priority === 'CRITICAL' ? 95 : (patient?.priority === 'HIGH' ? 75 : 45);
  const mockRiskScore = Math.min(100, baseRisk + Math.floor(timeOffset / 5));

  // HANDLERS

  const RiskRadar = ({ vitals, riskScore }) => {
    // Futuristic SVG Radar Chart
    const size = 200;
    const center = size / 2;
    const radius = 80;
    
    // Normalize values (0 to 1)
    const radarData = [
        Math.min(1, (vitals.heartRate - 60) / 100), // Cardiac
        Math.max(0, (vitals.oxygenLevel - 80) / 20), // Respiratory
        Math.min(1, (patient?.medical_history?.length || 0) / 5), // History
        riskScore / 100, // AI Risk
        0.8 // Stability (mock)
    ];

    const getPoint = (val, i, total) => {
        const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
        const dist = radius * Math.min(1.2, Math.max(0.1, val));
        return `${center + dist * Math.cos(angle)},${center + dist * Math.sin(angle)}`;
    };

    const radarPath = radarData.map((p, i) => getPoint(p, i, radarData.length)).join(' ');

    return (
        <div style={{textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}>
            <h4 style={{fontSize: '10px', color: '#94a3b8', marginBottom: '10px', letterSpacing: '2px', textTransform: 'uppercase'}}>Risk Vector</h4>
            <svg width={size} height={size} style={{filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.4))'}}>
                {/* Background hexagons */}
                {[0.25, 0.5, 0.75, 1].map(scale => (
                    <polygon
                        key={scale}
                        points={radarData.map((_, i) => getPoint(scale, i, radarData.length)).join(' ')}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                    />
                ))}
                {/* Radar Area */}
                <polygon
                    points={radarPath}
                    fill="rgba(59, 130, 246, 0.25)"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    className="radar-pulse"
                />
                {/* Axis dots */}
                {radarData.map((p, i) => (
                    <circle
                        key={i}
                        cx={getPoint(p, i, radarData.length).split(',')[0]}
                        cy={getPoint(p, i, radarData.length).split(',')[1]}
                        r="3.5"
                        fill="#60a5fa"
                        style={{ filter: 'drop-shadow(0 0 5px #3b82f6)' }}
                    />
                ))}
            </svg>
            <div style={{display: 'flex', justifyContent: 'space-around', fontSize: '9px', color: '#64748b', marginTop: '10px', fontWeight: 'bold'}}>
                <span>CRD</span>
                <span>RSP</span>
                <span>HIS</span>
                <span>AI</span>
                <span>STB</span>
            </div>
        </div>
    );
  };

  const resolveSOS = async () => {
    if (!activeAlertId) {
      setSOSActive(false);
      return;
    }

    setLoading(true);
    try {
      await api.post(`/alerts/${activeAlertId}/resolve`);
      setSOSActive(false);
      setActiveAlertId(null);
      fetchPatientAlerts();
      alert('SOS Alert Resolved and Closed.');
    } catch (error) {
      console.error('Resolve Error:', error);
      alert('Failed to resolve alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Modal = ({ title, children, onClose }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="emergency-dashboard">
      <style>{`
        .emergency-dashboard {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          min-height: 100vh;
          padding: 24px;
          color: white;
        }

        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .header-title {
          font-size: 32px;
          font-weight: 900;
          background: linear-gradient(135deg, #ef4444, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .patient-info {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.1);
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .patient-name {
          font-weight: 600;
          font-size: 14px;
        }

        .sos-container {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
        }

        .sos-button {
          flex: 2;
          padding: 24px;
          background: linear-gradient(135deg, #dc2626, #991b1b);
          border: 3px solid #fca5a5;
          border-radius: 16px;
          font-size: 28px;
          font-weight: 900;
          cursor: pointer;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.5);
          text-transform: uppercase;
          letter-spacing: 2px;
          animation: pulse-sos 2s ease-in-out infinite;
        }

        .resolve-button {
          flex: 1;
          padding: 24px;
          background: #10b981;
          border: 3px solid #6ee7b7;
          border-radius: 16px;
          font-size: 20px;
          font-weight: 800;
          cursor: pointer;
          color: white;
          transition: all 0.3s ease;
        }

        .sos-button:hover {
          transform: scale(1.02);
          box-shadow: 0 0 50px rgba(220, 38, 38, 0.8);
        }

        .sos-button:active {
          transform: scale(0.98);
        }

        .sos-button.active {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: #6ee7b7;
          animation: none;
        }

        .sos-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @keyframes pulse-sos {
          0%, 100% {
            box-shadow: 0 0 30px rgba(220, 38, 38, 0.5);
          }
          50% {
            box-shadow: 0 0 60px rgba(220, 38, 38, 0.8);
          }
        }

        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .main-content {
            grid-template-columns: 1fr;
          }
        }

        .risk-section {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .vitals-section {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          color: #000;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .action-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          font-size: 14px;
          text-align: center;
        }

        .action-button:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-4px);
        }

        .action-button svg {
          width: 32px;
          height: 32px;
          margin-bottom: 12px;
        }

        .alerts-section {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 20px;
          margin-top: 24px;
        }

        .alerts-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-item {
          background: rgba(255, 255, 255, 0.1);
          border-left: 4px solid;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .alert-item.critical {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .alert-item.warning {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }

        .alert-item.info {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }

        .no-alerts {
          color: #9ca3af;
          text-align: center;
          padding: 20px;
          font-size: 14px;
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-content {
            background: #1e293b;
            padding: 24px;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            border: 1px solid rgba(255,255,255,0.2);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 10px;
        }

        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
        }

        .history-tag {
            display: inline-block;
            background: rgba(255,255,255,0.1);
            padding: 4px 12px;
            border-radius: 20px;
            margin: 4px;
            font-size: 14px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse-radar {
            0% { opacity: 0.2; }
            50% { opacity: 0.4; }
            100% { opacity: 0.2; }
        }

        .radar-pulse {
            animation: pulse-radar 3s infinite ease-in-out;
        }
      `}</style>

      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-top">
            <div className="header-title">
              🚨 EMERGENCY ALERT SYSTEM
            </div>
            {patient && (
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button 
                  className="nav-item" 
                  onClick={() => setActiveModal('config')}
                  style={{background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'}}
                >
                  ⚙️ Configure Contacts
                </button>
                <div className="patient-info">
                    <User size={16} />
                    <span className="patient-name">{patient.name || patient.patient_name}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SOS Button - PRIMARY FEATURE */}
        <div className="sos-container">
            <button
            className={`sos-button ${sosActive ? 'active' : ''}`}
            onClick={triggerSOS}
            disabled={loading || !patient}
            >
            {sosActive ? '✅ SOS ACTIVATED' : '🆘 SOS - CALL EMERGENCY'}
            </button>
            {sosActive && (
                <button className="resolve-button" onClick={resolveSOS} disabled={loading}>
                     RESOLVE SOS
                </button>
            )}
        </div>

        {/* Clinical Copilot - NEW HACKATHON FEATURE */}
        <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '24px',
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '24px',
            backdropFilter: 'blur(10px)'
        }}>
            <div>
                <h3 style={{fontSize: '20px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    ✨ CLINICAL CO-PILOT
                </h3>
                <p style={{color: '#cbd5e1', fontSize: '14px', marginBottom: '20px'}}>
                    Autonomous clinical intelligence powered by AI. Travel through medical history in real-time.
                </p>
                <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                    <div style={{flex: 1.5, background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '8px'}}>
                            <span>⏳ TIME MACHINE</span>
                            <span>{timeOffset === 0 ? 'LIVE NOW' : `${timeOffset}m AGO`}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="120" 
                            step="10" 
                            value={timeOffset}
                            onChange={(e) => setTimeOffset(parseInt(e.target.value))}
                            style={{width: '100%', cursor: 'pointer', accentColor: '#3b82f6'}}
                        />
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '4px'}}>
                            <span>Current</span>
                            <span>-1h</span>
                            <span>-2h</span>
                        </div>
                    </div>
                </div>
            </div>
            <RiskRadar vitals={mockVitals} riskScore={mockRiskScore} />
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Risk Score Section */}
          <div className="risk-section">
            <RiskGauge riskScore={mockRiskScore} showAnimation={true} />
          </div>

          {/* Vital Signs Section */}
          <div className="vitals-section">
            <VitalSignsDisplay vitals={mockVitals} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="action-button" onClick={() => setActiveModal('doctor')}>
            <Phone />
            Call Doctor
          </button>
          <button className="action-button" onClick={() => window.open('https://www.google.com/maps/search/nearest+hospital', '_blank')}>
            <MapPin />
            Nearest Hospital
          </button>
          <button className="action-button" onClick={() => setActiveModal('history')}>
            <Zap />
            Medical History
          </button>
          <button className="action-button" onClick={() => setActiveModal('updated')}>
            <Clock />
            Last Updated
          </button>
        </div>

        {/* Alerts History */}
        <div className="alerts-section">
          <div className="alerts-title">
            <AlertTriangle size={20} />
            Alert History
          </div>
          {alerts.patient_id ? (
            <>
              {alerts.critical_alerts?.map((alert, idx) => (
                <div key={idx} className="alert-item critical">
                  🔴 CRITICAL: {alert.message} <span style={{float: 'right', opacity: 0.6}}>{new Date(alert.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
              {alerts.warning_alerts?.map((alert, idx) => (
                <div key={idx} className="alert-item warning">
                  🟡 WARNING: {alert.message} <span style={{float: 'right', opacity: 0.6}}>{new Date(alert.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
              {alerts.info_alerts?.map((alert, idx) => (
                <div key={idx} className="alert-item info">
                  🔵 INFO: {alert.message} <span style={{float: 'right', opacity: 0.6}}>{new Date(alert.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
              {(!alerts.critical_alerts?.length && !alerts.warning_alerts?.length && !alerts.info_alerts?.length) && (
                  <div className="no-alerts">No alerts for this patient</div>
              )}
            </>
          ) : (
            <div className="no-alerts">No active alerts</div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'history' && (
        <Modal title="Medical History" onClose={() => setActiveModal(null)}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
            {patient?.medical_history?.length > 0 ? (
                patient.medical_history.map((h, i) => <span key={i} className="history-tag">{h}</span>)
            ) : <p>No medical history records found.</p>}
          </div>
        </Modal>
      )}

      {activeModal === 'doctor' && (
        <Modal title="Emergency Contacts" onClose={() => setActiveModal(null)}>
          <div style={{background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px'}}>
            <h4 style={{marginBottom: '8px'}}>Primary Physician</h4>
            <p style={{fontSize: '18px', fontWeight: 'bold'}}>{contacts.doctorName}</p>
            <p style={{color: '#94a3b8'}}>Medical Specialist</p>
            <a href={`tel:${contacts.doctorPhone}`} className="sos-button" style={{display: 'block', textAlign: 'center', marginTop: '16px', fontSize: '16px', textDecoration: 'none', animation: 'none', boxShadow: 'none', padding: '12px'}}>
                CALL NOW: {contacts.doctorPhone}
            </a>
            
            <h4 style={{marginBottom: '8px', marginTop: '24px'}}>Nearest Hospital</h4>
            <p style={{fontSize: '16px', fontWeight: 'bold'}}>{contacts.hospitalName}</p>
            <a href={`tel:${contacts.hospitalPhone}`} style={{color: '#3b82f6', textDecoration: 'none', display: 'block', marginTop: '4px'}}>
                Emergency Line: {contacts.hospitalPhone}
            </a>
          </div>
        </Modal>
      )}

      {activeModal === 'config' && (
        <Modal title="Configure Emergency Contacts" onClose={() => setActiveModal(null)}>
          <div className="config-form" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px'}}>Doctor Name</label>
              <input 
                type="text" 
                defaultValue={contacts.doctorName}
                id="docName"
                style={{width: '100%', padding: '8px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: 'white'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px'}}>Doctor Phone</label>
              <input 
                type="text" 
                defaultValue={contacts.doctorPhone}
                id="docPhone"
                style={{width: '100%', padding: '8px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: 'white'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px'}}>Nearest Hospital</label>
              <input 
                type="text" 
                defaultValue={contacts.hospitalName}
                id="hospName"
                style={{width: '100%', padding: '8px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: 'white'}}
              />
            </div>
             <div>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px'}}>Hospital Emergency Number</label>
              <input 
                type="text" 
                defaultValue={contacts.hospitalPhone}
                id="hospPhone"
                style={{width: '100%', padding: '8px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: 'white'}}
              />
            </div>
            <button 
              onClick={() => {
                const newContacts = {
                  doctorName: document.getElementById('docName').value,
                  doctorPhone: document.getElementById('docPhone').value,
                  hospitalName: document.getElementById('hospName').value,
                  hospitalPhone: document.getElementById('hospPhone').value,
                };
                saveContacts(newContacts);
              }}
              style={{background: '#10b981', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px'}}
            >
              Save Configuration
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'updated' && (
        <Modal title="System Sync Status" onClose={() => setActiveModal(null)}>
            <div style={{textAlign: 'center', padding: '20px'}}>
                <Clock size={48} style={{color: '#3b82f6', marginBottom: '16px'}} />
                <p>Last Data Record: {patient?.lastUpdated ? new Date(patient.lastUpdated).toLocaleString() : 'N/A'}</p>
                <p style={{color: '#94a3b8', fontSize: '14px', marginTop: '8px'}}>All systems operational. Connected to MedAssist Cloud.</p>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default EmergencyDashboard;
