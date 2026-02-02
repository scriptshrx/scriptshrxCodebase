#!/usr/bin/env node
/**
 * Verify and Seed Missing Permissions
 * This script checks if all required permissions exist in the database
 * and creates missing ones.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REQUIRED_PERMISSIONS = {
    'SUPER_ADMIN': {
        'platform': ['*'],
        'organizations': ['create', 'read', 'update', 'delete', 'suspend'],
        'users': ['create', 'read', 'update', 'delete', 'invite'],
        'subscriptions': ['create', 'read', 'update', 'delete', 'override'],
        'analytics': ['platform_wide'],
        'settings': ['system']
    },
    'OWNER': {
        'organization': ['read', 'update', 'delete'],
        'users': ['create', 'read', 'update', 'delete', 'invite'],
        'clients': ['create', 'read', 'update', 'delete'],
        'bookings': ['create', 'read', 'update', 'delete'],
        'minutes': ['create', 'read', 'update', 'delete'],
        'meeting_minutes': ['create', 'read', 'update', 'delete'],
        'voice_agents': ['create', 'read', 'update', 'delete', 'configure'],
        'chatbots': ['create', 'read', 'update', 'delete', 'train'],
        'workflows': ['create', 'read', 'update', 'delete'],
        'campaigns': ['create', 'read', 'update', 'delete'],
        'analytics': ['read'],
        'subscriptions': ['read', 'update'],
        'settings': ['read', 'update'],
        'integrations': ['create', 'read', 'update', 'delete'],
        'leads': ['read', 'create'],
        'audit_logs': ['read']
    },
    'ADMIN': {
        'organization': ['read', 'update'],
        'users': ['create', 'read', 'update', 'invite'],
        'clients': ['create', 'read', 'update', 'delete'],
        'bookings': ['create', 'read', 'update', 'delete'],
        'minutes': ['create', 'read', 'update', 'delete'],
        'meeting_minutes': ['create', 'read', 'update', 'delete'],
        'voice_agents': ['read', 'update', 'configure'],
        'chatbots': ['read', 'update', 'train'],
        'workflows': ['create', 'read', 'update'],
        'campaigns': ['create', 'read', 'update'],
        'analytics': ['read'],
        'settings': ['read'],
        'integrations': ['read', 'update'],
        'leads': ['read'],
        'audit_logs': ['read']
    },
    'MANAGER': {
        'clients': ['create', 'read', 'update'],
        'bookings': ['create', 'read', 'update'],
        'minutes': ['create', 'read', 'update'],
        'meeting_minutes': ['create', 'read', 'update'],
        'voice_agents': ['read', 'configure'],
        'chatbots': ['read'],
        'analytics': ['read'],
        'campaigns': ['read'],
        'leads': ['read']
    },
    'MEMBER': {
        'clients': ['read', 'update'],
        'bookings': ['read', 'update'],
        'minutes': ['read'],
        'meeting_minutes': ['read'],
        'chatbots': ['read'],
        'leads': ['read']
    },
    'SUBSCRIBER': {
        'organization': ['read', 'update'],
        'clients': ['create', 'read', 'update', 'delete'],
        'bookings': ['create', 'read', 'update', 'delete'],
        'minutes': ['create', 'read', 'update', 'delete'],
        'meeting_minutes': ['create', 'read', 'update', 'delete'],
        'voice_agents': ['create', 'read', 'update', 'delete', 'configure'],
        'chatbots': ['create', 'read', 'update', 'delete', 'train'],
        'workflows': ['create', 'read', 'update', 'delete'],
        'campaigns': ['create', 'read', 'update', 'delete'],
        'analytics': ['read'],
        'subscriptions': ['read', 'update'],
        'settings': ['read', 'update'],
        'integrations': ['read', 'update'],
        'leads': ['read', 'create']
    }
};

async function verifyAndSeedPermissions() {
    console.log('🔍 Verifying and seeding permissions...\n');

    let createdCount = 0;
    let skippedCount = 0;

    for (const [roleName, resources] of Object.entries(REQUIRED_PERMISSIONS)) {
        console.log(`\n📋 Processing Role: ${roleName}`);
        
        // Ensure role exists
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
                description: `System role for ${roleName}`,
                isSystem: true
            }
        });

        console.log(`  ✓ Role exists: ${role.id}`);

        // Process permissions
        for (const [resource, actions] of Object.entries(resources)) {
            for (const action of actions) {
                try {
                    // Create or find permission
                    const permission = await prisma.permission.upsert({
                        where: {
                            resource_action: { resource, action }
                        },
                        update: {},
                        create: { resource, action, description: `${action} on ${resource}` }
                    });

                    // Link to role if not already linked
                    const existing = await prisma.role.findUnique({
                        where: { id: role.id },
                        include: { permissions: true }
                    });

                    const hasPermission = existing.permissions.some(p => p.id === permission.id);

                    if (!hasPermission) {
                        await prisma.role.update({
                            where: { id: role.id },
                            data: {
                                permissions: {
                                    connect: { id: permission.id }
                                }
                            }
                        });
                        console.log(`  ✅ Created: ${resource}:${action}`);
                        createdCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (err) {
                    console.error(`  ❌ Failed to process ${resource}:${action}:`, err.message);
                }
            }
        }
    }

    console.log(`\n\n✨ Permission Seeding Complete!`);
    console.log(`  ✅ Created: ${createdCount} permissions`);
    console.log(`  ⏭️  Skipped: ${skippedCount} existing permissions`);

    // Verify users have roles assigned
    console.log(`\n🔍 Verifying user roles...\n`);
    const users = await prisma.user.findMany({
        where: {
            definedRole: null,
            role: { not: null }
        },
        take: 5
    });

    if (users.length > 0) {
        console.log(`⚠️  Found ${users.length} users with legacy string roles (not assigned to DB Role):`);
        users.forEach(u => {
            console.log(`   - ${u.email} (role: ${u.role})`);
        });
        console.log(`\n💡 Tip: Run the role migration script to assign DB roles to these users.`);
    } else {
        console.log(`✅ All users have DB roles assigned`);
    }

    // Summary of all permissions
    console.log(`\n📊 Permission Summary by Role:\n`);
    for (const [roleName, resources] of Object.entries(REQUIRED_PERMISSIONS)) {
        let permCount = 0;
        for (const actions of Object.values(resources)) {
            permCount += actions.length;
        }
        console.log(`  ${roleName}: ${permCount} permissions across ${Object.keys(resources).length} resources`);
    }
}

verifyAndSeedPermissions()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
