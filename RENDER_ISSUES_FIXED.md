# Render Backend Issues - Troubleshooting & Fixes

## Overview
Your backend is running on Render and experiencing several permission and validation errors. This guide addresses each issue with solutions.

---

## Issue #1: "Access Denied" Errors (Configure Invite, Invite Team, Outbound Call)

### Root Cause
The permission system in your backend requires specific permissions in the database, but they may not be seeded properly or the role assignments may be incomplete.

### Symptoms
- `Access Denied to users` when trying to send invites
- `Access denied to voice agents` when making outbound calls

### Solution

#### Step 1: Verify Permissions in Database
Run the permission verification script:

```bash
cd /home/ezehmark/scriptshrx/backend
node verify_and_seed_permissions.js
```

This script will:
- Check if all required permissions exist in the database
- Create missing permissions
- Link permissions to roles
- Report on users that need role migration

#### Step 2: Deploy Changes to Render
After running the verification script locally (or on Render directly via SSH):

```bash
# Push the updated verification script to Render
git add verify_and_seed_permissions.js
git commit -m "Add permission verification and seeding script"
git push origin main
```

#### Step 3: Verify User Roles
Make sure your test user has the correct role assigned. Check:

```sql
-- In your Render database, run:
SELECT u.id, u.email, u.role, u.roleId, r.name 
FROM users u 
LEFT JOIN roles r ON u.roleId = r.id 
WHERE u.email = 'your-email@example.com';
```

If `roleId` is NULL, the user needs to be assigned to a DB Role:

```sql
-- For OWNER role:
UPDATE users 
SET roleId = (SELECT id FROM roles WHERE name = 'OWNER') 
WHERE email = 'your-email@example.com';
```

---

## Issue #2: "Add Client" Network Error

### Root Cause
The request is likely succeeding but the frontend is not handling the response correctly, or there's a network timeout.

### Solution

#### Check Backend Logs
1. Go to Render Dashboard → Your Service → Logs
2. Search for "Error adding client" or "Clients API"
3. Look for specific error messages

#### Frontend Fix
Ensure proper error handling in `frontend/src/app/dashboard/clients/page.tsx`:

```typescript
const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) {
        return showToast('Name and Email are required.', 'error');
    }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newClient)
        });

        if (res.ok) {
            setShowAddModal(false);
            setNewClient({ name: '', email: '', phone: '', notes: '' });
            fetchClients();
            showToast('Client added successfully!', 'success');
        } else {
            const data = await res.json();
            console.error('Add client error:', data); // Log full error
            showToast(data.error || 'Failed to add client.', 'error');
        }
    } catch (error) {
        console.error('Error adding client:', error);
        showToast(`Network error: ${error.message}`, 'error');
    }
};
```

---

## Issue #3: Booking - "Please fill in all required fields" Error

### Root Cause
The backend validation schema requires `clientId` and `date`, but one or both might be missing or malformed.

### Solution

#### Frontend: Ensure All Required Fields
Update `frontend/src/app/dashboard/bookings/page.tsx`:

```typescript
const handleCreateBooking = async () => {
    // Validate all required fields
    if (!newBooking.clientId) {
        return showToast('Please select a client', 'error');
    }
    if (!newBooking.date) {
        return showToast('Please select a date', 'error');
    }

    // Ensure date is ISO 8601 formatted
    const bookingDate = new Date(newBooking.date);
    const isoDate = bookingDate.toISOString();

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                clientId: newBooking.clientId,
                date: isoDate, // Send as ISO string
                purpose: newBooking.purpose || '',
                status: 'Scheduled'
            })
        });

        const data = await res.json();
        if (res.ok) {
            showToast('Booking created successfully!', 'success');
            fetchBookings();
        } else {
            console.error('Booking error:', data);
            showToast(data.error || 'Failed to create booking', 'error');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        showToast(`Network error: ${error.message}`, 'error');
    }
};
```

#### Backend: Improve Validation Feedback
The backend now logs full error details. Check Render logs for specific validation failures.

---

## Issue #4: Meeting Page - No Client Options & Missing Meeting Notes

### Root Cause
The clients endpoint (`/api/clients`) may not be returning data or is not being called correctly.

### Solution

#### Step 1: Verify Endpoint
Test the endpoint directly:

```bash
curl -X GET "https://scriptshrxcodebase.onrender.com/api/clients" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return:
```json
{
  "success": true,
  "clients": [...]
}
```

#### Step 2: Frontend Fix
Update the meetings page to properly fetch and display clients:

```typescript
useEffect(() => {
    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/clients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                console.log('Fetched clients:', data.clients);
                setAvailableClients(data.clients || []);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };
    
    fetchClients();
}, []);
```

#### Step 3: Add Meeting Notes Types
Update the meeting notes dropdown options:

```typescript
const MEETING_TYPES = [
    'Weekly Huddle',
    'Mass Email Meeting',
    'Client Meeting',
    'Strategy Session',
    'Review Meeting',
    'Planning Meeting'
];
```

---

## Issue #5: Workflow Creation Error

### Root Cause
The validation or database constraints are failing silently. We've now added better error logging.

### Solution

#### Step 1: Check Backend Logs
Go to Render logs and search for `[Workflows]` to see detailed error messages.

#### Step 2: Ensure Required Fields
Frontend should validate before sending:

```typescript
const handleCreateWorkflow = async () => {
    if (!newWorkflow.name || !newWorkflow.name.trim()) {
        showToast('Workflow name is required', 'error');
        return;
    }
    
    if (!newWorkflow.trigger) {
        showToast('Trigger event is required', 'error');
        return;
    }

    // Ensure actions array is valid
    const actions = newWorkflow.actions || [];
    if (actions.length === 0) {
        showToast('At least one action is required', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/workflows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: newWorkflow.name.trim(),
                trigger: newWorkflow.trigger,
                actions: actions
            })
        });

        const data = await res.json();
        if (res.ok) {
            showToast('Workflow created successfully!', 'success');
        } else {
            console.error('Workflow error:', data);
            showToast(data.error || 'Failed to create workflow', 'error');
        }
    } catch (error) {
        console.error('Error creating workflow:', error);
        showToast(`Network error: ${error.message}`, 'error');
    }
};
```

---

## Issue #6: Inbound Calls - Testing & Setup

### How Inbound Calls Work

1. **Configure Twilio Phone Number**
   - In Render, set environment variable: `TWILIO_PHONE_NUMBER` to your business number
   - Configure Twilio webhook to point to: `https://yourdomain.onrender.com/api/twilio/webhook`

2. **Incoming Call Flow**
   ```
   Customer calls your Twilio number
   → Twilio sends webhook to your backend
   → Backend triggers voice agent/IVR
   → Call is recorded and transcribed
   → Lead is created in "Inbound Call Leads"
   ```

3. **Testing Inbound Calls**
   - Use a test phone number via Twilio console
   - Or ask your business contact to call your configured Twilio number
   - Check `/api/leads?type=inbound_call` to see captured leads

### Implementation Checklist

```
☐ Twilio account with active phone number
☐ TWILIO_ACCOUNT_SID in Render .env
☐ TWILIO_AUTH_TOKEN in Render .env
☐ TWILIO_PHONE_NUMBER in Render .env
☐ Webhook URL configured in Twilio
☐ Voicemail/IVR script configured
☐ Test call from Twilio console
☐ Verify lead appears in Leads page
```

---

## Issue #7: Voice Outbound Calls - Access Denied

### Root Cause
The permission requirement was `voice_agents:configure` but should be `voice_agents:create` for initiating calls.

### Solution
This has been fixed in the updated `voice.js`. The endpoint now requires the correct permission that's typically available for ADMIN and above roles.

**Make sure your role has the permission:**
```sql
SELECT r.name, p.resource, p.action
FROM roles r
JOIN role_permissions rp ON r.id = rp.roleId
JOIN permissions p ON rp.permissionId = p.id
WHERE r.name = 'YOUR_ROLE' AND p.resource = 'voice_agents';
```

---

## Deployment Checklist

After making these fixes:

```bash
# 1. Run permission verification locally (or on Render)
node verify_and_seed_permissions.js

# 2. Commit all changes
git add .
git commit -m "Fix permission checks, improve error handling, add verification script"

# 3. Push to Render
git push origin main

# 4. Render will auto-deploy

# 5. Check logs
# Render Dashboard → Your Service → Logs → Search for [RBAC] or [Workflows]

# 6. Test each feature
# - Configure Invite (should work now)
# - Add Client (should return proper errors)
# - Create Booking (should validate correctly)
# - Create Workflow (should show real error messages)
# - Make Outbound Call (should work if role has permission)
```

---

## Quick Debug Command for Render

SSH into your Render service:
```bash
# Get service ID from Render dashboard
render exec YOUR_SERVICE_ID -c "node verify_and_seed_permissions.js"
```

Or run via Render shell and execute:
```bash
cd backend
node verify_and_seed_permissions.js
```

---

## Key Files Modified

1. **`backend/src/middleware/permissions.js`**
   - Added detailed logging for permission checks
   - Better error messages showing available permissions

2. **`backend/src/routes/workflows.js`**
   - Improved error handling with actual error messages

3. **`backend/src/routes/voice.js`**
   - Fixed permission requirement from `configure` to `create`

4. **`backend/verify_and_seed_permissions.js`** (NEW)
   - Verifies all permissions exist
   - Seeds missing permissions
   - Reports on role assignments

---

## Additional Support

If issues persist after following these steps:

1. **Check Render Logs**: Look for `[RBAC]`, `[Workflows]`, `[Error]` tags
2. **Verify Database**: Connect to Render PostgreSQL and check:
   - `SELECT * FROM permissions;` (should have 50+ records)
   - `SELECT * FROM roles;` (should have 5+ records)
   - `SELECT * FROM role_permissions;` (should have 100+ mappings)
3. **Test with Postman**: Use the provided `ScriptishRx_API_Collection.postman_collection.json`
4. **Review Environment Variables**: Ensure all required .env vars are set in Render

---

## Success Indicators

✅ When everything is working:
- Configure Invite generates link without errors
- Add Client creates and returns success
- Bookings validate fields properly and create successfully
- Workflows show real error messages (not generic)
- Voice outbound calls work for authorized users
- Meeting page shows client dropdown options
- Inbound calls create leads when customers call

