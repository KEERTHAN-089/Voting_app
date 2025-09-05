# Connection Troubleshooting Guide

If you're experiencing connection issues between the frontend and backend, follow these steps to diagnose and fix the problem.

## Quick Solutions

1. **Ensure Backend is Running**
   ```
   cd backend
   npm run diagnose
   ```

2. **Check Frontend Configuration**
   Make sure your frontend's `.env` file has the correct backend URL:
   ```
   REACT_APP_API_URL=http://localhost:3000
   ```

3. **Bypass Proxy Issues**
   - Try using IP address instead of localhost: `http://127.0.0.1:3000`
   - Clear browser cache and cookies
   - Try an Incognito/Private browser window

## Common Issues and Solutions

### Backend server not running

**Symptoms:**
- "Connection refused" errors
- "Failed to fetch" errors
- Timeout errors

**Solutions:**
1. Navigate to the backend directory: `cd backend`
2. Start the server: `npm start` or `npm run diagnose`
3. Check the console for any error messages

### Port conflict

**Symptoms:**
- "Address already in use" error when starting the server
- Server starts but requests fail

**Solutions:**
1. Find and stop the process using the port:
   - Windows: `netstat -ano | findstr :3000`
   - Mac/Linux: `lsof -i :3000`
2. Change the backend port in `.env`: `PORT=5000`
3. Update frontend config to match the new port

### Firewall blocking connection

**Symptoms:**
- Connection timeouts
- Works on some networks but not others

**Solutions:**
1. Check firewall settings
2. Add exceptions for Node.js and your application
3. Try temporarily disabling the firewall to test

### CORS issues

**Symptoms:**
- CORS policy errors in browser console
- API calls work in Postman but not in browser

**Solutions:**
1. Ensure the backend's CORS configuration includes your frontend origin
2. Try using a CORS browser extension (temporary testing only)
3. Make sure the request includes the proper headers

### VS Code proxy issues

**Symptoms:**
- Works in browser but not in VS Code
- "Proxy configuration" errors

**Solutions:**
1. Check VS Code settings: `Settings > Http: Proxy`
2. Add localhost to the proxy exclusions
3. Use the VS Code REST Client extension for API testing

## Need More Help?

If you're still experiencing issues after trying these solutions, try the connection diagnostics:

```javascript
// In browser console
import api from './utils/api';
api.diagnoseConnection().then(result => console.log(result));
```

This will test multiple possible backend URLs and provide detailed diagnostic information.
