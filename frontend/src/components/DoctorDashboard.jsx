import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Zap, FileText, Pill, Phone, Printer } from 'lucide-react';

const DoctorDashboard = ({ patient }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // 'discharge', 'labs', 'meds', 'specialist'
  const [modalContent, setModalContent] = useState('');
  const [editableMeds, setEditableMeds] = useState([]);
  const [isEditingMeds, setIsEditingMeds] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        // Process voice commands
        if (finalTranscript) {
          processVoiceCommand(finalTranscript.toLowerCase());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const processVoiceCommand = (command) => {
    const timestamp = new Date().toLocaleTimeString();
    
    if (command.includes('order') && command.includes('x-ray')) {
      setVoiceNotes(prev => [...prev, { time: timestamp, action: '📋 Ordered: Chest X-ray', type: 'order' }]);
    } else if (command.includes('discharge')) {
      setVoiceNotes(prev => [...prev, { time: timestamp, action: '✅ Discharge initiated', type: 'discharge' }]);
    } else if (command.includes('refill')) {
      setVoiceNotes(prev => [...prev, { time: timestamp, action: '💊 Medication refill requested', type: 'medication' }]);
    } else {
      setVoiceNotes(prev => [...prev, { time: timestamp, action: `📝 Note: ${command}`, type: 'note' }]);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setTranscript('');
    }
  };

  // Quick Actions with Modal Display
  const handleDischarge = () => {
    const content = `DISCHARGE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient: ${patient?.name || 'Unknown Patient'}
MRN: ${patient?.id || 'N/A'}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

DIAGNOSIS
Stable condition with no acute concerns

TREATMENT PROVIDED
Standard protocol followed
Vitals monitored and within normal limits

MEDICATIONS
Continue current medication regimen
${patient?.current_medications?.map(m => `• ${m.name} ${m.dose}`).join('\n') || '• As prescribed'}

FOLLOW-UP INSTRUCTIONS
• Schedule appointment with primary care physician in 2 weeks
• Return to ER if symptoms worsen
• Maintain current medication schedule
• Rest and hydrate adequately

DISCHARGE APPROVED BY
Attending Physician
${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    setModalContent(content);
    setActiveModal('discharge');
  };

  const handleOrderLabs = () => {
    const content = `LABORATORY ORDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient: ${patient?.name || 'Unknown Patient'}
MRN: ${patient?.id || 'N/A'}
Ordered: ${new Date().toLocaleString()}

COMMON LAB PANEL
✓ Complete Blood Count (CBC)
  - Hemoglobin, Hematocrit
  - WBC with differential
  - Platelet count

✓ Comprehensive Metabolic Panel (CMP)
  - Glucose, Calcium
  - Electrolytes (Na, K, Cl, CO2)
  - Kidney function (BUN, Creatinine)
  - Liver function (AST, ALT, Bilirubin)

✓ Cardiac Markers
  - Troponin I
  - BNP

✓ Coagulation Studies
  - D-Dimer
  - PT/INR

✓ Urinalysis
  - Complete with microscopy

PRIORITY: Routine
COLLECTION: ASAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    setModalContent(content);
    setActiveModal('labs');
  };

  const handleRefillMeds = () => {
    const meds = patient?.current_medications || [
      { name: 'Lisinopril', dose: '10mg', frequency: 'once daily' },
      { name: 'Metformin', dose: '500mg', frequency: 'twice daily' }
    ];
    
    // Initialize editable medications
    setEditableMeds(meds.map(m => ({
      ...m,
      quantity: '90-day supply',
      refills: '3'
    })));
    
    // Set initial static content
    setModalContent(generateMedRefillContent(meds.map(m => ({
      ...m,
      quantity: '90-day supply',
      refills: '3'
    }))));
    
    setIsEditingMeds(false); // Start in view mode
    setActiveModal('meds');
  };

  const generateMedRefillContent = (medsToUse = editableMeds) => {
    return `MEDICATION REFILL REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient: ${patient?.name || 'Unknown Patient'}
MRN: ${patient?.id || 'N/A'}
Date: ${new Date().toLocaleDateString()}

MEDICATIONS TO REFILL
${medsToUse.map((m, i) => `
${i + 1}. ${m.name} ${m.dose}
   Frequency: ${m.frequency || 'As prescribed'}
   Quantity: ${m.quantity}
   Refills: ${m.refills}
   Status: ✓ APPROVED
`).join('\n')}

PHARMACY INSTRUCTIONS
• Send to patient's preferred pharmacy
• Include all current medications
• No changes to dosage

PRESCRIBING PHYSICIAN
Attending Physician
License: Active
Date: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  };

  const handleCallSpecialist = () => {
    const content = `ON-CALL SPECIALISTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🫀 CARDIOLOGY
Dr. Sarah Mitchell
Direct: 555-0123
Pager: 555-9001

🧠 NEUROLOGY
Dr. James Chen
Direct: 555-0456
Pager: 555-9002

🦴 ORTHOPEDICS
Dr. Maria Rodriguez
Direct: 555-0789
Pager: 555-9003

🔬 INTERNAL MEDICINE
Dr. Robert Kim
Direct: 555-0147
Pager: 555-9004

⚡ EMERGENCY CONSULT
Call: 555-STAT (7828)
Available 24/7
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    setModalContent(content);
    setActiveModal('specialist');
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const printModalContent = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Summary</title>');
    printWindow.document.write('<style>body { font-family: monospace; white-space: pre-wrap; padding: 20px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(modalContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      minHeight: '100vh',
      padding: '24px',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
            👨‍⚕️ Doctor Efficiency Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Patient: {patient?.name || 'John Doe'} • Age: {patient?.age || 45} • MRN: {patient?.id || '12345'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Quick Actions Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={24} color="#3b82f6" />
              Quick Actions
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <button onClick={handleDischarge} style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                <FileText size={20} />
                ⚡ Discharge Ready
              </button>

              <button onClick={handleOrderLabs} style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                📋 Order Common Labs
              </button>

              <button onClick={handleRefillMeds} style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                <Pill size={20} />
                💊 Refill All Meds
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={handleCallSpecialist} style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                >
                  <Phone size={18} />
                  Call Specialist
                </button>

                <button onClick={handlePrintSummary} style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                >
                  <Printer size={18} />
                  Print Summary
                </button>
              </div>
            </div>
          </div>

          {/* Voice Command Mode */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mic size={24} color="#f59e0b" />
              Voice Command Mode
            </h2>

            <button onClick={toggleListening} style={{
              width: '100%',
              padding: '24px',
              background: isListening 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '16px',
              animation: isListening ? 'pulse 2s infinite' : 'none',
            }}>
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              {isListening ? 'Stop Listening' : 'Start Voice Commands'}
            </button>

            {isListening && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ fontSize: '12px', color: '#60a5fa', marginBottom: '8px', fontWeight: '600' }}>
                  🎤 LISTENING...
                </p>
                <p style={{ fontSize: '14px', color: '#e2e8f0', minHeight: '40px' }}>
                  {transcript || 'Speak now...'}
                </p>
              </div>
            )}

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                  VOICE LOG
                </p>
                {voiceNotes.length > 0 && (
                  <button
                    onClick={() => setVoiceNotes([])}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              {voiceNotes.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                  No voice commands yet. Try saying "order chest x-ray" or "discharge patient"
                </p>
              ) : (
                voiceNotes.slice().reverse().map((note, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    borderLeft: '3px solid #3b82f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '4px' }}>
                        {note.action}
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748b' }}>
                        {note.time}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const actualIndex = voiceNotes.length - 1 - idx;
                        setVoiceNotes(prev => prev.filter((_, i) => i !== actualIndex));
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        marginLeft: '12px',
                        fontWeight: '600',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '24px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <p style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>
            💡 <strong>Voice Commands:</strong> Try saying "order chest x-ray", "discharge patient", "refill medications", or describe symptoms naturally.
            All commands are logged and can be reviewed later.
          </p>
        </div>
      </div>

      {/* Modal for Quick Actions */}
      {activeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}
        onClick={() => setActiveModal(null)}
        >
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: 0 }}>
                {activeModal === 'discharge' && '📄 Discharge Summary'}
                {activeModal === 'labs' && '🔬 Laboratory Orders'}
                {activeModal === 'meds' && '💊 Medication Refills'}
                {activeModal === 'specialist' && '📞 Specialist Directory'}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                ✕ Close
              </button>
            </div>

            <pre style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '24px',
              borderRadius: '12px',
              color: '#e2e8f0',
              fontSize: '13px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '20px',
            }}>
              {activeModal === 'meds' && isEditingMeds ? (
                <div style={{ fontFamily: 'system-ui', whiteSpace: 'normal' }}>
                  <div style={{ marginBottom: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`MEDICATION REFILL REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient: ${patient?.name || 'Unknown Patient'}
MRN: ${patient?.id || 'N/A'}
Date: ${new Date().toLocaleDateString()}

MEDICATIONS TO REFILL (Editing)`}
                  </div>
                  
                  {editableMeds.map((med, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255,255,255,0.05)',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <div style={{ marginBottom: '12px', color: '#60a5fa', fontWeight: '600' }}>
                        Medication #{idx + 1}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                            Medication Name
                          </label>
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => {
                              const newMeds = [...editableMeds];
                              newMeds[idx].name = e.target.value;
                              setEditableMeds(newMeds);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              color: 'white',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={med.dose}
                            onChange={(e) => {
                              const newMeds = [...editableMeds];
                              newMeds[idx].dose = e.target.value;
                              setEditableMeds(newMeds);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              color: 'white',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                            Frequency
                          </label>
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => {
                              const newMeds = [...editableMeds];
                              newMeds[idx].frequency = e.target.value;
                              setEditableMeds(newMeds);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              color: 'white',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                            Quantity
                          </label>
                          <input
                            type="text"
                            value={med.quantity}
                            onChange={(e) => {
                              const newMeds = [...editableMeds];
                              newMeds[idx].quantity = e.target.value;
                              setEditableMeds(newMeds);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              color: 'white',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                            Refills
                          </label>
                          <input
                            type="text"
                            value={med.refills}
                            onChange={(e) => {
                              const newMeds = [...editableMeds];
                              newMeds[idx].refills = e.target.value;
                              setEditableMeds(newMeds);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              color: 'white',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setEditableMeds(editableMeds.filter((_, i) => i !== idx));
                            }}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '4px',
                              color: '#f87171',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      setEditableMeds([...editableMeds, {
                        name: 'New Medication',
                        dose: '10mg',
                        frequency: 'once daily',
                        quantity: '90-day supply',
                        refills: '3'
                      }]);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '8px',
                      color: '#60a5fa',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      marginBottom: '16px',
                    }}
                  >
                    + Add Medication
                  </button>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setModalContent(generateMedRefillContent());
                        setIsEditingMeds(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      ✓ Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingMeds(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                modalContent
              )}
            </pre>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {activeModal === 'meds' && !isEditingMeds && (
                <button
                  onClick={() => setIsEditingMeds(true)}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  ✏️ Edit Medications
                </button>
              )}
              <button
                onClick={printModalContent}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Printer size={16} />
                Print Summary
              </button>
              <button
                onClick={() => {
                  const content = activeModal === 'meds' ? generateMedRefillContent() : modalContent;
                  navigator.clipboard.writeText(content);
                  alert('✅ Copied to clipboard!');
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default DoctorDashboard;
