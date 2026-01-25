# 🚀 MedAssist Quick Reference Card

## ⚡ Quick Start (4 Commands)

```bash
cleanup.bat                # 1. Clean project (first time only)
install-dependencies.bat   # 2. Install all node modules
copy .env.example .env     # 3. Create environment file
start.bat                  # 4. Start everything
```

**Access**: http://localhost:5173

---

## 🎯 Essential Commands

| Command | Purpose |
|---------|---------|
| `start.bat` | Start all services |
| `stop.bat` | Stop all services |
| `cleanup.bat` | Remove unnecessary files |
| `docker-compose logs -f` | View all logs |
| `docker-compose ps` | Check service status |

---

## 🔌 Service URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API Gateway** | http://localhost:3000 |
| **Health Check** | http://localhost:3000/health |
| **InfluxDB UI** | http://localhost:8086 |

---

## 📊 Database Ports

| Database | Port |
|----------|------|
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Redis | 6379 |
| InfluxDB | 8086 |

---

## 🧪 Testing Commands

```bash
# Test specific service
cd services/safety-engine
npm test

# Test with coverage
npm test -- --coverage

# Test specific file
npm test -- drug-interaction-service.test.js
```

---

## 🛠️ Development Workflow

```bash
# 1. Start databases
docker-compose up -d postgres mongodb redis influxdb

# 2. Start API Gateway (Terminal 1)
cd services/api-gateway
npm run dev

# 3. Start Frontend (Terminal 2)
cd frontend
npm run dev

# 4. Make changes (hot reload enabled)

# 5. Run tests
cd services/[service-name]
npm test
```

---

## 🔧 Troubleshooting

### Database Issues
```bash
docker-compose restart postgres mongodb redis influxdb
docker-compose logs postgres
```

### Port Conflicts
```bash
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

### Node Modules
```bash
cd services/shared
rmdir /s /q node_modules
npm install
```

### Docker Issues
```bash
docker-compose down
docker-compose up -d
```

---

## 📁 Project Structure

```
medassist/
├── frontend/           # React Dashboard
├── services/           # Microservices
│   ├── api-gateway/   # Main API
│   ├── triage-engine/ # Patient triage
│   ├── ai-intelligence/ # AI processing
│   ├── safety-engine/ # Safety checks
│   └── shared/        # Utilities
├── database/          # DB init scripts
├── docker-compose.yml # Containers
├── start.bat          # Start script
└── PROJECT_SETUP.md   # Full docs
```

---

## 🔐 Environment Variables

Edit `.env` file:

```env
# Database
POSTGRES_PASSWORD=your_password
MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URL=redis://localhost:6379

# API
API_GATEWAY_PORT=3000
JWT_SECRET=your_secret_key

# Security
ENCRYPTION_KEY=your_encryption_key
```

---

## 📚 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/triage` | Patient triage |
| `/api/ai` | AI analytics |
| `/api/safety` | Drug interactions |
| `/api/workflow` | Task automation |
| `/api/alerts` | Notifications |
| `/api/fhir` | FHIR resources |
| `/api/ehr` | EHR integration |
| `/api/devices` | Device data |

---

## 🚨 Important Notes

1. **Clinical Disclaimer**: For physician review only
2. **Security**: Never commit `.env` file
3. **Passwords**: Change defaults in `.env`
4. **Docker**: Must be running for databases
5. **Node**: Version 18+ required

---

## 📞 Help

- **Full Setup**: See `PROJECT_SETUP.md`
- **Specs**: See `.kiro/specs/`
- **Logs**: `docker-compose logs [service]`
- **Tests**: `npm test` in service folder

---

## ✅ First-Time Setup Checklist

- [ ] Run `cleanup.bat`
- [ ] Copy `.env.example` to `.env`
- [ ] Edit `.env` with passwords
- [ ] Run `start.bat`
- [ ] Access http://localhost:5173
- [ ] Check http://localhost:3000/health
- [ ] Run tests: `cd services/safety-engine && npm test`

---

**Version**: 1.0  
**Updated**: January 25, 2026
