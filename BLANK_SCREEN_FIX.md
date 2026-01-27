# 🔍 Blank Screen Troubleshooting Guide

## 🔴 Common Cause: Gemini API Key Not Set

The **most common reason for a blank screen** is that the `GEMINI_API_KEY` is not configured.

### ✅ Fix: Add Your Gemini API Key

**Step 1**: Get a free API key
- Go to: https://makersuite.google.com/app/apikey
- Click "Create API Key"
- Copy the generated key

**Step 2**: Add to `.env` file
```
Edit: f:\snowfest\medical-assistant\.env

Change this:
GEMINI_API_KEY=your-gemini-api-key-here

To this:
GEMINI_API_KEY=AIza...your-actual-key...
```

**Step 3**: Restart services
```
1. Close existing terminal windows
2. Delete or stop running services
3. Run: start-simple.bat
4. Wait 10 seconds for startup
5. Open: http://localhost:5173
```

---

## 🔧 If Still Blank Screen

### Check 1: Is Backend Running?
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "MedAssist Backend",
  "version": "2.0.0"
}
```

If this fails → backend is not running

### Check 2: Browser Console (F12)
1. Press `F12` to open Developer Tools
2. Click "Console" tab
3. Look for red error messages
4. Common errors:
   - "Failed to connect to localhost:8000" → backend not running
   - "401 Unauthorized" → bad Gemini API key
   - "CORS error" → server configuration issue

### Check 3: Manual Backend Test
```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If you see errors in the output → that's the problem to fix

---

## 🆘 Common Issues & Solutions

### Issue 1: "Cannot connect to localhost:8000"
**Cause**: Backend not running  
**Fix**:
```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Issue 2: "GEMINI_API_KEY not found"
**Cause**: API key not in .env or not set  
**Fix**: Edit `.env` and add real API key

### Issue 3: Port already in use
**Cause**: Another process using port 5173 or 8000  
**Fix**: 
```bash
# Find and kill process
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Issue 4: React compilation error
**Cause**: Frontend dependency issue  
**Fix**:
```bash
cd frontend
rm -r node_modules
npm install
npm run dev
```

### Issue 5: Backend starts but no response
**Cause**: Gemini API key invalid or network issue  
**Fix**: 
1. Verify API key is valid at makersuite.google.com
2. Check internet connection
3. Try refreshing page

---

## ✅ Complete Fresh Start

If all else fails, do a complete restart:

### Step 1: Kill all processes
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Kill all Python processes  
taskkill /F /IM python.exe
```

### Step 2: Reset frontend
```bash
cd frontend
rm -r node_modules
npm install
```

### Step 3: Add/verify API key
```
Edit .env:
GEMINI_API_KEY=your-real-key-here
```

### Step 4: Restart both services

**Terminal 1 (Backend)**:
```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 (Frontend)**:
```bash
cd frontend
npm run dev
```

### Step 5: Access system
```
http://localhost:5173
```

---

## 🧪 Verification Checklist

Before opening frontend, verify:

- [ ] .env file exists
- [ ] GEMINI_API_KEY is set (not placeholder)
- [ ] Backend running on port 8000
- [ ] `curl http://localhost:8000/health` returns 200
- [ ] npm installed (`npm --version`)
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Port 5173 is free

---

## 📊 Debug with Console Logs

Add this to browser console (F12) to test:

```javascript
// Test backend connection
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('Backend OK:', d))
  .catch(e => console.log('Backend ERROR:', e.message))

// Test fetch patients
fetch('http://localhost:8000/patients')
  .then(r => r.json())
  .then(d => console.log('Patients:', d))
  .catch(e => console.log('Patients ERROR:', e.message))
```

---

## 📞 Still Need Help?

1. Check `STATUS.md` for quick reference
2. Read `GETTING_STARTED.md` for setup guide
3. Check `docs/ARCHITECTURE_DATASET_FREE.md` for system overview
4. Look at backend logs for error messages

---

**Most likely fix: Set GEMINI_API_KEY in `.env` and restart services!**
