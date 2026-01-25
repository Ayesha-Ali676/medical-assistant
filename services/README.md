# MedAssist Clinical Enhancements - Microservices Architecture

This directory contains all microservices for the enhanced MedAssist clinical decision-support system.

## Services Overview

### Core Services
- **triage-engine/**: Patient priority scoring and queue management
- **ai-intelligence/**: Natural language processing and predictive analytics
- **safety-engine/**: Drug interactions, audit trails, and safety monitoring
- **workflow-service/**: Workflow automation and task management
- **alert-service/**: Real-time alert generation and notification

### Integration Layer
- **fhir-integration/**: HL7 FHIR R4 message processing
- **ehr-connector/**: Legacy EHR system integration
- **device-integration/**: Medical device data streaming

### Infrastructure
- **api-gateway/**: API Gateway with authentication and rate limiting
- **shared/**: Shared utilities, models, and configurations

## Architecture Principles
- Each service owns its data and business logic
- Services communicate via well-defined APIs
- Independent deployment and scaling capabilities
- Event-driven architecture for real-time updates
- FHIR R4 compliance for healthcare data exchange

## Clinical Safety
- All services maintain assistive (not diagnostic) role
- All outputs include "For physician review only" disclaimers
- Comprehensive audit trails for clinical decisions
- HIPAA and FDA compliance monitoring