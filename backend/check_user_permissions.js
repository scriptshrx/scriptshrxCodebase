#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔍 Checking user permissions...\n');

        // Get all users
        const users = await prisma.user.findMany({
            include: {
                definedRole: {
                    include: {
                        permissions: true
                    }
                },
                tenant: true
            }
        });

        if (users.length === 0) {
            console.log('❌ No users found in database');
            return;
        }

        for (const user of users) {
            console.log(`👤 User: ${user.email}`);
            console.log(`   Tenant: ${user.tenant?.name} (${user.tenantId})`);
            console.log(`   Role (legacy): ${user.role}`);
            console.log(`   Role ID: ${user.roleId}`);
            
            if (user.definedRole) {
                console.log(`   Role (RBAC): ${user.definedRole.name}`);
                console.log(`   Permissions (${user.definedRole.permissions.length}):`);
                user.definedRole.permissions.forEach(p => {
                    console.log(`     - ${p.resource}:${p.action}`);
                });
            } else {
                console.log(`   ⚠️  No RBAC role assigned`);
            }
            
            // Check for organization:update permission
            const hasOrgUpdate = user.definedRole?.permissions?.some(p => 
                p.resource === 'organization' && p.action === 'update'
            );
            
            if (hasOrgUpdate) {
                console.log(`   ✅ Has organization:update permission`);
            } else {
                console.log(`   ❌ MISSING organization:update permission`);
            }
            
            console.log('');
        }

        // Show available roles
        console.log('\n📋 Available Roles:\n');
        const roles = await prisma.role.findMany({
            include: { permissions: true }
        });

        for (const role of roles) {
            console.log(`${role.name}:`);
            role.permissions.forEach(p => {
                console.log(`  - ${p.resource}:${p.action}`);
            });
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
