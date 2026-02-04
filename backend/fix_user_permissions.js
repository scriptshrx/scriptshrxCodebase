#!/usr/bin/env node
/**
 * Fix User Permissions Script
 * Elevates a user to OWNER role so they can update organization info
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔧 Fixing user permissions...\n');

        // Find the OWNER role
        const ownerRole = await prisma.role.findUnique({
            where: { name: 'OWNER' }
        });

        if (!ownerRole) {
            console.error('❌ OWNER role not found. Make sure prisma/seed.js has been run.');
            return;
        }

        console.log(`✅ Found OWNER role: ${ownerRole.id}\n`);

        // Get all users
        const users = await prisma.user.findMany({
            include: {
                definedRole: true,
                tenant: true
            }
        });

        if (users.length === 0) {
            console.log('❌ No users found');
            return;
        }

        console.log(`Found ${users.length} user(s):\n`);

        for (const user of users) {
            console.log(`👤 ${user.email}`);
            console.log(`   Current role: ${user.definedRole?.name || user.role}`);
            console.log(`   Tenant: ${user.tenant?.name}`);

            // Check if already OWNER
            if (user.definedRole?.name === 'OWNER') {
                console.log(`   ✅ Already OWNER - no change needed\n`);
                continue;
            }

            // Update to OWNER
            const updated = await prisma.user.update({
                where: { id: user.id },
                data: {
                    roleId: ownerRole.id,
                    role: 'OWNER' // Also update legacy field for compatibility
                },
                include: {
                    definedRole: {
                        include: {
                            permissions: true
                        }
                    }
                }
            });

            console.log(`   ✅ Updated to OWNER role`);
            console.log(`   Permissions granted:`);
            updated.definedRole?.permissions?.slice(0, 5).forEach(p => {
                console.log(`     - ${p.resource}:${p.action}`);
            });
            if ((updated.definedRole?.permissions?.length || 0) > 5) {
                console.log(`     ... and ${updated.definedRole.permissions.length - 5} more`);
            }
            console.log('');
        }

        console.log('✨ All users have been updated to OWNER role!');
        console.log('You should now be able to save chatbot configuration.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nMake sure:');
        console.error('1. Database is running');
        console.error('2. Roles have been seeded (run: npm run seed)');
    } finally {
        await prisma.$disconnect();
    }
}

main();
