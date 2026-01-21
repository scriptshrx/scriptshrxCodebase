# Quick Fix Verification Checklist

## ✅ What's Been Fixed

- [x] **VoiceService now refreshes tenant data** - Gets fresh `customSystemPrompt` from DB before each call
- [x] **Better tenant lookup logic** - Clearer identification of inbound caller
- [x] **Enhanced logging throughout** - Can track the custom prompt from save → DB → voice agent
- [x] **Robust pricing context** - Won't crash if services table is missing
- [x] **API endpoint logging** - Can see exactly what's being saved to DB

## 🧪 Quick Tests to Run

### Test 1: Check Server Logs When Saving
1. Open terminal monitoring backend logs
2. Go to Voice Dashboard → "System Instructions"
3. Paste or update your custom prompt
4. Click "Save AI Configuration"
5. **Look for:**
   ```
   [Organization API] customSystemPrompt from request: ...
   [Organization API] Setting customSystemPrompt to: ...
   [Organization API] Updated customSystemPrompt: ...
   ```

### Test 2: Check Logs During Inbound Call
1. Keep terminal open with backend logs
2. Call your inbound phone number
3. **Look for logs in this order:**
   ```
   [VoiceService] Inbound call To number: +1...
   [VoiceService] ✓ Tenant found by phone number: [Your Org]
   [VoiceService] Fresh tenant fetched: {...}
   [VoiceService] ✓ Tenant data refreshed from database  
   [VoiceService] Tenant customSystemPrompt value: [your prompt...]
   [VoiceService] ✓ Using CUSTOM system prompt from tenant
   ```

### Test 3: Check Database State
```bash
cd /home/ezehmark/scriptshrx/backend
node debug_tenant_prompt.js
```
Should show:
- Your organization name
- Phone number configured
- ✓ Custom System Prompt: SET (X chars)
- Preview of your prompt

## 🔴 If Still Showing as NULL

**In order, check:**

1. **Was prompt actually sent from frontend?**
   - Look for `[Organization API] customSystemPrompt from request:`
   - If it says "UNDEFINED" → frontend didn't send it
   - Fix: Make sure you pasted text in the "System Instructions" field

2. **Was it saved to database?**
   - Look for `[Organization API] Updated customSystemPrompt:`
   - If it says "NULL" → DB didn't save it
   - Possible issue: Plan restrictions, validation errors, or DB error

3. **Is correct tenant being looked up during call?**
   - Look for `[VoiceService] ✓ Tenant found by phone number:`
   - If it shows wrong org → inbound number isn't matching
   - Fix: Update your phone number in Voice Dashboard

4. **Is tenant data refreshing?**
   - Look for `[VoiceService] ✓ Tenant data refreshed from database`
   - If not showing → Check for database connection errors

## 📊 Log Pattern to Expect

### Success Pattern:
```
[Organization API] Receiving PATCH /info
[Organization API] customSystemPrompt from request: You are a helpful AI...
[Organization API] Setting customSystemPrompt to: You are a helpful AI...
[Organization API] Updated customSystemPrompt: You are a helpful AI...

[then during inbound call]

[VoiceService] Inbound call To number: +18667243198
[VoiceService] ✓ Tenant found by phone number: My Company (ID: abc123)
[VoiceService] Fresh tenant fetched: {"id":"abc123","name":"My Company","customSystemPrompt":"You are a helpful AI..."}
[VoiceService] ✓ Tenant data refreshed from database
[VoiceService] Tenant customSystemPrompt value: You are a helpful AI...
[VoiceService] ✓ Using CUSTOM system prompt from tenant
```

### Failure Pattern:
```
[Organization API] customSystemPrompt from request: UNDEFINED    ← Frontend didn't send it
[VoiceService] Tenant customSystemPrompt value: null            ← Not in DB  
[VoiceService] ⚠ Using DEFAULT system prompt (custom prompt is null or empty)  ← Fallback used
```

## 🎯 Next Steps

1. **Test with logs** - Run through Test 1 and 2 above
2. **Share logs** - If still null, copy the relevant logs and share
3. **Check plan** - Custom prompts might need Growth+ plan
4. **Verify phone** - Make sure phone number in DB matches your Twilio number

## 💡 Pro Tip

The logs are your best friend here. Each step logs exactly what it's doing:
- Frontend save → Organization API logs
- DB update → Organization API logs  
- DB retrieval → VoiceService logs
- Prompt selection → VoiceService logs

If you follow the log flow, you can pinpoint exactly where things are working or failing.
