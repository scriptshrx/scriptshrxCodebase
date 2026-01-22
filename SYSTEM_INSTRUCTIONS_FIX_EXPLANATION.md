# System Instructions Null Issue - ROOT CAUSE & FIX

## Problem Summary
- **Frontend:** System instructions render perfectly in textarea on page load ✓
- **Backend (voiceService):** System instructions logged as null during inbound calls ✗

---

## Why Frontend Works

**Flow:**
```
voice/page.tsx useEffect()
  ↓ fetchOrgInfo()
  ↓ GET /api/organization/info
  ↓ routes/organization.js (line 618):
     prisma.tenant.findUnique({ where: { id: tenantId } })  
     // NO SELECT CLAUSE = ALL FIELDS returned
  ↓ response.organization = {
      customSystemPrompt: "...",
      aiConfig: { systemPrompt: "..." }
    }
  ↓ setAiConfig with:
     org.aiConfig?.systemPrompt || org.customSystemPrompt
  ↓ Textarea renders value ✓
```

**Key:** The GET endpoint returns the FULL tenant record (all fields), even if you don't explicitly request them.

---

## Why Backend Was Null

**Original Flow:**
```
Inbound call
  ↓ voiceService.handleConnection()
  ↓ prisma.tenant.findFirst({
      where: { phoneNumber: calledNumber },
      select: {
        id, name, aiName, aiWelcomeMessage,
        customSystemPrompt,  ✓ was selected
        aiConfig,             ✓ was selected
        timezone
      }
    })
  ↓ If customSystemPrompt is NULL in DB → returns null
  ↓ OR fallback tenant used → has no system prompt
  ↓ connectToOpenAI() checked customSystemPrompt FIRST
  ↓ Logs null ✗
```

**Root Causes:**
1. `customSystemPrompt` field might be null in database (PATCH not saving properly)
2. Fallback tenant lookup happens when phone number not found
3. OR priority order was wrong (checking customSystemPrompt before aiConfig.systemPrompt)

---

## The Fix Applied

### Frontend is sending data properly:
```javascript
// frontend/src/app/dashboard/voice/page.tsx line 278-280
body: JSON.stringify({
    customSystemPrompt: aiConfig.customSystemPrompt,
    aiConfig: {
        systemPrompt: aiConfig.customSystemPrompt,  // ← Saved to aiConfig.systemPrompt
        ...
    }
})
```

### Backend now prioritizes aiConfig.systemPrompt:
```javascript
// backend/src/services/voiceService.js line 333-345

// PRIMARY SOURCE: aiConfig.systemPrompt (where frontend saves it)
if (tenant?.aiConfig?.systemPrompt && tenant.aiConfig.systemPrompt.trim()) {
    systemPrompt = tenant.aiConfig.systemPrompt;
    console.log('[VoiceService] ✓ Using system prompt from aiConfig.systemPrompt (PRIMARY)');
}
// FALLBACK: customSystemPrompt (legacy field)
else if (tenant?.customSystemPrompt && tenant.customSystemPrompt.trim()) {
    systemPrompt = tenant.customSystemPrompt;
    console.log('[VoiceService] ✓ Using system prompt from customSystemPrompt field (FALLBACK)');
} else {
    // Default fallback
    console.log('[VoiceService] ⚠ Using DEFAULT system prompt...');
    systemPrompt = `...default prompt...`;
}
```

**Why this works:**
- `aiConfig.systemPrompt` is where the frontend explicitly saves the value
- Even if `customSystemPrompt` field has issues, `aiConfig` (JSON field) is more reliable
- Proper fallback order ensures we always get SOMETHING

---

## Additional Fixes Made

1. **Fixed tenant refinement query** (line 169-180):
   - Added explicit SELECT clause when refining tenant by ID
   - Ensures customSystemPrompt and aiConfig are fetched

2. **Enhanced logging**:
   - Now logs both `customSystemPrompt` and `aiConfig.systemPrompt` values
   - Better debugging with JSON.stringify for aiConfig
   - Clear indicators of which source is being used

---

## Verification Checklist

After deploying these changes:

- [ ] Save system instructions via voice agent config page
- [ ] Check backend logs for: `✓ Using system prompt from aiConfig.systemPrompt (PRIMARY)`
- [ ] Make an inbound call
- [ ] Verify AI agent uses custom system instructions (not default)
- [ ] Check no null values logged for system prompt

---

## Technical Comparison Table

| Aspect | Frontend GET /info | Backend voiceService |
|--------|-------------------|----------------------|
| Query method | Implicit (no select) | Explicit (with select) |
| Returns all fields | ✓ Yes | ❌ No (only selected) |
| Handles null fields | ✓ Yes (still included) | ✓ Yes (still included) |
| Which field checked first | `aiConfig.systemPrompt` | Now: `aiConfig.systemPrompt` (changed from customSystemPrompt) |
| If both null | Uses fallback | Uses fallback |

---

## Notes

- `aiConfig` is JSON type in database, Prisma auto-parses it
- `customSystemPrompt` is String type, should be direct
- Frontend sends BOTH for compatibility
- Backend now prioritizes the structured `aiConfig.systemPrompt`
- All three data sources still being logged for debugging
