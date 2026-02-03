-- Fix: Grant workflows permissions to SUBSCRIBER role
-- Run this in your Supabase SQL editor or database client

-- 1. Ensure SUBSCRIBER role exists
INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'SUBSCRIBER',
    'Individual subscriber with full access to their own organization',
    NOW(),
    NOW()
)
ON CONFLICT (name) DO NOTHING;

-- 2. Create all workflow permissions (create, read, update, delete)
INSERT INTO "Permission" (id, resource, action, "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid(), 'workflows', 'create', NOW(), NOW()),
    (gen_random_uuid(), 'workflows', 'read', NOW(), NOW()),
    (gen_random_uuid(), 'workflows', 'update', NOW(), NOW()),
    (gen_random_uuid(), 'workflows', 'delete', NOW(), NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- 3. Link all workflow permissions to the SUBSCRIBER role
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "Permission" p
CROSS JOIN "Role" r
WHERE p.resource = 'workflows' 
  AND p.action IN ('create', 'read', 'update', 'delete')
  AND r.name = 'SUBSCRIBER'
ON CONFLICT DO NOTHING;

-- 4. Verify all workflow permissions are linked
SELECT r.name as role, p.resource, p.action 
FROM "Role" r
JOIN "_PermissionToRole" jt ON r.id = jt."B"
JOIN "Permission" p ON jt."A" = p.id
WHERE r.name = 'SUBSCRIBER' AND p.resource = 'workflows'
ORDER BY p.action;
