# 📦 MedAssist - Node Modules Installation Guide

## 🚀 Quick Install (Recommended)

### Option 1: Using Batch Script (CMD)

```cmd
# Navigate to project root
cd C:\Users\HP\Desktop\snowfest\snow-fest

# Run installation script
install-dependencies.bat
```

### Option 2: Using PowerShell Script

```powershell
# Navigate to project root
cd C:\Users\HP\Desktop\snowfest\snow-fest

# Run PowerShell script
.\install-dependencies.ps1
```

---

## 📋 What Gets Installed

The script will install node_modules for:

1. ✅ **Frontend** - React dashboard
2. ✅ **Shared Utilities** - Common libraries
3. ✅ **API Gateway** - Main API service
4. ✅ **Triage Engine** - Patient triage
5. ✅ **AI Intelligence** - AI processing
6. ✅ **Safety Engine** - Safety monitoring
7. ✅ **Workflow Engine** - Task automation
8. ✅ **Alert Service** - Notifications
9. ✅ **FHIR Integration** - FHIR processing
10. ✅ **EHR Connector** - EHR integration
11. ✅ **Device Integration** - Device data
12. ✅ **Compliance Service** - HIPAA compliance
13. ✅ **Cache Service** - Redis caching
14. ✅ **Scaling Service** - Auto-scaling

---

## 🔧 Manual Installation (If Scripts Fail)

If the automated scripts don't work, install manually:

### Step 1: Install Frontend

```cmd
cd frontend
npm install
cd ..
```

### Step 2: Install Shared Utilities

```cmd
cd services\shared
npm install
cd ..\..
```

### Step 3: Install Core Services

```cmd
# API Gateway
cd services\api-gateway
npm install
cd ..\..

# Triage Engine
cd services\triage-engine
npm install
cd ..\..

# AI Intelligence
cd services\ai-intelligence
npm install
cd ..\..

# Safety Engine
cd services\safety-engine
npm install
cd ..\..
```

### Step 4: Install Other Services

```cmd
# Workflow Engine
cd services\workflow-engine
npm install
cd ..\..

# Alert Service
cd services\alert-service
npm install
cd ..\..

# FHIR Integration
cd services\fhir-integration
npm install
cd ..\..

# EHR Connector
cd services\ehr-connector
npm install
cd ..\..

# Device Integration
cd services\device-integration
npm install
cd ..\..

# Compliance Service
cd services\compliance-service
npm install
cd ..\..

# Cache Service
cd services\cache-service
npm install
cd ..\..

# Scaling Service
cd services\scaling-service
npm install
cd ..\..
```

---

## ⏱️ Installation Time

- **Fast Internet**: ~5-10 minutes
- **Slow Internet**: ~15-30 minutes
- **Total Size**: ~500MB-1GB

---

## 🔍 Verify Installation

After installation, check if node_modules exist:

```cmd
# Check frontend
dir frontend\node_modules

# Check shared
dir services\shared\node_modules

# Check API Gateway
dir services\api-gateway\node_modules
```

---

## 🐛 Troubleshooting

### Issue: "npm is not recognized"

**Solution**: Install Node.js

1. Download from: https://nodejs.org/
2. Install LTS version (18.x or higher)
3. Restart terminal
4. Verify: `npm --version`

### Issue: "Permission denied"

**Solution**: Run as Administrator

1. Right-click PowerShell/CMD
2. Select "Run as Administrator"
3. Navigate to project
4. Run installation script

### Issue: "Network error" or "ECONNRESET"

**Solution**: Clear npm cache

```cmd
npm cache clean --force
npm config set registry https://registry.npmjs.org/
```

Then retry installation.

### Issue: Installation hangs or freezes

**Solution**: Kill npm processes

```cmd
# Kill all node processes
taskkill /F /IM node.exe

# Clear cache
npm cache clean --force

# Retry installation
```

### Issue: "ENOENT: no such file or directory"

**Solution**: Ensure you're in the correct directory

```cmd
# Check current directory
cd

# Should be: C:\Users\HP\Desktop\snowfest\snow-fest

# If not, navigate there
cd C:\Users\HP\Desktop\snowfest\snow-fest
```

### Issue: Some services fail to install

**Solution**: Install them individually

```cmd
# Navigate to the failing service
cd services\[service-name]

# Remove package-lock.json
del package-lock.json

# Retry installation
npm install

# Go back to root
cd ..\..
```

---

## 🔄 Reinstall Everything (Clean Install)

If you want to completely reinstall:

```cmd
# 1. Remove all node_modules
cleanup.bat
# (Select Y when asked about node_modules)

# 2. Reinstall everything
install-dependencies.bat
```

---

## 📊 Installation Progress

The script will show progress like this:

```
[1/14] Installing Frontend...
[OK] Frontend dependencies installed

[2/14] Installing Shared Utilities...
[OK] Shared dependencies installed

[3/14] Installing API Gateway...
[OK] API Gateway dependencies installed

...

[14/14] Installing Scaling Service...
[OK] Scaling Service dependencies installed

========================================
 Installation Complete!
========================================
```

---

## ✅ Post-Installation Checklist

After installation completes:

- [ ] All services show `[OK]` status
- [ ] No `[ERROR]` messages
- [ ] `node_modules` folders exist in each service
- [ ] Run `npm test` in a service to verify
- [ ] Run `start.bat` to test the project

---

## 🎯 Quick Commands

```cmd
# Install all dependencies
install-dependencies.bat

# Install specific service
cd services\safety-engine
npm install

# Check npm version
npm --version

# Check Node version
node --version

# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest
```

---

## 📞 Need Help?

If installation fails:

1. Check Node.js is installed: `node --version`
2. Check npm is installed: `npm --version`
3. Try manual installation (see above)
4. Clear npm cache: `npm cache clean --force`
5. Run as Administrator
6. Check internet connection

---

## 🔐 Required Software

Before installing dependencies:

- ✅ **Node.js** 18.x or higher
- ✅ **npm** 9.x or higher
- ✅ **Internet connection**
- ✅ **~1GB free disk space**

---

## 📝 Installation Log

The script will create logs showing:
- Which services were installed
- Any errors encountered
- Total installation time

---

**Version**: 1.0  
**Last Updated**: January 25, 2026  
**Status**: ✅ Ready to Use
