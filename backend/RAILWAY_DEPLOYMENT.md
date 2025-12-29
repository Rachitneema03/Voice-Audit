# Railway Deployment Guide

## Quick Fix for Port Issues

If your backend is not connecting on Railway, follow these steps:

### Step 1: Verify Railway Service Settings

1. Go to Railway Dashboard → Your Service → Settings
2. Check the following:

   **Root Directory:**
   - Should be: `backend`
   - NOT: `.` or empty

   **Build Command:**
   - Should be: `npm install && npm run build`
   - Or leave empty (Railway will auto-detect)

   **Start Command:**
   - Should be: `npm start`
   - This runs: `node dist/index.js`

### Step 2: Verify Environment Variables

Railway automatically sets `PORT`. **DO NOT** manually set `PORT` in Railway variables.

Required variables (set these in Railway):
- `NODE_ENV=production`
- `GEMINI_API_KEY=your_key`
- `GOOGLE_CLIENT_ID=your_client_id`
- `GOOGLE_CLIENT_SECRET=your_client_secret`
- `GOOGLE_REDIRECT_URI=https://your-app.up.railway.app/api/auth/google/callback`
- `FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}` (full JSON as string)

### Step 3: Check Railway Logs

1. Railway Dashboard → Your Service → Deployments
2. Click latest deployment → View Logs
3. Look for:
   ```
   ✅ Backend server started successfully!
   🌐 Server running on: 0.0.0.0:XXXX
   📡 PORT from environment: XXXX
   ```

### Step 4: Verify Service is Running

1. Check the health endpoint:
   ```
   https://your-app.up.railway.app/health
   ```
   Should return: `{"status":"ok","message":"Backend is running"}`

2. Check OAuth diagnostics:
   ```
   https://your-app.up.railway.app/api/diagnostics/oauth
   ```

## Common Issues

### Issue: "Port 5000 not accessible"

**Solution:**
- Railway sets PORT automatically (usually not 5000)
- The app uses `process.env.PORT` which Railway provides
- Check Railway logs to see what port is actually being used
- The app binds to `0.0.0.0` which allows Railway's load balancer to connect

### Issue: "Service keeps restarting"

**Possible causes:**
1. Build failing - Check build logs
2. Missing environment variables - Check startup logs
3. Port binding issue - Already fixed (binds to 0.0.0.0)

**Solution:**
- Check Railway logs for error messages
- Ensure all required environment variables are set
- Verify `npm start` command works (runs `node dist/index.js`)

### Issue: "Cannot connect to backend"

**Check:**
1. Service is deployed and running (green status in Railway)
2. Health endpoint responds: `/health`
3. Frontend `VITE_API_BASE_URL` points to correct Railway URL
4. No CORS errors in browser console

## Railway Configuration

The `railway.json` file in the backend directory configures:
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Restart policy: Restart on failure

Railway should auto-detect this, but you can also set it manually in the dashboard.

## Testing Locally

To test that the build works:

```bash
cd backend
npm install
npm run build
npm start
```

Should output:
```
✅ Backend server started successfully!
🌐 Server running on: 0.0.0.0:5000
```

## Need Help?

1. Check Railway logs for detailed error messages
2. Verify all environment variables are set
3. Test health endpoint: `/health`
4. Check diagnostic endpoint: `/api/diagnostics/oauth`

