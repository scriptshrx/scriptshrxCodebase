# Custom System Prompt Debugging - Solution Summary

## Problem
Your organization's custom system prompt was coming back as `null` during inbound calls, causing the AI to use the hardcoded fallback prompt instead of your custom message.

## Root Causes Identified
1. **Database service table doesn't exist** - The `public.services` table referenced in `getPricingContext()` hasn't been created, causing warning logs
2. **Stale tenant data** - The tenant data fetched on initial connection wasn't being refreshed before use, so updates from the frontend weren't picked up
3. **Missing debugging** - No clear logging to identify where the custom prompt was being lost in the pipeline

##  Fixes Applied

### 1. Enhanced VoiceService - `connectToOpenAI()` Method
**File:** `backend/src/services/voiceService.js`

**What Changed:**
- Added fresh database refresh of tenant data before building system prompt
- Now fetches the latest `customSystemPrompt` directly from the database on each call
- Enhanced logging to show exactly which prompt is being used

**Key Lines (274-330):**
```javascript
// 1. Refresh tenant data from database to ensure we have the latest customSystemPrompt
let tenant = session.tenant;
if (tenant && tenant.id !== 'fallback') {
    const freshTenant = await prisma.tenant.findUnique({...});
    if (freshTenant) {
        tenant = freshTenant;
        console.log('[VoiceService] ✓ Tenant data refreshed from database');
    }
}
```

### 2. Enhanced Tenant Lookup - `handleConnection()` Method
**File:** `backend/src/services/voiceService.js`

**What Changed:**
- Better logic for finding tenant by inbound phone number
- Clear distinction between successful lookup and fallback
- Full tenant object logged to help debug mismatches

**Key Improvements:**
- Logs inbound "To" number for debugging
- Logs when tenant is found by phone number
- Logs when using fallback tenant with reason
- Logs full tenant object including customSystemPrompt status

### 3. Improved Error Handling in `getPricingContext()`
**File:** `backend/src/services/voiceService.js`

**What Changed:**
- Changed error level from error to warning for missing services table
- Better message explaining that services table might not be created yet

### 4. Added Logging to Organization API
**File:** `backend/src/routes/organization.js` (PATCH /info endpoint)

**What Changed:**
- Logs what customSystemPrompt is received from frontend
- Logs what's being saved to the database
- Logs what's retrieved after update

**Key Lines (around 670-695):**
```javascript
console.log('[Organization API] customSystemPrompt from request:', customSystemPrompt ? `${customSystemPrompt.substring(0, 50)}...` : 'UNDEFINED');
console.log('[Organization API] Setting customSystemPrompt to:', customSystemPrompt.substring(0, 50) + '...');
console.log('[Organization API] Updated customSystemPrompt:', tenant.customSystemPrompt ? `${tenant.customSystemPrompt.substring(0, 50)}...` : 'NULL');
```

## How to Verify It's Working

### Check Frontend Upload
1. Open your Voice dashboard
2. In "System Instructions" field, paste your custom prompt
3. Click "Save AI Configuration"
4. Watch the server logs for:
   ```
   [Organization API] customSystemPrompt from request: [your prompt preview]...
   [Organization API] Setting customSystemPrompt to: [your prompt preview]...
   [Organization API] Updated customSystemPrompt: [your prompt preview]...
   ```

### Check Inbound Call Flow
1. Make an inbound call to your configured phone number
2. Watch the logs for:
   ```
   [VoiceService] Inbound call To number: +1234567890
   [VoiceService] ✓ Tenant found by phone number: Your Org (ID: xxx)
   [VoiceService] customSystemPrompt from db: [your prompt preview]...
   [VoiceService] Fresh tenant fetched: {...}
   [VoiceService] ✓ Tenant data refreshed from database
   [VoiceService] ✓ Using CUSTOM system prompt from tenant
   ```

### New Debug Script
Created `backend/debug_tenant_prompt.js`:
- Run it to check all tenants' custom prompts in the database
- Shows which tenants are missing configurations
- Recommends next steps

**Usage:**
```bash
cd /home/ezehmark/scriptshrx/backend
node debug_tenant_prompt.js
```

## Debugging Checklist

If custom prompt is still null:

1. **Verify frontend saves** - Check Organization API logs when you click "Save"
   - Should see `[Organization API] Setting customSystemPrompt to: ...`

2. **Verify database save** - Check if update logs show the value
   - Should see `[Organization API] Updated customSystemPrompt: ...`

3. **Verify phone number match** - Ensure inbound phone matches what's configured
   - Logs show which tenant is being looked up
   - If wrong tenant, check phoneNumber field in database

4. **Check Plan Restrictions** - Custom prompts might be blocked by plan limits
   - Check settings.js for plan-based gating

5. **Test with test script**:
   ```bash
   node /home/ezehmark/scriptshrx/backend/test_custom_prompt_save.js
   ```

## Next Steps

1. **Upload your custom prompt** from the voice dashboard
2. **Make a test inbound call** and monitor the logs
3. **Share the logs** if it's still showing as null - we can trace exactly where it's being lost
4. **Check database migrations** - May need to run `npx prisma migrate deploy` if services table is missing

## Files Modified
- `/home/ezehmark/scriptshrx/backend/src/services/voiceService.js` - Enhanced debugging and fresh tenant data
- `/home/ezehmark/scriptshrx/backend/src/routes/organization.js` - Added API logging

## Files Created  
- `/home/ezehmark/scriptshrx/backend/debug_tenant_prompt.js` - Debug database state
- `/home/ezehmark/scriptshrx/backend/test_custom_prompt_save.js` - Test save/retrieve flow
