# 🚀 MedAssist Project Setup & Workflow Guide

## 📋 Project Overview

MedAssist is a microservices-based clinical decision support system with:
- **Frontend**: React dashboard (existing)
- **Backend**: Node.js microservices architecture (new)
- **Legacy**: Python backend (can be removed)
- **Database**: PostgreSQL, MongoDB, Redis, InfluxDB

---

## 🧹 Cleanup Steps

### Files to Delete (Unnecessary/Redundant)

```bash
# 1. Delete legacy Python backend (replaced by microservices)
rmdir /s /q backend

# 2. Delete unnecessary documentation
del DASHBOARD_IMPROVEMENTS.md

# 3. Delete sample data (optional - keep if needed for testing)
# rmdir /s /q data

# 4. Clean up node_modules if needed
# cd frontend && rmdir /s /q node_modules
# cd services/shared && rmdir /s /q node_modules
```

### Files to Keep

✅ **Essential Files**:
- `docker-compose.yml` - Container orchestration
- `README.md` - Project documentation
- `.env.example` - Environment template
- `start.bat` - Quick start script
- `frontend/` - React dashboard
- `services/` - All microservices
- `database/` - Database initialization
- `.kiro/specs/` - Implementation specs

---

## 🏗️ Project Structure (Clean)

```
medassist/
├── frontend/                    # React Dashboard
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── services/                    # Microservices
│   ├── api-gateway/            # Main API Gateway
│   ├── triage-engine/          # Patient triage
│   ├── ai-intelligence/        # AI processing
│   ├── safety-engine/          # Safety monitoring
│   ├── workflow-engine/        # Workflow automation
│   ├── alert-service/          # Alert management
│   ├── fhir-integration/       # FHIR integration
│   ├── ehr-connector/          # EHR connectivity
│   ├── device-integration/     # Device data
│   ├── compliance-service/     # HIPAA compliance
│   ├── cache-service/          # Redis caching
│   ├── scaling-service/        # Auto-scaling
│   └── shared/                 # Shared utilities
│
├── database/                    # Database setup
│   └── init/
│       └── 01-create-tables.sql
│
├── .kiro/specs/                # Implementation specs
│   └── medassist-clinical-enhancements/
│
├── docker-compose.yml          # Container orchestration
├── .env.example                # Environment template
├── README.md                   # Documentation
└── start.bat                   # Quick start script
```

---

## ⚙️ Environment Setup

### 1. Create Environment File

```bash
# Copy example environment file
copy .env.example .env
```

### 2. Edit `.env` File

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=medassist
POSTGRES_USER=medassist_user
POSTGRES_PASSWORD=your_secure_password

MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URL=redis://localhost:6379
INFLUXDB_URL=http://localhost:8086

# API Configuration
API_GATEWAY_PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here

# AI Services (if using external APIs)
OPENAI_API_KEY=your_openai_key_here
```

---

## 🚀 Running the Project

### Option 1: Quick Start (Recommended)

```bash
# Run the start script
start.bat
```

This will:
1. Start all database services (PostgreSQL, MongoDB, Redis, InfluxDB)
2. Initialize databases
3. Start the API Gateway
4. Start the frontend

### Option 2: Manual Start

#### Step 1: Start Databases

```bash
# Start all database containers
docker-compose up -d postgres mongodb redis influxdb
```

#### Step 2: Install Dependencies

```bash
# Install shared utilities
cd services/shared
npm install

# Install API Gateway
cd ../api-gateway
npm install

# Install frontend
cd ../../frontend
npm install
```

#### Step 3: Start Services

```bash
# Terminal 1: Start API Gateway
cd services/api-gateway
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### Option 3: Full Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 🔍 Verify Installation

### 1. Check Database Connections

```bash
# PostgreSQL
docker exec -it medassist-postgres psql -U medassist_user -d medassist

# MongoDB
docker exec -it medassist-mongodb mongosh medassist

# Redis
docker exec -it medassist-redis redis-cli ping
```

### 2. Check API Gateway

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-25T..."}
```

### 3. Check Frontend

Open browser: `http://localhost:5173`

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| API Gateway | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | localhost:5432 |
| MongoDB | 27017 | localhost:27017 |
| Redis | 6379 | localhost:6379 |
| InfluxDB | 8086 | http://localhost:8086 |

---

## 🧪 Testing

### Run All Tests

```bash
# Test shared utilities
cd services/shared
npm test

# Test safety engine
cd ../safety-engine
npm test

# Test triage engine
cd ../triage-engine
npm test

# Test AI intelligence
cd ../ai-intelligence
npm test
```

### Run Specific Test Suite

```bash
cd services/safety-engine
npm test -- drug-interaction-service.test.js
```

---

## 🛠️ Development Workflow

### 1. Start Development Environment

```bash
# Terminal 1: Databases
docker-compose up -d postgres mongodb redis influxdb

# Terminal 2: API Gateway (with hot reload)
cd services/api-gateway
npm run dev

# Terminal 3: Frontend (with hot reload)
cd frontend
npm run dev
```

### 2. Make Changes

- Edit files in `services/` or `frontend/src/`
- Changes auto-reload with hot module replacement

### 3. Test Changes

```bash
# Run tests
cd services/[service-name]
npm test

# Check diagnostics
# Use your IDE's built-in diagnostics
```

### 4. Commit Changes

```bash
git add .
git commit -m "Description of changes"
git push
```

---

## 📦 Building for Production

### 1. Build Frontend

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### 2. Build Docker Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api-gateway
```

### 3. Deploy

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check if containers are running
docker-compose ps

# Restart databases
docker-compose restart postgres mongodb redis influxdb

# Check logs
docker-compose logs postgres
```

### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID [PID] /F
```

### Node Modules Issues

```bash
# Clean install
cd services/shared
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## 📚 API Documentation

### Health Check
```bash
GET http://localhost:3000/health
```

### Service Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/triage` | Patient triage and priority scoring |
| `/api/ai` | AI intelligence and analytics |
| `/api/safety` | Safety monitoring and drug interactions |
| `/api/workflow` | Workflow automation |
| `/api/alerts` | Alert management |
| `/api/fhir` | FHIR resource processing |
| `/api/ehr` | EHR system integration |
| `/api/devices` | Medical device data |

---

## 🎯 Quick Commands Reference

```bash
# Start everything
start.bat

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart service
docker-compose restart [service-name]

# Clean everything
docker-compose down -v
rmdir /s /q frontend\node_modules
rmdir /s /q services\shared\node_modules

# Fresh install
npm install
docker-compose up -d
```

---

## 🔐 Security Notes

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Change default passwords** - Update all passwords in `.env`
3. **Use HTTPS in production** - Configure SSL certificates
4. **Enable authentication** - JWT tokens for API access
5. **Regular updates** - Keep dependencies updated

---

## 📞 Support

- **Documentation**: See `README.md` and `.kiro/specs/`
- **Issues**: Check service logs with `docker-compose logs`
- **Tests**: Run `npm test` in each service directory

---

## ✅ Checklist

- [ ] Deleted legacy `backend/` folder
- [ ] Created `.env` file from `.env.example`
- [ ] Updated passwords in `.env`
- [ ] Started databases with `docker-compose up -d`
- [ ] Installed dependencies with `npm install`
- [ ] Started API Gateway
- [ ] Started Frontend
- [ ] Verified health check at `http://localhost:3000/health`
- [ ] Accessed dashboard at `http://localhost:5173`
- [ ] Ran tests with `npm test`

---

**Version**: 1.0  
**Last Updated**: January 25, 2026  
**Status**: ✅ Ready for Development
