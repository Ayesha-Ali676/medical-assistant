# Device Integration Service

**For physician review only**

## Overview

The Device Integration Service provides real-time medical device data streaming for the MedAssist clinical decision-support system. It supports IoT device connectivity, vital signs processing, and real-time data validation.

## Features

- **Real-time Data Streaming**: WebSocket and MQTT support for continuous device data
- **Vital Signs Processing**: Real-time processing and analysis of vital signs data
- **IoT Device Connectivity**: Support for various medical IoT devices and protocols
- **Data Validation**: Comprehensive validation of device data for accuracy and completeness
- **Alert Generation**: Automatic alerts for abnormal vital signs
- **Device Management**: Registration, monitoring, and health checking of connected devices
- **Protocol Support**: WebSocket, MQTT, HTTP polling

## Supported Devices

### 1. Vital Signs Monitors
- Heart rate monitors
- Blood pressure monitors
- Pulse oximeters
- Temperature sensors
- Respiratory rate monitors

### 2. Continuous Monitoring Devices
- ECG monitors
- Continuous glucose monitors (CGM)
- Ventilators
- Infusion pumps

### 3. Wearable Devices
- Fitness trackers
- Smart watches
- Medical-grade wearables

### 4. Lab Equipment
- Blood analyzers
- Chemistry analyzers
- Point-of-care testing devices

## API Endpoints

### Register Device
```
POST /api/devices/register
```

Request body:
```json
{
  "deviceType": "vital_signs_monitor",
  "manufacturer": "Philips",
  "model": "IntelliVue MX800",
  "serialNumber": "SN123456",
  "patientId": "patient-123",
  "protocol": "websocket",
  "connectionConfig": {
    "url": "ws://device.example.com",
    "apiKey": "device-api-key"
  },
  "capabilities": ["heart_rate", "blood_pressure", "spo2", "temperature"]
}
```

### Start Device Streaming
```
POST /api/devices/:deviceId/stream/start
```

### Stop Device Streaming
```
POST /api/devices/:deviceId/stream/stop
```

### Get Latest Vital Signs
```
GET /api/devices/:deviceId/vitals/latest
```

### Get Vital Signs History
```
GET /api/devices/:deviceId/vitals/history
```

Query parameters:
- `startTime`: ISO timestamp
- `endTime`: ISO timestamp
- `limit`: Number of records (default: 100)

### Get Device Status
```
GET /api/devices/:deviceId/status
```

### Get All Devices
```
GET /api/devices
```

Query parameters:
- `patientId`: Filter by patient
- `status`: Filter by status (active, inactive, error)

### Remove Device
```
DELETE /api/devices/:deviceId
```

### Process Manual Reading
```
POST /api/devices/manual-reading
```

Request body:
```json
{
  "patientId": "patient-123",
  "deviceType": "blood_pressure",
  "readings": {
    "systolic": 120,
    "diastolic": 80,
    "heartRate": 72
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Data Formats

### Vital Signs Data
```javascript
{
  deviceId: string,
  patientId: string,
  timestamp: string,
  readings: {
    heartRate: number,        // bpm
    bloodPressure: {
      systolic: number,       // mmHg
      diastolic: number       // mmHg
    },
    spo2: number,            // %
    temperature: number,      // °C
    respiratoryRate: number   // breaths/min
  },
  quality: {
    signalQuality: number,    // 0-100
    confidence: number        // 0-1
  },
  alerts: Array<{
    type: string,
    severity: string,
    message: string
  }>
}
```

### Device Status
```javascript
{
  deviceId: string,
  status: 'active' | 'inactive' | 'error',
  lastDataReceived: string,
  connectionQuality: number,  // 0-100
  batteryLevel: number,       // 0-100
  errors: Array<string>
}
```

## Real-time Streaming

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3007/stream/:deviceId');

ws.on('message', (data) => {
  const vitalSigns = JSON.parse(data);
  console.log('Received vital signs:', vitalSigns);
});
```

### MQTT Subscription
```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.subscribe('medassist/devices/:deviceId/vitals');

client.on('message', (topic, message) => {
  const vitalSigns = JSON.parse(message.toString());
  console.log('Received vital signs:', vitalSigns);
});
```

## Data Validation

The service validates all incoming device data:

- **Range Validation**: Ensures values are within physiologically plausible ranges
- **Completeness Check**: Verifies all required fields are present
- **Quality Assessment**: Evaluates signal quality and confidence scores
- **Timestamp Validation**: Checks for reasonable timestamps and detects clock drift
- **Consistency Check**: Validates relationships between different vital signs

### Validation Rules

```javascript
{
  heartRate: { min: 30, max: 250 },
  systolic: { min: 60, max: 250 },
  diastolic: { min: 40, max: 150 },
  spo2: { min: 70, max: 100 },
  temperature: { min: 32, max: 43 },
  respiratoryRate: { min: 5, max: 60 }
}
```

## Alert Generation

Automatic alerts are generated for:

- **Critical Values**: Vital signs outside safe ranges
- **Rapid Changes**: Sudden changes in vital signs
- **Device Errors**: Connection loss, low battery, sensor malfunction
- **Data Quality**: Poor signal quality or low confidence scores

Alert severities:
- `CRITICAL`: Immediate attention required
- `HIGH`: Urgent attention needed
- `MEDIUM`: Monitor closely
- `LOW`: Informational

## Configuration

Environment variables:
```
DEVICE_INTEGRATION_PORT=3007
MQTT_BROKER_URL=mqtt://localhost:1883
WEBSOCKET_PORT=3008
```

## Usage Example

```javascript
const DeviceIntegrationService = require('./services/device-integration-service');

const deviceService = new DeviceIntegrationService();

// Register a device
const { deviceId } = await deviceService.registerDevice({
  deviceType: 'vital_signs_monitor',
  manufacturer: 'Philips',
  model: 'IntelliVue MX800',
  serialNumber: 'SN123456',
  patientId: 'patient-123',
  protocol: 'websocket',
  connectionConfig: {
    url: 'ws://device.example.com',
    apiKey: 'device-api-key'
  },
  capabilities: ['heart_rate', 'blood_pressure', 'spo2']
});

// Start streaming
await deviceService.startStreaming(deviceId);

// Get latest vitals
const vitals = await deviceService.getLatestVitals(deviceId);
```

## Testing

Run tests:
```bash
npm test
```

Test coverage includes:
- Device registration and management
- Real-time data streaming
- Vital signs processing and validation
- Alert generation
- Protocol handling (WebSocket, MQTT, HTTP)
- Error handling and recovery

## Requirements Validation

This service implements:
- **Requirement 5.3**: Real-time medical device data streaming and processing
- Real-time vital signs processing and analysis
- IoT device connectivity and data validation
- Multiple protocol support (WebSocket, MQTT, HTTP)

## Error Handling

The service implements comprehensive error handling:
- Connection failures with automatic reconnection
- Invalid data validation and rejection
- Device malfunction detection
- Protocol-specific error handling
- Graceful degradation

## Logging

All operations are logged using Winston:
- Device registration/removal
- Data streaming events
- Validation failures
- Alert generation
- Errors and warnings

## Security

- Device authentication and authorization
- Encrypted connections (WSS, MQTTS)
- Data validation and sanitization
- Patient data privacy protection

## Performance

- Real-time data processing with minimal latency
- Efficient WebSocket and MQTT handling
- Buffering for high-frequency data
- Automatic reconnection with backoff

## Disclaimer

**For physician review only**

This service is part of the MedAssist AI clinical decision-support system and is intended to assist licensed physicians. All outputs require physician review and approval.
