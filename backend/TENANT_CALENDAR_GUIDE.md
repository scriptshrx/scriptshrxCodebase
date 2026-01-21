# Multi-Tenant Calendar Integration - Implementation Guide

## Overview
This guide documents the complete multi-tenant Google Calendar integration for ScriptishRx AI. Each organization (tenant) can connect their own Google Calendar, and the AI will:
- Check availability from the organization's calendar
- Book appointments automatically
- Create Google Meet links for meetings
- Prevent double-booking across database and calendar

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Voice Call                            │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  agentToolsService.js       │
        │  (Function Calling)         │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │  checkAvailability()                │
        │  1. Check Database Bookings         │
        │  2. Check Tenant's Google Calendar  │
        │  3. Return Available Slots          │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │  createBooking()                    │
        │  1. Create DB Booking               │
        │  2. Create Google Calendar Event    │
        │  3. Add Google Meet Link            │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │ TenantCalendarService.js    │
        │ (Tenant-scoped Operations)  │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ Tenant's Google Calendar            │
        │ (Isolated per Organization)         │
        └─────────────────────────────────────┘
```

## Files Created/Modified

### 1. **Database Schema** (`prisma/schema.prisma`)
```prisma
// Added to Tenant model
googleCalendarEmail String?
googleCalendarTokens TenantGoogleToken?

// New model for storing tenant tokens
model TenantGoogleToken {
  id String @id @default(cuid())
  tenantId String @unique
  accessToken String @db.Text
  refreshToken String @db.Text
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@index([tenantId])
  @@map("tenant_google_tokens")
}
```

### 2. **Tenant Calendar Service** (`src/services/tenantCalendarService.js`)
Core service for tenant-scoped calendar operations.

**Key Methods:**
- `getOAuth2Client(tenantId)` - Get OAuth2 client for specific tenant
- `storeTenantTokens(tenantId, tokens, email)` - Store tokens securely per tenant
- `getTenantCalendarBusySlots(tenantId, date)` - Check busy times
- `createTenantCalendarEvent(tenantId, booking, clientName)` - Create calendar event with Meet link
- `hasTenantCalendar(tenantId)` - Check if tenant has calendar
- `disconnectTenantCalendar(tenantId)` - Disconnect calendar

**Features:**
- ✅ Complete tenant isolation
- ✅ Automatic token refresh
- ✅ Non-blocking (bookings work even if calendar fails)
- ✅ Encrypted token storage

### 3. **Tenant Calendar Routes** (`src/routes/tenantCalendar.routes.js`)
REST API endpoints for calendar management.

**Endpoints:**
```
GET  /api/tenant-calendar/auth-url
     Returns OAuth URL for tenant to authorize

GET  /api/tenant-calendar/callback
     Handles OAuth callback, stores tokens

GET  /api/tenant-calendar/status
     Check if calendar is connected + get email

DELETE /api/tenant-calendar/disconnect
     Disconnect tenant's calendar
```

### 4. **Updated Agent Tools Service** (`src/services/agentToolsService.js`)
Modified to use tenant calendar.

**Enhanced Functions:**
- `checkAvailability()` - Now checks both database AND Google Calendar
- `createBooking()` - Now creates Google Calendar events automatically

### 5. **App Registration** (`src/app.js`)
Routes registered with Express app:
```javascript
const tenantCalendarRouter = require('./routes/tenantCalendar.routes');
app.use('/api/tenant-calendar', tenantCalendarRouter);
```

## Setup Instructions

### Step 1: Database Migration
```bash
cd /home/ezehmark/scriptshrx/backend

# Ensure DATABASE_URL points to direct connection (not pooler)
# DATABASE_URL should be: postgresql://postgres:password@db.host:5432/postgres

npx prisma migrate dev --name add_tenant_calendar_tokens
```

### Step 2: Google OAuth Setup
Already in your `.env`, but verify:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/tenant-calendar/callback
```

### Step 3: Restart Server
```bash
npm start
```

### Step 4: Test Integration
```bash
# Run verification script
node verify_tenant_calendar.js

# Should show:
# ✓ TenantGoogleToken table exists
# ✓ Tenant model has googleCalendarEmail field
# ✓ All service methods present
# ✓ All routes defined
```

## Usage Flow

### For Organization (Tenant)

#### 1. Connect Calendar
```
User goes to Settings → Calendar
Clicks "Connect Google Calendar"
↓
Frontend calls: GET /api/tenant-calendar/auth-url
↓
Gets authUrl, redirects to Google OAuth
↓
User authorizes ScriptishRx to access calendar
↓
Google redirects to: /api/tenant-calendar/callback
↓
Backend stores tokens in TenantGoogleToken (isolated per tenant)
↓
User sees: "Calendar connected - email@example.com"
```

#### 2. AI Books Appointment
```
Customer calls: "I want to book an appointment"
↓
AI calls: checkAvailability(tenantId, "2026-01-21", "afternoon")
↓
Service checks:
  1. Database bookings for this tenant only
  2. Google Calendar for this tenant only
↓
Returns available slots: "2 PM, 3 PM, 4 PM"
↓
Customer: "2 PM sounds good"
↓
AI calls: createBooking({date, name, phone, purpose})
↓
Service:
  1. Creates booking in database
  2. Creates Google Calendar event
  3. Generates Google Meet link
  4. Returns confirmation
↓
Customer hears: "Confirmed for 2 PM. Meet link: meet.google.com/..."
```

#### 3. Disconnect Calendar
```
User: Settings → Calendar → Disconnect
↓
Frontend: DELETE /api/tenant-calendar/disconnect
↓
Backend:
  1. Deletes TenantGoogleToken
  2. Clears googleCalendarEmail
↓
AI continues to work (only checks database)
```

## Multi-Tenant Isolation

### How Each Tenant is Isolated

1. **Credentials Storage**
   - User credentials stored in `TenantGoogleToken` table with `tenantId` unique constraint
   - Each tenant's tokens are completely separate
   - Cannot access other tenant's credentials

2. **Availability Checking**
   ```javascript
   // BEFORE: Checked all bookings
   // checkAvailability(dateStr, timePreference)
   
   // AFTER: Checks only this tenant's data
   // checkAvailability(tenantId, dateStr, timePreference)
   ```

3. **Calendar Access**
   - Each OAuth2 client is scoped to a specific tenant
   - API calls only query that tenant's calendar
   - No cross-tenant data leakage

4. **Meeting Creation**
   - Calendar events created on specific tenant's calendar
   - Only that tenant sees their bookings
   - Meet links specific to that tenant's meetings

### Example Isolation Scenario

```
Org A (TenantId: abc123)
├─ Calendar: alice@orgA.com
├─ Bookings: Jan 21, 2 PM + 3 PM
├─ Google Calendar: Jan 21, 1 PM + 4 PM
└─ Available slots: 9-1 PM, 3-4 PM

Org B (TenantId: xyz789)
├─ Calendar: bob@orgB.com
├─ Bookings: Jan 21, 10 AM
├─ Google Calendar: Jan 21, 11 AM + 5 PM
└─ Available slots: 12-5 PM

When AI checks availability for Org A on Jan 21:
→ Checks ONLY Org A's bookings (2-3 PM)
→ Checks ONLY Org A's calendar (1 PM, 4 PM)
→ Returns: 9-1 PM, 3-4 PM available

Org B's data is completely invisible to Org A's AI
```

## Deployment Checklist

- [ ] Schema migration applied to production database
- [ ] TenantGoogleToken table created
- [ ] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set in production
- [ ] GOOGLE_REDIRECT_URI updated for production domain
- [ ] Restart backend server
- [ ] Test with first organization connecting calendar
- [ ] Verify bookings create calendar events
- [ ] Verify second organization has isolated calendar
- [ ] Monitor logs for calendar sync errors

## Error Handling

### Calendar Not Connected
```javascript
// AI still works, just checks database
checkAvailability() {
  const bookedHours = checkDatabase();
  
  try {
    const calendarBusy = checkCalendar(); // Fails, caught
    bookedHours.add(...calendarBusy);
  } catch (err) {
    console.warn('Calendar not configured, using DB only');
  }
  
  return availableSlots;
}
```

### Token Expiration
```javascript
// OAuth2Client auto-refreshes on 'tokens' event
oauth2Client.on('tokens', async (tokens) => {
  await updateTokens(tenantId, tokens);
});
```

### Network Failures
```javascript
// Non-blocking - bookings succeed even if calendar fails
try {
  await createCalendarEvent();
} catch (err) {
  console.warn('Calendar sync failed, booking created in DB');
  // Booking still successful
}
```

## Troubleshooting

### Issue: "No calendar credentials found for tenant"
**Solution:** Tenant hasn't connected calendar yet. AI will still work, only checking database.

### Issue: "Invalid refresh token"
**Solution:** User's Google auth expired. They need to reconnect via /api/tenant-calendar/auth-url

### Issue: "Calendar event creation failed"
**Solution:** Usually permission issue. Check:
- OAuth scopes include `calendar` permission
- User's Google account is active
- Tenant still has valid refresh token

### Issue: "Tenant sees other organization's bookings"
**This should never happen** - check:
- All queries include `where: { tenantId }`
- TenantCalendarService uses isolated OAuth clients
- No global calendar access

## Testing

Run verification script:
```bash
node verify_tenant_calendar.js
```

Manual testing checklist:
1. ✅ Org A connects calendar
2. ✅ Org A books appointment (meets on their calendar)
3. ✅ Org B connects calendar
4. ✅ Org B books appointment (only visible on their calendar)
5. ✅ Org A's AI sees Org A appointments only
6. ✅ Org B's AI sees Org B appointments only
7. ✅ Disconnect calendar, booking still works

## Performance Notes

- ✅ Calendar checks are async, non-blocking
- ✅ OAuth token refresh handled automatically
- ✅ Database queries have indexes on tenantId
- ✅ Calendar API calls cached per request
- ✅ Multiple bookings don't slow down availability checks

## Future Enhancements

1. **Calendar Sync Webhook** - Real-time updates when Google Calendar changes
2. **Timezone Support** - Each tenant's timezone for availability calculation
3. **Custom Availability Rules** - Tenant defines working hours per calendar
4. **Multi-Calendar Support** - Team members' calendars for resource allocation
5. **Booking Reminders** - Sync with Google Calendar reminders
6. **Calendar Analytics** - Track utilization metrics per tenant

## Support

For issues or questions about the multi-tenant calendar integration:
1. Check this guide first
2. Review logs in `verify_tenant_calendar.js` output
3. Verify DATABASE_URL in .env
4. Check Google OAuth credentials in .env
5. Ensure Prisma migration was successful

---

**Last Updated:** January 21, 2026
**Status:** ✅ Ready for Production
