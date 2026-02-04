-- =====================================================
-- Check and Fix OWNER Role Permissions
-- =====================================================

-- Step 1: Check if OWNER role exists and its ID
SELECT id, name FROM roles WHERE name = 'OWNER';

-- Step 2: Check how many permissions are linked to OWNER role
SELECT COUNT(*) as permission_count 
FROM "role_permission"
WHERE "roleId" = (SELECT id FROM roles WHERE name = 'OWNER');

-- Step 3: List all permissions linked to OWNER
SELECT p.id, p.resource, p.action
FROM permissions p
JOIN "role_permission" rp ON p.id = rp."permissionId"
WHERE rp."roleId" = (SELECT id FROM roles WHERE name = 'OWNER')
ORDER BY p.resource, p.action;

-- Step 4: Check if 'organization' permission exists
SELECT id, resource, action FROM permissions 
WHERE resource = 'organization' AND action = 'update';

-- Step 5: If there are NO permissions linked to OWNER, run this to link ALL permissions:
-- First, get the OWNER role ID
-- Then run this (replace OWNER_ROLE_ID with actual ID):
INSERT INTO "role_permission" ("roleId", "permissionId")
SELECT 'OWNER_ROLE_ID', id 
FROM permissions
ON CONFLICT DO NOTHING;

-- Step 6: Verify the fix worked
SELECT COUNT(*) as permission_count 
FROM "role_permission"
WHERE "roleId" = (SELECT id FROM roles WHERE name = 'OWNER');
