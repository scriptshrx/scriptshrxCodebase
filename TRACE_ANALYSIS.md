# System Instructions Fetch Flow Analysis

## Frontend (Works ✓)
```
useEffect() on page load
  ↓
fetchOrgInfo()
  ↓
GET /api/organization/info (no auth middleware issues)
  ↓
Backend routes/organization.js GET /info
  ↓
prisma.tenant.findUnique({ where: { id: tenantId } })
  ↓ (NO SELECT CLAUSE - gets ALL fields)
  ↓
Response includes: {
  customSystemPrompt: "...the actual value...",
  aiConfig: { systemPrompt: "...value..." }
}
  ↓
Frontend receives full organization object
  ↓
setAiConfig with: org.aiConfig?.systemPrompt || org.customSystemPrompt
  ↓
Renders in textarea ✓
```

## Backend voiceService (Logs as null ✗)
```
Inbound call arrives
  ↓
handleConnection() in voiceService
  ↓
Initial tenant lookup (lines 95-100):
prisma.tenant.findFirst({
  where: { phoneNumber: calledNumber },
  select: {
    id, name, aiName, aiWelcomeMessage, customSystemPrompt, aiConfig, timezone
  }
})
  ↓ (SELECT CLAUSE present - should get customSystemPrompt)
  ↓
IF paramTenantId mismatch, refined lookup (lines 169-180):
prisma.tenant.findUnique({
  where: { id: paramTenantId },
  select: { ... customSystemPrompt ... }  ✓ FIXED
})
  ↓
connectToOpenAI(ws)
  ↓
Fresh lookup (lines 286-301):
prisma.tenant.findUnique({
  where: { id: tenant.id },
  select: {
    id, name, aiName, aiWelcomeMessage, customSystemPrompt, aiConfig, timezone
  }
})
  ↓
Logs: [VoiceService] Tenant customSystemPrompt value: null
```

## Key Difference
Frontend endpoint returns FULL TENANT (all fields), so even if not in select, it's there.
Backend queries use EXPLICIT SELECT CLAUSES, so it ONLY gets selected fields.

## Why customSystemPrompt might be null in voiceService:
1. The field IS null in the database
2. OR the initial lookup is failing and using fallback tenant (which is missing the field)
3. OR there's a timing issue with the PATCH save not being committed

## Investigation Needed:
- Check if customSystemPrompt is actually being saved to DB in organization.js PATCH
- Check if the initial tenant lookup (lines 95-100) is succeeding
- Check if the fallback tenant path is being used (line 130 onwards)
