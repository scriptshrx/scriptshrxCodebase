# Quick Fix Steps for Render Deployment

## TL;DR - Quick Fixes

### 1. Fix Permission Issues (Access Denied errors)
```bash
# Run on your local machine or via Render shell:
cd /home/ezehmark/scriptshrx/backend
node verify_and_seed_permissions.js
```

### 2. Deploy to Render
```bash
git add .
git commit -m "Fix backend permission checks and error handling"
git push origin main
# Render will auto-deploy
```

### 3. Check Render Logs
Go to Render Dashboard → Your Service → Logs and look for:
- `[RBAC]` - Permission checks
- `[Error]` - Any errors
- `[Workflows]` - Workflow creation details

---

## Test Each Feature

### Test 1: Check Permissions in Database
```sql
-- Connect to Render PostgreSQL database and run:
SELECT r.name as role, COUNT(p.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.roleId
LEFT JOIN permissions p ON rp.permissionId = p.id
GROUP BY r.name
ORDER BY r.name;
```

Expected output:
```
SUPER_ADMIN: 25+ permissions
OWNER: 40+ permissions
ADMIN: 35+ permissions
MANAGER: 20+ permissions
MEMBER: 10+ permissions
SUBSCRIBER: 30+ permissions
```

### Test 2: Verify Your User's Role
```sql
SELECT u.id, u.email, u.role, r.name as db_role
FROM users u
LEFT JOIN roles r ON u.roleId = r.id
WHERE u.email = 'your-email@example.com';
```

If `db_role` is NULL, assign the role:
```sql
UPDATE users 
SET roleId = (SELECT id FROM roles WHERE name = 'OWNER')
WHERE email = 'your-email@example.com';
```

### Test 3: Verify Specific Permissions
```sql
-- Check if 'users:invite' permission exists and is assigned to OWNER
SELECT p.resource, p.action, r.name
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permissionId
JOIN roles r ON rp.roleId = r.id
WHERE p.resource = 'users' AND p.action = 'invite'
ORDER BY r.name;
```

Expected: Should show multiple roles (OWNER, ADMIN, SUPER_ADMIN)

### Test 4: Check Voice Agent Permissions
```sql
-- Verify voice_agents permissions are correct
SELECT p.resource, p.action, r.name
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permissionId
JOIN roles r ON rp.roleId = r.id
WHERE p.resource = 'voice_agents'
ORDER BY r.name, p.action;
```

Expected: Should see `voice_agents:create`, `voice_agents:read`, `voice_agents:configure` for relevant roles

---

## Test API Endpoints

### Test Configure Invite (Should Pass)
```bash
curl -X POST https://scriptshrxcodebase.onrender.com/api/organization/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "test-invite@example.com",
    "role": "MEMBER",
    "metadata": {}
  }'
```

Expected Response:
```json
{
  "success": true,
  "invite": {
    "id": "...",
    "email": "test-invite@example.com",
    "inviteLink": "https://..."
  }
}
```

### Test Add Client (Should Pass)
```bash
curl -X POST https://scriptshrxcodebase.onrender.com/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Client",
    "email": "client@example.com",
    "phone": "+1234567890",
    "notes": "Test"
  }'
```

Expected Response:
```json
{
  "success": true,
  "client": {
    "id": "...",
    "name": "Test Client",
    "email": "client@example.com"
  },
  "message": "Client created successfully"
}
```

### Test Create Booking
```bash
curl -X POST https://scriptshrxcodebase.onrender.com/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "clientId": "CLIENT_ID_HERE",
    "date": "2026-02-15T10:00:00Z",
    "purpose": "Consultation"
  }'
```

### Test Create Workflow
```bash
curl -X POST https://scriptshrxcodebase.onrender.com/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Workflow",
    "trigger": "booking:created",
    "actions": [
      {
        "type": "send_email",
        "to": "{{client.email}}",
        "subject": "Booking Confirmed",
        "body": "Your booking has been confirmed"
      }
    ]
  }'
```

### Test Outbound Call (Voice Agent)
```bash
curl -X POST https://scriptshrxcodebase.onrender.com/api/voice/outbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "+1234567890",
    "context": {
      "name": "Client Name",
      "id": "client-id"
    }
  }'
```

---

## Troubleshooting Commands

### Check if Permissions Table is Empty
```sql
SELECT COUNT(*) as permission_count FROM permissions;
```

If 0, run the verification script to seed them.

### List All Permissions
```sql
SELECT resource, action, COUNT(*) as role_count
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permissionId
GROUP BY resource, action
ORDER BY resource, action;
```

### Find Missing Permissions for a Role
```sql
-- Example: Find all permissions assigned to OWNER role
SELECT p.resource, p.action
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.roleId
LEFT JOIN permissions p ON rp.permissionId = p.id
WHERE r.name = 'OWNER'
ORDER BY p.resource, p.action;
```

### Check User's Actual Permissions
```sql
SELECT DISTINCT p.resource, p.action
FROM users u
JOIN roles r ON u.roleId = r.id
JOIN role_permissions rp ON r.id = rp.roleId
JOIN permissions p ON rp.permissionId = p.id
WHERE u.id = 'USER_ID_HERE'
ORDER BY p.resource, p.action;
```

---

## Render Environment Variables Checklist

Verify these are set in Render Dashboard → Environment:

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=your-secret-key
NODE_ENV=production
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
ZEPTOMAIL_KEY=your-zeptomail-api-key
SENDGRID_API_KEY=your-sendgrid-key (optional)
CLOUDINARY_API_KEY=your-cloudinary-key (optional)
```

---

## After Fixes - What to Test

✅ **Customer Menu**
- [ ] Configure Invite - generates link without Access Denied
- [ ] Add Client - creates client and shows success message
- [ ] Invite Team - sends invite email without Access Denied

✅ **Bookings**
- [ ] New Booking - creates with all fields filled
- [ ] Shows proper validation error if fields missing
- [ ] Client dropdown populates from API

✅ **Workflows**
- [ ] New Workflow - creates successfully
- [ ] Shows actual error message if it fails (not generic)
- [ ] Trigger events populate correctly

✅ **Voice Agent**
- [ ] Outbound Call - initiates without Access Denied
- [ ] Inbound Configuration - shows phone number setup options
- [ ] Inbound calls create leads when customers call

✅ **Meetings**
- [ ] Client dropdown shows list of clients
- [ ] Meeting Notes field has type options
- [ ] Can create meeting notes linked to client

---

## If You Still Get Errors After Fixes

1. **Check Render logs first**: Search for error codes
2. **Run verification script again**:
   ```bash
   node /home/ezehmark/scriptshrx/backend/verify_and_seed_permissions.js
   ```
3. **Verify database connection**:
   ```bash
   curl -X GET https://scriptshrxcodebase.onrender.com/api/clients \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -v
   ```
4. **Check token validity** (refresh token if needed)
5. **Review Render logs** for `[Error]` or `[RBAC]` tags

---

## Files Changed

1. `backend/src/middleware/permissions.js` - Better logging
2. `backend/src/routes/workflows.js` - Better error messages
3. `backend/src/routes/voice.js` - Fixed permission requirement
4. `backend/verify_and_seed_permissions.js` - New verification script
5. `RENDER_ISSUES_FIXED.md` - Detailed troubleshooting guide

All changes are backward compatible and focused on fixing the permission and validation issues.

