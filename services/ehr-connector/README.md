# EHR Connector Service

**For physician review only**

## Overview

The EHR Connector Service provides legacy EHR system integration for the MedAssist clinical decision-support system. It supports concurrent connections to multiple EHR systems and handles data format transformation for various EHR types.

## Features

- **Multi-EHR Support**: Integrates with Epic, Cerner, Allscripts, Meditech, and custom EHR systems
- **Concurrent Connections**: Supports simultaneous connections to multiple EHR systems (Requirement 5.5)
- **Data Transformation**: Transforms data from various legacy formats to standardized internal format
- **Connection Pooling**: Manages connection lifecycle with health monitoring
- **Caching**: Intelligent caching to reduce redundant API calls
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Error Handling**: Comprehensive error handling and logging

## Supported EHR Systems

### 1. Epic
- FHIR R4 compliant
- Minimal transformation required
- Supports patient demographics, lab results, and medications

### 2. Cerner
- Proprietary format
- Custom field mapping
- Full patient data support

### 3. Allscripts
- XML and JSON formats
- Unity API integration
- Comprehensive data transformation

### 4. Meditech
- Legacy format support
- Custom field naming conventions
- Patient and clinical data

### 5. Custom
- Generic transformation
- Configurable field mapping
- Flexible integration

## API Endpoints

### Register EHR System
```
POST /api/ehr/register
```

Request body:
```json
{
  "type": "epic",
  "name": "Epic Test Hospital",
  "baseUrl": "https://epic.example.com",
  "apiKey": "your-api-key",
  "version": "1.0",
  "timeout": 30000,
  "retryAttempts": 3
}
```

### Fetch Patient Data
```
GET /api/ehr/:connectionId/patient/:patientId
```

Query parameters:
- `forceRefresh`: Set to `true` to bypass cache

### Fetch from Multiple Systems
```
POST /api/ehr/fetch-multiple
```

Request body:
```json
{
  "requests": [
    {
      "connectionId": "conn-1",
      "patientId": "patient-123",
      "options": { "forceRefresh": false }
    },
    {
      "connectionId": "conn-2",
      "patientId": "patient-456",
      "options": { "forceRefresh": false }
    }
  ]
}
```

### Sync Patient Data
```
POST /api/ehr/:connectionId/sync/:patientId
```

### Check Connection Health
```
GET /api/ehr/:connectionId/health
```

### Get All Connections
```
GET /api/ehr/connections
```

### Remove Connection
```
DELETE /api/ehr/:connectionId
```

### Clear Cache
```
POST /api/ehr/cache/clear
```

Request body (optional):
```json
{
  "connectionId": "conn-1"
}
```

## Data Transformation

The service transforms data from various EHR formats to a standardized internal format:

```javascript
{
  patientId: string,
  source: string, // 'epic', 'cerner', etc.
  demographics: {
    firstName: string,
    lastName: string,
    gender: 'male' | 'female' | 'other' | 'unknown',
    birthDate: string,
    mrn: string
  },
  contact: {
    phone: string,
    email: string,
    address: {
      line1: string,
      line2: string,
      city: string,
      state: string,
      postalCode: string,
      country: string
    }
  },
  active: boolean,
  lastUpdated: string
}
```

## Connection Pool

The connection pool manages concurrent connections with the following features:

- **Max Connections**: Configurable limit (default: 10)
- **Request Tracking**: Monitors active requests per connection
- **LRU Management**: Identifies least recently used connections
- **Statistics**: Provides pool usage statistics

## Configuration

Environment variables:
```
EHR_CONNECTOR_PORT=3006
```

## Usage Example

```javascript
const EHRConnectorService = require('./services/ehr-connector-service');

const ehrConnector = new EHRConnectorService();

// Register an EHR system
const { connectionId } = await ehrConnector.registerEHRSystem({
  type: 'epic',
  name: 'Epic Hospital',
  baseUrl: 'https://epic.example.com',
  apiKey: 'your-api-key'
});

// Fetch patient data
const patientData = await ehrConnector.fetchPatientData(
  connectionId,
  'patient-123'
);

// Fetch from multiple systems concurrently
const results = await ehrConnector.fetchFromMultipleSystems([
  { connectionId: 'conn-1', patientId: 'patient-123' },
  { connectionId: 'conn-2', patientId: 'patient-456' }
]);
```

## Testing

Run tests:
```bash
npm test
```

Test coverage includes:
- EHR connector service functionality
- Data transformation for all EHR types
- Connection pool management
- Concurrent operations
- Error handling

## Requirements Validation

This service implements:
- **Requirement 5.5**: Multi-EHR concurrent connection support and data mapping
- Data format transformation for multiple EHR types
- Legacy EHR system integration
- Connection pooling and management

## Error Handling

The service implements comprehensive error handling:
- Connection failures with retry logic
- Invalid configuration validation
- Pool capacity management
- Request timeout handling
- Graceful degradation

## Logging

All operations are logged using Winston:
- Connection registration/removal
- Data fetch operations
- Health checks
- Errors and warnings

## Security

- API key and credential-based authentication
- Secure connection management
- Data caching with privacy considerations
- Connection isolation

## Performance

- Intelligent caching to reduce API calls
- Concurrent request handling
- Connection pooling for efficiency
- Retry logic with exponential backoff

## Disclaimer

**For physician review only**

This service is part of the MedAssist AI clinical decision-support system and is intended to assist licensed physicians. All outputs require physician review and approval.
