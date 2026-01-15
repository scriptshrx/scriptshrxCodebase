-- Seed Roles with System Roles
INSERT INTO roles (id, name, description, "isSystem", "createdAt", "updatedAt") 
VALUES 
  (uuid_generate_v4(), 'SUPER_ADMIN', 'System role for SUPER_ADMIN', true, NOW(), NOW()),
  (uuid_generate_v4(), 'OWNER', 'System role for OWNER', true, NOW(), NOW()),
  (uuid_generate_v4(), 'ADMIN', 'System role for ADMIN', true, NOW(), NOW()),
  (uuid_generate_v4(), 'SUBSCRIBER', 'System role for SUBSCRIBER', true, NOW(), NOW()),
  (uuid_generate_v4(), 'MEMBER', 'System role for MEMBER', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Verify
SELECT * FROM roles;
