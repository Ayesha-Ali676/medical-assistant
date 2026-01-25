-- MedAssist Clinical Decision Support System
-- Database initialization script
-- For physician review only

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patients table (FHIR Patient resource)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fhir_id VARCHAR(64) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    family_name VARCHAR(100) NOT NULL,
    given_names TEXT[] NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address JSONB,
    identifiers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL -- Multi-tenant support
);

-- Clinical encounters
CREATE TABLE clinical_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fhir_id VARCHAR(64) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    encounter_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'in-progress',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    provider_id UUID,
    chief_complaint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Observations (FHIR Observation resource)
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fhir_id VARCHAR(64) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'final',
    category VARCHAR(50),
    code_system VARCHAR(100),
    code_value VARCHAR(50),
    code_display VARCHAR(200),
    value_quantity DECIMAL(10,3),
    value_unit VARCHAR(20),
    value_string TEXT,
    effective_datetime TIMESTAMP WITH TIME ZONE,
    is_abnormal BOOLEAN DEFAULT false,
    reference_range VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Medication requests (FHIR MedicationRequest resource)
CREATE TABLE medication_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fhir_id VARCHAR(64) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    intent VARCHAR(20) DEFAULT 'order',
    medication_code_system VARCHAR(100),
    medication_code_value VARCHAR(50),
    medication_display VARCHAR(200),
    dosage_instructions JSONB,
    authored_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    requester_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Risk assessments
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE SET NULL,
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    cardiac_risk JSONB,
    respiratory_risk JSONB,
    infection_risk JSONB,
    medication_risk JSONB,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    model_version VARCHAR(20),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    tenant_id UUID NOT NULL
);

-- Triage scores
CREATE TABLE triage_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE SET NULL,
    priority_level VARCHAR(10) CHECK (priority_level IN ('CRITICAL', 'HIGH', 'NORMAL')),
    urgency_score INTEGER CHECK (urgency_score >= 0 AND urgency_score <= 100),
    factors JSONB,
    explanation TEXT[],
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    tenant_id UUID NOT NULL
);

-- Clinical alerts
CREATE TABLE clinical_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    source_service VARCHAR(50),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL
);

-- Audit trail
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    system_recommendation TEXT,
    physician_decision TEXT,
    risk_level VARCHAR(10),
    compliance_flags TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Clinical notes
CREATE TABLE clinical_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL,
    ai_generated BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    disclaimer TEXT DEFAULT 'For physician review only',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Workflow templates
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(50),
    template_data JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    alert_thresholds JSONB,
    dashboard_layout JSONB,
    specialty_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_patients_fhir_id ON patients(fhir_id);
CREATE INDEX idx_patients_tenant ON patients(tenant_id);
CREATE INDEX idx_encounters_patient ON clinical_encounters(patient_id);
CREATE INDEX idx_encounters_tenant ON clinical_encounters(tenant_id);
CREATE INDEX idx_observations_patient ON observations(patient_id);
CREATE INDEX idx_observations_code ON observations(code_system, code_value);
CREATE INDEX idx_observations_tenant ON observations(tenant_id);
CREATE INDEX idx_medication_requests_patient ON medication_requests(patient_id);
CREATE INDEX idx_medication_requests_tenant ON medication_requests(tenant_id);
CREATE INDEX idx_risk_assessments_patient ON risk_assessments(patient_id);
CREATE INDEX idx_risk_assessments_tenant ON risk_assessments(tenant_id);
CREATE INDEX idx_triage_scores_patient ON triage_scores(patient_id);
CREATE INDEX idx_triage_scores_priority ON triage_scores(priority_level, urgency_score);
CREATE INDEX idx_triage_scores_tenant ON triage_scores(tenant_id);
CREATE INDEX idx_alerts_patient ON clinical_alerts(patient_id);
CREATE INDEX idx_alerts_severity ON clinical_alerts(severity, acknowledged);
CREATE INDEX idx_alerts_tenant ON clinical_alerts(tenant_id);
CREATE INDEX idx_audit_user ON audit_trail(user_id);
CREATE INDEX idx_audit_patient ON audit_trail(patient_id);
CREATE INDEX idx_audit_created ON audit_trail(created_at);
CREATE INDEX idx_audit_tenant ON audit_trail(tenant_id);
CREATE INDEX idx_notes_patient ON clinical_notes(patient_id);
CREATE INDEX idx_notes_encounter ON clinical_notes(encounter_id);
CREATE INDEX idx_notes_tenant ON clinical_notes(tenant_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_encounters_updated_at BEFORE UPDATE ON clinical_encounters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Real-time risk assessment storage
CREATE TABLE risk_assessments_realtime (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    risk_assessment JSONB NOT NULL,
    change_type VARCHAR(50), -- 'vital_signs', 'medication', 'lab_result', 'history'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Risk change notifications
CREATE TABLE risk_change_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    notification_data JSONB NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL
);

-- WebSocket connection tracking
CREATE TABLE websocket_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id VARCHAR(100) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    physician_id UUID NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Risk update queue (for persistence across restarts)
CREATE TABLE risk_update_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    change_data JSONB NOT NULL,
    priority VARCHAR(10) DEFAULT 'NORMAL', -- 'CRITICAL', 'HIGH', 'NORMAL'
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for real-time tables
CREATE INDEX idx_risk_assessments_realtime_patient ON risk_assessments_realtime(patient_id);
CREATE INDEX idx_risk_assessments_realtime_tenant ON risk_assessments_realtime(tenant_id);
CREATE INDEX idx_risk_assessments_realtime_created ON risk_assessments_realtime(created_at);

CREATE INDEX idx_risk_notifications_patient ON risk_change_notifications(patient_id);
CREATE INDEX idx_risk_notifications_tenant ON risk_change_notifications(tenant_id);
CREATE INDEX idx_risk_notifications_acknowledged ON risk_change_notifications(acknowledged, sent_at);

CREATE INDEX idx_websocket_connections_tenant ON websocket_connections(tenant_id);
CREATE INDEX idx_websocket_connections_physician ON websocket_connections(physician_id);
CREATE INDEX idx_websocket_connections_status ON websocket_connections(status, last_activity);

CREATE INDEX idx_risk_update_queue_patient ON risk_update_queue(patient_id);
CREATE INDEX idx_risk_update_queue_processed ON risk_update_queue(processed, priority, created_at);
CREATE INDEX idx_risk_update_queue_tenant ON risk_update_queue(tenant_id);