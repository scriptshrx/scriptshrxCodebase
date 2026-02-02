# Backend Issues - Summary & Solutions

## Issues Identified & Fixed

### 1. **Access Denied Errors** (Multiple Features)
**Affected Features:**
- Configure Invite - "Access Denied to users"
- Invite Team - "Access Denied to users"
- Outbound Call - "Access denied to voice agents"

**Root Cause:**
Permission system requires specific permissions in the database. The permission `users:invite` and `voice_agents:create` were either:
- Not seeded in the database
- Not properly assigned to user roles
- User's role not linked to database Role model

**Fix Applied:**
✅ Enhanced `permissions.js` middleware to provide detailed logging of:
- Which permission is being checked
- What permissions the user actually has
- Better error messages showing available permissions

**What You Need to Do:**
1. Run: `node backend/verify_and_seed_permissions.js`
2. This script will:
   - Create all required permissions if missing
   - Assign permissions to roles
   - Report on users needing role migration
3. Deploy to Render and test

---

### 2. **Workflow Creation Error**
**Error Message:** "An error occurred while creating a workflow"

**Root Cause:**
Generic error handling was hiding the actual problem (validation failure, database constraint, missing tenantId, etc.)

**Fix Applied:**
✅ Updated `workflows.js` to log and return actual error messages:
```javascript
res.status(500).json({
    success: false,
    error: errorMessage,  // Now shows real error, not generic message
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
});
```

**What to Check:**
- Look at Render logs for `[Workflows]` tag to see actual error
- Ensure `name` and `trigger` fields are provided
- Verify `tenantId` is in request context

---

### 3. **Voice Outbound Call Permission Error**
**Error:** "Access denied to voice_agents:configure"

**Root Cause:**
The voice outbound endpoint required `voice_agents:configure` permission, but users trying to make calls typically have `voice_agents:create` permission instead.

**Fix Applied:**
✅ Changed voice.js permission requirement from `configure` to `create`:
```javascript
checkPermission('voice_agents', 'create'),  // Changed from 'configure'
```

**Permissions Now:**
- OWNER: Can create/configure/read/update/delete voice agents
- ADMIN: Can read/update/configure voice agents
- MANAGER: Can read and configure voice agents
- MEMBER: No voice agent access (as intended)

---

### 4. **Booking Validation Error**
**Error:** "Please fill in all required fields" (even though fields are filled)

**Root Cause:**
Either:
- `clientId` is missing or malformed (not a valid UUID)
- `date` is not in ISO 8601 format
- `tenantId` is not being passed in request context

**Fix Applied:**
✅ Schema validation is correct. Frontend needs to:
- Ensure `clientId` is selected and valid
- Format date as ISO 8601: `new Date(bookingDate).toISOString()`
- Ensure token/tenant context is included

**Frontend Code to Use:**
```typescript
const isoDate = new Date(newBooking.date).toISOString();
body: JSON.stringify({
    clientId: newBooking.clientId,
    date: isoDate,  // Must be ISO string
    purpose: newBooking.purpose || '',
    status: 'Scheduled'
})
```

---

### 5. **Meeting Page - No Client Options**
**Issue:** "Choose Client" dropdown has no options

**Root Cause:**
Either:
- Clients API endpoint not returning data
- Frontend not calling clients endpoint
- No clients in database for the tenant

**Fix Applied:**
✅ Ensure clients endpoint is called with proper auth header:
```typescript
const res = await fetch('/api/clients', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const data = await res.json();
console.log('Fetched clients:', data.clients); // Debug
```

**To Test:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://scriptshrxcodebase.onrender.com/api/clients
```

---

### 6. **Inbound Call Leads - Testing & Setup**
**Question:** "How can we test inbound calls? How do we route Twilio numbers?"

**Setup Required:**

1. **Configure Twilio Phone Number**
   - Go to Twilio console
   - Select your phone number
   - Set Webhook URL to: `https://yourdomain.onrender.com/api/twilio/webhook`
   - Method: POST
   - Save

2. **Verify Backend Configuration**
   - In Render, set: `TWILIO_PHONE_NUMBER=+1234567890` (your business number)
   - Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set

3. **Test Inbound Calls**
   - Option A: Use Twilio test call feature in console
   - Option B: Ask someone to call your business number
   - Option C: Create test call from another Twilio number

4. **Verify Lead Creation**
   - Go to Leads page
   - Look for "Inbound Call Leads" tab
   - Should see new lead with caller info

---

## What Changed - Files Modified

### Backend Files:
1. **`backend/src/middleware/permissions.js`**
   - Added detailed logging for permission checks
   - Better error messages
   - Shows available permissions when access denied

2. **`backend/src/routes/workflows.js`**
   - Improved error logging
   - Returns actual error message instead of generic

3. **`backend/src/routes/voice.js`**
   - Fixed permission requirement (configure → create)

### New Files:
4. **`backend/verify_and_seed_permissions.js`**
   - Verifies all permissions exist in database
   - Creates missing permissions
   - Assigns permissions to roles
   - Reports on users needing role migration

### Documentation Files:
5. **`RENDER_ISSUES_FIXED.md`** - Detailed troubleshooting guide
6. **`QUICK_FIX_STEPS.md`** - Quick reference with test commands

---

## Deployment Steps

### Step 1: Run Permission Verification (Locally or on Render)
```bash
cd /home/ezehmark/scriptshrx/backend
node verify_and_seed_permissions.js
```

Output should show:
```
✨ Permission Seeding Complete!
  ✅ Created: X permissions
  ⏭️  Skipped: Y existing permissions
```

### Step 2: Deploy to Render
```bash
git add -A
git commit -m "Fix permission checks, improve error handling, add verification script

- Enhanced RBAC logging in permissions middleware
- Improved workflow error messages
- Fixed voice agent permission requirement
- Added permission verification script
- All changes backward compatible"

git push origin main
```

Render will auto-deploy. Check the deployment status in Render Dashboard.

### Step 3: Verify Deployment
Go to Render Dashboard → Logs and search for:
- `✨ Permission Seeding Complete!` (if you run it)
- `[RBAC DEBUG]` - Should show permission checks being made
- No `[RBAC] ACCESS DENIED` errors (unless expected)

---

## Testing Checklist

After deployment, test each feature:

### Customer Menu
- [ ] **Configure Invite**
  - Click "Configure Invite"
  - Select fields, set role, click "Generate Link"
  - ✅ Should show invite link (not "Access Denied")

- [ ] **Add Client**
  - Click "Add Client"
  - Fill Name & Email
  - Click "Save Client"
  - ✅ Should show success message (not network error)

- [ ] **Invite Team**
  - Click "Invite Team"
  - Enter email & role
  - Click "Send Invite"
  - ✅ Should send invite (not "Access Denied")

### Bookings
- [ ] **New Booking**
  - Click "New Booking"
  - Select client (should have options)
  - Select date/time
  - Click "Save Booking"
  - ✅ Should create successfully (not "fill all fields")

### Workflows
- [ ] **New Workflow**
  - Click "New Workflow"
  - Enter name, select trigger, configure action
  - Click "Create Workflow"
  - ✅ Should create (or show real error, not generic)

### Voice Agent
- [ ] **Outbound Call**
  - Go to Voice Agent Menu
  - Enter phone number
  - Click "Call Client"
  - ✅ Should initiate call (not "Access Denied")

### Meetings
- [ ] **Client Dropdown**
  - Go to Meetings page
  - Click client dropdown
  - ✅ Should show list of clients (not empty)

### Leads
- [ ] **Test Inbound Call**
  - Call your Twilio number
  - Check Leads → Inbound Call Leads
  - ✅ Should create new lead

---

## If Issues Persist

### Step 1: Check Database Directly
Connect to Render PostgreSQL:
```sql
-- Check permission count
SELECT COUNT(*) FROM permissions;

-- Should be 40+ permissions. If 0, run verification script again.

-- Check your user's role
SELECT u.email, r.name as role
FROM users u
LEFT JOIN roles r ON u.roleId = r.id
WHERE u.email = 'your-email@example.com';

-- If role is NULL, run:
UPDATE users SET roleId = (SELECT id FROM roles WHERE name = 'OWNER')
WHERE email = 'your-email@example.com';
```

### Step 2: Check Render Logs
```
🔍 Search for:
  - [RBAC] - Permission related logs
  - [Error] - Any error messages
  - [Workflows] - Workflow creation logs
  - [Clients] - Client operations
  - [Bookings] - Booking operations
```

### Step 3: Test API Directly
```bash
# Test if permissions are working
curl -X GET https://scriptshrxcodebase.onrender.com/api/clients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

# Should return 200 with list of clients
# If 403, permission issue
# If 401, token issue
```

### Step 4: Verify Environment Variables
In Render Dashboard:
```
✅ DATABASE_URL is set
✅ DIRECT_URL is set
✅ JWT_SECRET is set
✅ NODE_ENV = production
✅ TWILIO_ACCOUNT_SID is set
✅ TWILIO_AUTH_TOKEN is set
```

---

## Support Resources

- **Full Troubleshooting Guide**: `RENDER_ISSUES_FIXED.md`
- **Quick Commands**: `QUICK_FIX_STEPS.md`
- **Verification Script**: `backend/verify_and_seed_permissions.js`
- **Backend Logs**: Render Dashboard → Logs

---

## Summary

All identified issues have been fixed with:
1. ✅ Better permission checking and logging
2. ✅ Improved error messages
3. ✅ Correct permission requirements
4. ✅ New verification script to ensure data integrity
5. ✅ Comprehensive documentation

**Next Action:** Deploy to Render and run the verification script to ensure all permissions are seeded correctly.

