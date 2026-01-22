# Why Frontend Renders customSystemPrompt but Backend Gets NULL

## 🟢 Frontend Flow (WORKS)

```
voice/page.tsx useEffect() 
  ↓
fetchOrgInfo()
  ↓
GET /api/organization/info (with authentication)
  ↓
routes/organization.js line 618-619:
┌─────────────────────────────────────────────────┐
│ const tenant = await prisma.tenant.findUnique({│
│     where: { id: tenantId }                    │
│ });                                              │
│ // NO SELECT CLAUSE - Returns ALL fields      │
└─────────────────────────────────────────────────┘
  ↓
Returned to frontend in response (line 633-642):
{
  customSystemPrompt: "You are an AI agent...",
  aiConfig: { systemPrompt: "You are an AI agent..." }
}
  ↓
Frontend line 156-157:
customSystemPrompt: org.aiConfig?.systemPrompt || org.customSystemPrompt
  ↓
Returns: "You are an AI agent..."  ✓
  ↓
Renders in textarea (line 475) ✓
```

## 🔴 Backend Flow (NULL)

```
Inbound call arrives
  ↓
voiceService.js handleConnection() line 81-130
  ↓
Initial tenant lookup (lines 95-100):
┌──────────────────────────────────────────────────────┐
│ const t = await prisma.tenant.findFirst({           │
│   where: { phoneNumber: calledNumber },             │
│   select: {                                          │
│     id, name, aiName,                               │
│     aiWelcomeMessage,                               │
│     customSystemPrompt,  ✓ SELECTED               │
│     aiConfig,             ✓ SELECTED               │
│     timezone                                         │
│   }                                                   │
│ });                                                   │
│ // SELECT clause present                           │
└──────────────────────────────────────────────────────┘
  ↓
Problem: If tenant.customSystemPrompt IS NULL in database:
  - Query still executes successfully
  - Returns: { customSystemPrompt: null }  ← NULL IN DB!
  ↓
Line 105-107 logs:
console.log('[VoiceService] customSystemPrompt from db:', t?.customSystemPrompt)
  → Logs: null
  ↓
connectToOpenAI() line 286-301:
Refreshes with same select clause
  ↓
Line 332 logs:
console.log('[VoiceService] Tenant customSystemPrompt value:', tenant?.customSystemPrompt)
  → Still logs: null
```

## 📊 The KEY Difference

| Aspect | Frontend | Backend |
|--------|----------|---------|
| Fetch endpoint | GET /api/organization/info | Prisma direct |
| Select clause | ❌ None (returns ALL) | ✅ Explicit select |
| Gets full tenant | ✅ Yes | ❌ Only selected fields |
| If field null in DB | ✓ Still gets it (it's null) | ✓ Still gets it (it's null) |
| If PATCH not saved | ✓ Old value from prev query | ❌ Null from db |

## ❌ Root Cause

**The actual issue is NOT the query**, it's that **customSystemPrompt is NULL in the database**

### Why customSystemPrompt is NULL:
1. PATCH request to save might be failing silently
2. Permission check `checkPermission('organization', 'update')` might be blocking it
3. `customSystemPrompt` field might not be properly defined in schema
4. OR the PATCH is only saving to `aiConfig.systemPrompt` but NOT to `customSystemPrompt` field

## 🔧 Solution

Need to verify:
1. **Is the PATCH actually saving?**
   - Check: `console.log` output from organization.js PATCH handler (lines 675-702)
   - Does it say "Setting customSystemPrompt to: ..." or "customSystemPrompt was UNDEFINED"?

2. **Is permission check passing?**
   - Check logs for permission denied errors

3. **Is the data actually in the database?**
   - Query: `SELECT id, name, customSystemPrompt FROM tenants LIMIT 1;`
   - If null → PATCH not saving it

4. **Should we save ONLY to aiConfig.systemPrompt?**
   - The backend could skip reading from `customSystemPrompt` field
   - Instead always read from `aiConfig.systemPrompt`
