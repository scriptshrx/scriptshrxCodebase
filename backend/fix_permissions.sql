-- =====================================================
-- Fix User Permissions - Manual SQL
-- =====================================================
-- This script elevates your user to OWNER role so you 
-- can save chatbot configuration.
--
-- Run this directly in your Supabase SQL editor at:
-- https://app.supabase.com/project/[your-project]/sql
-- =====================================================

-- Step 1: Get your user ID (replace with your email)
SELECT id, email, role, "roleId" 
FROM users 
WHERE email = 'your-email@example.com';

-- Step 2: Get the OWNER role ID
SELECT id, name 
FROM roles 
WHERE name = 'OWNER';

-- Step 3: Update your user to OWNER role
-- Replace YOUR_USER_ID and OWNER_ROLE_ID with actual IDs from above
UPDATE users 
SET "roleId" = 'OWNER_ROLE_ID', role = 'OWNER' 
WHERE id = 'YOUR_USER_ID';

-- Step 4: Verify the update worked
SELECT u.id, u.email, u.role, r.name as role_name 
FROM users u 
LEFT JOIN roles r ON u."roleId" = r.id 
WHERE u.email = 'your-email@example.com';

-- Step 5: Check what permissions OWNER has
SELECT p.resource, p.action 
FROM roles r 
JOIN "permission_role" pr ON r.id = pr."roleId" 
JOIN permissions p ON p.id = pr."permissionId" 
WHERE r.name = 'OWNER'
ORDER BY p.resource, p.action;

-- =====================================================
-- Alternative: Update ALL users to OWNER
-- (Uncomment if you want all users to be admin)
-- =====================================================

-- UPDATE users 
-- SET "roleId" = (SELECT id FROM roles WHERE name = 'OWNER'), 
--     role = 'OWNER' 
-- WHERE "roleId" IS NOT NULL OR role IS NOT NULL;
