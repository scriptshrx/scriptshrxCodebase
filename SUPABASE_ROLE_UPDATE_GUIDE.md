# How to Update User Role to OWNER in Supabase UI

## Step 1: Go to Supabase Dashboard
1. Open https://app.supabase.com
2. Select your project (scriptshrxCodebase)
3. Click on **SQL Editor** in the left sidebar

## Step 2: Find Your User ID
Run this query first to see all users:

```sql
SELECT id, email, role, "roleId" 
FROM users;
```

This will show you:
- Your email address
- Your current `id` (a UUID like `a1d55b35-3fac-4485-86b6-3f11b09297ce`)
- Your current `role` (probably "MEMBER")
- Your current `roleId` (might be NULL or have a UUID)

**Copy your user ID for the next step.**

## Step 3: Get the OWNER Role ID
Run this query:

```sql
SELECT id, name 
FROM roles 
WHERE name = 'OWNER';
```

This will show you the OWNER role's ID. **Copy this ID.**

## Step 4: Update Your User to OWNER
Run this query (replace the placeholders):

```sql
UPDATE users 
SET "roleId" = 'PASTE_OWNER_ROLE_ID_HERE',
    role = 'OWNER'
WHERE id = 'PASTE_YOUR_USER_ID_HERE';
```

Example (with real IDs):
```sql
UPDATE users 
SET "roleId" = '550e8400-e29b-41d4-a716-446655440000',
    role = 'OWNER'
WHERE id = 'a1d55b35-3fac-4485-86b6-3f11b09297ce';
```

## Step 5: Verify the Change
Run this to confirm:

```sql
SELECT u.id, u.email, u.role, r.name as role_name 
FROM users u 
LEFT JOIN roles r ON u."roleId" = r.id;
```

You should see your user now has:
- `role`: OWNER
- `role_name`: OWNER

## Step 6: Refresh Your Browser
1. Go back to your app (http://localhost:3000 or your Render domain)
2. Refresh the page (Ctrl+R or Cmd+R)
3. Try saving your chatbot configuration again

---

## Alternative: Use the Table Editor (No SQL)

If you prefer clicking instead of SQL:

1. Click **Table Editor** in the left sidebar
2. Click on the `users` table
3. Find your user row
4. Click the row to expand it
5. Look for the `roleId` field
6. Click the field and paste the OWNER role ID (from Step 3)
7. Also update the `role` field to `OWNER`
8. Click **Save**

---

## What Permissions Does OWNER Have?

After updating, your user will have these permissions:

```
organization:read
organization:update      ← This is what you need!
organization:delete
users:create
users:read
users:update
users:delete
users:invite
clients:create
clients:read
clients:update
clients:delete
bookings:create
bookings:read
bookings:update
bookings:delete
minutes:create
minutes:read
minutes:update
minutes:delete
voice_agents:create
voice_agents:read
voice_agents:update
voice_agents:delete
voice_agents:configure
chatbots:create
chatbots:read
chatbots:update
chatbots:delete
chatbots:train
workflows:create
workflows:read
workflows:update
workflows:delete
campaigns:create
campaigns:read
campaigns:update
campaigns:delete
analytics:read
subscriptions:read
subscriptions:update
settings:read
settings:update
integrations:create
integrations:read
integrations:update
integrations:delete
```

---

## Troubleshooting

**"No rows returned" when finding your user?**
- Make sure you're looking in the correct database/project
- Check that you used the correct email
- Try: `SELECT * FROM users;` to see all records

**Still getting "Access denied to organization" after update?**
1. Verify the update worked (Step 5)
2. Refresh your browser with Ctrl+Shift+R (hard refresh) to clear cache
3. Check the browser console for any auth errors
4. Logout and login again if still having issues

**"Can't connect to database"?**
- Make sure your Supabase project is running
- Check your internet connection
- Try again in a few moments
