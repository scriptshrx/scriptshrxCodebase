# Inbound Call Settings - Duplicate Phone Number Analysis

## Summary
When another company (tenant) tries to add a phone number that's already been added by another company, **the request will FAIL** with a database error because there is a **UNIQUE constraint** on the `phoneNumber` field in the Tenant model.

---

## Current Implementation

### Database Schema (Prisma)
**Location:** `/home/ezehmark/scriptshrx/backend/prisma/schema.prisma`

```prisma
model Tenant {
  id               String  @id @default(uuid())
  name             String
  location         String?
  timezone         String?
  phoneNumber      String? @unique  // ← UNIQUE constraint here
  
  // ... other fields
  twilioConfig     Json?  // Also stores phoneNumber: { phoneNumber, ... }
  
  @@map("tenants")
}
```

**Key Point:** The `phoneNumber` field on the Tenant model has a `@unique` constraint, meaning only ONE tenant can have a specific phone number globally.

---

## Backend Flow

### API Endpoint: `PATCH /api/organization/info`
**Location:** `/home/ezehmark/scriptshrx/backend/src/routes/organization.js` (lines 490-611)

```javascript
router.patch('/info',
    authenticateToken,
    checkPermission('organization', 'update'),
    async (req, res) => {
        // ... validation ...
        
        if (twilioConfig !== undefined) {
            // Fetch current config to merge (Read-Modify-Write)
            const currentTenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { twilioConfig: true }
            });
            
            if (twilioConfig.phoneNumber) {
                // Sanitize: Strip everything except '+' and digits
                const cleanedPhone = twilioConfig.phoneNumber.replace(/[^\d+]/g, '');
                
                // Validate E.164 format
                const phoneRegex = /^\+?[1-9]\d{1,14}$/;
                if (!phoneRegex.test(cleanedPhone)) {
                    return res.status(400).json({ 
                        success: false, 
                        error: `Invalid Phone Number format...` 
                    });
                }
                
                twilioConfig.phoneNumber = cleanedPhone;
            }
            
            // Merge and update
            updateData.twilioConfig = {
                ...existingConfig,
                ...twilioConfig
            };
        }
        
        // THIS IS WHERE IT FAILS FOR DUPLICATES:
        const tenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: updateData  // Contains the phoneNumber field
        });
```

### What Happens When Duplicate is Attempted:

1. **Request validation passes** (phone number format is valid E.164)
2. **Backend prepares the update** with the duplicate phone number
3. **Database UPDATE fails** with a Prisma/PostgreSQL unique constraint violation error
4. **Error is caught** in the catch block (line 607+):

```javascript
catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
        success: false,
        error: 'Failed to update organization'
    });
}
```

**Result:** Generic 500 error response: `"Failed to update organization"`

---

## Frontend Behavior

### Settings Page (`/dashboard/settings`)
**Location:** `/home/ezehmark/scriptshrx/frontend/src/app/dashboard/settings/page.tsx` (lines 244-350)

```tsx
const handleSaveInbound = async () => {
    if (!inboundPhone) return showToast('Please enter a phone number.', 'error');
    setIsSaving(true);
    
    try {
        const res = await fetch('/api/organization/info', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                twilioConfig: { phoneNumber: inboundPhone }
            })
        });

        if (res.ok) {
            showToast('Inbound number saved successfully!', 'success');
        } else {
            showToast('Failed to save configuration.', 'error');  // ← User sees this
        }
    } catch (error) {
        showToast('Network error while saving.', 'error');
    }
};
```

**What User Sees:** Toast notification: `"Failed to save configuration."` (No specific error message about duplicate)

### Voice Page (`/dashboard/voice`)
**Location:** `/home/ezehmark/scriptshrx/frontend/src/app/dashboard/voice/page.tsx` (lines 317-330)

```tsx
const handleSaveInbound = async () => {
    if (!inboundPhone) return;
    setInboundSaving(true);
    
    try {
        const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/organization/info`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ twilioConfig: { phoneNumber: inboundPhone } })
        });
        
        const data = await res.json();
        if (res.ok) {
            alert('Inbound number updated! Please ensure your Twilio webhook is set.');
        } else {
            alert(data.error || 'Failed to save inbound number');  // ← Generic alert
        }
```

**What User Sees:** Alert: `"Failed to save inbound number"` (No specific error message about duplicate)

---

## Phone Number Storage Locations

There are TWO places where a phone number can be stored:

### 1. `Tenant.phoneNumber` (Direct Column)
- Directly on the Tenant model
- Has `@unique` constraint → **PREVENTS DUPLICATES**
- Scoped per tenant

### 2. `Tenant.twilioConfig` (JSON Field)
- Stored in a JSON column
- Contains: `{ phoneNumber, accountSid, authToken, ... }`
- **NO unique constraint on this nested field**
- Scoped per tenant

**Current Implementation:** Phone numbers are stored in `twilioConfig.phoneNumber`, but the schema also has `Tenant.phoneNumber` with a UNIQUE constraint (though it may be unused in practice).

---

## Missing Validations

The current implementation is **missing explicit duplicate detection** at the application level:

### What's NOT Being Done:
1. ✗ No check to see if another tenant already has this phone number
2. ✗ No specific error message for duplicate phone numbers
3. ✗ No frontend warning before attempting to save
4. ✗ The unique constraint on `Tenant.phoneNumber` is likely not being used since the code stores it in `twilioConfig.phoneNumber`

### What's Being Done:
1. ✓ Sanitizes phone number format (removes spaces, hyphens, etc.)
2. ✓ Validates E.164 format (regex validation)
3. ✓ Merges with existing config (read-modify-write pattern)

---

## Recommended Fixes

### Option 1: Add Application-Level Validation (Recommended)
```javascript
// In organization.js, before the update:
if (twilioConfig?.phoneNumber) {
    const cleanedPhone = twilioConfig.phoneNumber.replace(/[^\d+]/g, '');
    
    // Check if another tenant already has this number
    const existingTenant = await prisma.tenant.findFirst({
        where: {
            phoneNumber: cleanedPhone,
            id: { not: tenantId }  // Exclude current tenant
        }
    });
    
    if (existingTenant) {
        return res.status(409).json({
            success: false,
            error: 'This phone number is already registered with another company'
        });
    }
}
```

### Option 2: Ensure UNIQUE Constraint is on the Right Field
- Either move phone number storage to `Tenant.phoneNumber` (not JSON)
- Or add a unique constraint on the JSON field (PostgreSQL supports this)

### Option 3: Better Error Messaging
```javascript
catch (error) {
    if (error.code === 'P2002') {  // Prisma unique constraint violation
        console.error('Duplicate phone number:', error);
        res.status(409).json({
            success: false,
            error: 'This phone number is already in use by another company'
        });
    } else {
        console.error('Error updating organization:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update organization'
        });
    }
}
```

### Option 4: Frontend Improvements
- Show a user-friendly error message that matches the backend error
- Consider a phone number lookup/availability check before saving
- Add warning toast if user enters a number that might be used elsewhere

---

## Error Flow Summary

```
User enters phone number already used by Company A
              ↓
Frontend calls PATCH /api/organization/info
              ↓
Backend validates E.164 format ✓
              ↓
Backend attempts Prisma.tenant.update()
              ↓
Database rejects due to UNIQUE constraint
              ↓
Catch block triggered
              ↓
Generic error response: "Failed to update organization"
              ↓
Frontend shows: "Failed to save configuration." or "Failed to save inbound number"
              ↓
User has no idea why it failed (no duplicate detection message)
```

---

## Technical Details

- **Database:** PostgreSQL
- **ORM:** Prisma
- **Current Constraint:** `@unique` on `Tenant.phoneNumber` model field
- **Actual Storage:** `Tenant.twilioConfig.phoneNumber` (JSON)
- **Problem:** Mismatch between where constraint is and where data is stored

