# Insights Page Debugging Guide

## Issue: "Failed to load insights. Please refresh the page."

### Step 1: Check if Backend is Running
```bash
curl http://localhost:8000/api/insights/health
# Should return: {"status":"ok","timestamp":"2026-01-16T..."}
```

If this fails, the backend server is not running on port 8000.

### Step 2: Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages with details from the API response
4. Check Network tab to see if `/api/insights` request is being made

### Step 3: Verify Token
Check if you have a valid JWT token:
```bash
# In browser console:
localStorage.getItem('token')
# Should show a long token string starting with eyJ...
```

### Step 4: Test API Directly
Get your token from localStorage and test:
```bash
# Replace YOUR_TOKEN with the actual token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/insights

# Should return JSON with metrics, revenueChart, behaviorChart, etc.
```

### Step 5: Check Backend Logs
Look at the backend console/logs for:
```
Error fetching dashboard insights: [error details]
```

This will show the exact error from the database or Prisma.

### Step 6: Verify Database Connection
```bash
# From backend directory:
npm run prisma studio
# Or check if DATABASE_URL/.env is properly configured
```

### Step 7: Check if Required Data Exists
The insights page needs:
- At least one tenant (from logged-in user)
- CallSession records (optional, can be 0)
- Client records (optional, can be 0)
- Booking records (optional, can be 0)
- Transaction records (optional, can be 0)

Even with no data, the page should load and show empty charts.

### Step 8: Common Issues & Solutions

**Issue: 401 Unauthorized**
- Token is expired or invalid
- Solution: Log out and log back in

**Issue: 500 Internal Server Error**
- Backend database query failed
- Check backend logs for specific error
- Verify Prisma schema matches database

**Issue: CORS Error**
- Frontend and backend on different ports
- Check that CORS is enabled in backend

**Issue: Long Loading Time**
- The revenue chart generates 12 months of data
- If you have many transactions, it takes longer
- Check backend performance

### Step 9: Enable Detailed Logging
Edit `/frontend/src/app/dashboard/insights/page.tsx` and look for console.log statements.
The frontend now logs:
- "Insights data received: {data}" - shows what API returned
- "Registration data received: {data}" - shows user registration data
- API error status and messages

### Frontend Components Being Loaded
The page needs these to work properly:
- ✅ LineChart, Line (for registration chart)
- ✅ BarChart, Bar (for behavior chart)
- ✅ AreaChart, Area (for revenue chart)
- ✅ XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer (from recharts)
- ✅ Icons from lucide-react

All are already imported.

### Quick Restart
1. Backend: `npm run dev` (or your start command)
2. Frontend: `npm run dev`
3. Clear browser cache (Cmd+Shift+Delete)
4. Hard refresh the insights page (Cmd+Shift+R)

If none of these help, please share:
1. Browser console error messages
2. Backend logs showing the actual error
3. Output of: `curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/insights`
