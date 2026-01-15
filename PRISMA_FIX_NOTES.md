# Prisma "Prepared Statement Already Exists" Fix

## Root Cause
The error `PostgresError { code: "42P05", message: "prepared statement \"s0\" already exists" }` was caused by a **PgBouncer connection pooling conflict with Prisma prepared statements**.

### Why it occurred:
1. Your system uses **PgBouncer** with transaction pooling (`pgbouncer=true` in DATABASE_URL)
2. PgBouncer's **transaction pooling mode** doesn't support prepared statements across different sessions
3. Multiple Prisma client instances were being created without proper configuration
4. Prisma was attempting to reuse prepared statements across different database connections

## Solutions Implemented

### 1. Fixed Prisma Client Configuration (`backend/src/lib/prisma.js`)
- ✅ Both `prismaClient` and `prismaConcurrentClient` now use `DIRECT_URL` for direct connections
- ✅ This bypasses PgBouncer for these clients, avoiding connection pooling issues
- ✅ The extended client uses transaction pooling (DATABASE_URL), concurrent client uses direct connection

### 2. Updated Auth Route (`backend/src/routes/auth.js`)
- ✅ Changed to use the `concurrent` client for registration
- ✅ This avoids prepared statement conflicts during user creation
- ✅ Registration queries now execute on a direct connection

### 3. Updated Prisma Schema (`backend/prisma/schema.prisma`)
- ✅ Added `relationMode = "prisma"` to datasource
- ✅ This tells Prisma to handle relations at the application level instead of database level
- ✅ Eliminates foreign key constraint queries that could cause prepared statement issues

## Technical Details

### Connection Strategy:
```
DATABASE_URL (with PgBouncer) → Extended Prisma client (for RLS context)
DIRECT_URL (direct connection) → Concurrent Prisma client (for high-concurrency operations)
                              → Auth routes use concurrent client
```

### Why This Works:
- PgBouncer's **transaction pooling** is safe for prepared statements within a single transaction
- By using `DIRECT_URL` for auth operations, we bypass PgBouncer entirely
- `relationMode = "prisma"` prevents database-level relation queries that could conflict

## Testing Registration
Try registering again - it should now work without the prepared statement error:
```bash
# Example registration request
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123",
    "name": "Test User",
    "companyName": "Test Company"
  }'
```

## Files Modified
1. `/backend/src/lib/prisma.js` - Added DIRECT_URL configuration
2. `/backend/src/routes/auth.js` - Uses concurrent client
3. `/backend/prisma/schema.prisma` - Added relationMode

## Fallback Notes
- If issues persist, verify your `.env` file has both:
  - `DATABASE_URL=...?pgbouncer=true`
  - `DIRECT_URL=...` (same credentials, no pgbouncer parameter)
- Both should point to the same database with identical credentials
