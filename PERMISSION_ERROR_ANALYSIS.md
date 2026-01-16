# Permission Error: "Access denied to organization"

## Error Location
**File:** `/home/ezehmark/scriptshrx/backend/src/middleware/permissions.js` (Line 102)

When you try to add an inbound phone number by calling `PATCH /api/organization/info`, the endpoint checks if you have permission to update the `organization` resource.

```javascript
// In checkPermission middleware
if (!hasPermission) {
    return res.status(403).json({
        success: false,
        error: `Access denied to ${resource}`,  // ← This becomes "Access denied to organization"
        code: 'ACCESS_DENIED',
        resource: 'organization',
        action: 'update'
    });
}
```

---

## Why This Happens

### The Endpoint
**Location:** `/home/ezehmark/scriptshrx/backend/src/routes/organization.js` (Line 493-495)

```javascript
router.patch('/info',
    authenticateToken,
    checkPermission('organization', 'update'),  // ← Requires organization:update permission
    async (req, res) => {
        // Updates inbound phone number here
    }
);
```

### The Problem
Your user account is missing the **`organization:update` permission**.

---

## How Permissions Work

The system uses Role-Based Access Control (RBAC):

1. **Each user has a role** (SUPER_ADMIN, OWNER, ADMIN, MEMBER, etc.)
2. **Each role has permissions** (pairs of resource:action)
3. **Permission format:** `resource` + `action`
   - Example: `organization:update`, `clients:read`, `bookings:delete`

### Permission Check Flow

```
User tries to save inbound number
         ↓
Calls PATCH /api/organization/info
         ↓
checkPermission('organization', 'update') middleware runs
         ↓
Checks if user's role has 'organization:update' permission
         ↓
If NO permission found → Returns 403 "Access denied to organization"
         ↓
If permission found → Allows request to proceed
```

---

## How to Fix This

You need to ensure your user has the `organization:update` permission. There are two ways:

### Option 1: Check Database Directly
Look at the `users` and `roles` tables to verify your user's role:

```sql
-- See which role your user has
SELECT u.id, u.email, u.role, u.roleId, r.name 
FROM users u
LEFT JOIN roles r ON u.roleId = r.id
WHERE u.email = 'your-email@example.com';

-- See what permissions that role has
SELECT p.resource, p.action 
FROM roles r
JOIN permissions p ON r.id = p.id  -- This join might need adjustment based on your schema
WHERE r.name = 'YOUR_ROLE_NAME';
```

### Option 2: Check Your User's Role
In the settings or admin panel, verify:
1. What role does your user account have?
2. Is it OWNER, ADMIN, MEMBER, or SUPER_ADMIN?

### Option 3: Assign the Permission
If you're an admin or have database access:

```sql
-- Find the permission ID for organization:update
SELECT id FROM permissions 
WHERE resource = 'organization' AND action = 'update';

-- Find your role ID
SELECT id FROM roles WHERE name = 'YOUR_ROLE_NAME';

-- Add the permission to your role (if there's a junction table)
-- The exact query depends on your schema structure
```

---

## Affected Frontend Code

The following pages send requests to `PATCH /api/organization/info`:

### 1. Settings Page
**File:** `/home/ezehmark/scriptshrx/frontend/src/app/dashboard/settings/page.tsx` (Line 280-305)

```tsx
const handleSaveInbound = async () => {
    const res = await fetch('/api/organization/info', {  // ← Calls the protected endpoint
        method: 'PATCH',
        body: JSON.stringify({
            twilioConfig: { phoneNumber: inboundPhone }
        })
    });
    // ... handles error response
};
```

### 2. Voice Page
**File:** `/home/ezehmark/scriptshrx/frontend/src/app/dashboard/voice/page.tsx` (Line 317-335)

```tsx
const handleSaveInbound = async () => {
    const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/organization/info`, {  // ← Same endpoint
        method: 'PATCH',
        body: JSON.stringify({ twilioConfig: { phoneNumber: inboundPhone } })
    });
    // ... handles error response
};
```

Both pages will show the error from the server.

---

## Root Cause Summary

| Component | Issue |
|-----------|-------|
| **Endpoint** | `/api/organization/info` (PATCH) requires `organization:update` permission |
| **Middleware** | `checkPermission('organization', 'update')` enforces this |
| **Your Account** | Missing `organization:update` permission in your role |
| **Result** | 403 Forbidden with message: "Access denied to organization" |

---

## Debugging Steps

1. **Check your role:**
   ```bash
   # In database or admin panel, find your user's role
   ```

2. **Verify the permission exists:**
   Look for a `permissions` table entry with:
   - `resource` = "organization"
   - `action` = "update"

3. **Ensure your role has that permission:**
   Your role should be linked to that permission in the database.

4. **If you need access:**
   - Contact a SUPER_ADMIN user
   - Ask them to grant your role the `organization:update` permission
   - Or change your role to OWNER/ADMIN which should have this permission

---

## Code References

- **Permission Check:** `backend/src/middleware/permissions.js` (lines 20-110)
- **Organization Endpoint:** `backend/src/routes/organization.js` (lines 493-641)
- **Frontend Settings:** `frontend/src/app/dashboard/settings/page.tsx` (lines 280-305)
- **Frontend Voice Page:** `frontend/src/app/dashboard/voice/page.tsx` (lines 317-335)

