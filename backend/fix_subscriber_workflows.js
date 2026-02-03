#!/usr/bin/env node
/**
 * Fix script: Grant workflows:create permission to SUBSCRIBER role
 * 
 * Usage: node fix_subscriber_workflows.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSubscriberWorkflowsPermission() {
    try {
        console.log('🔧 Fixing SUBSCRIBER workflows permissions...\n');

        // 1. Ensure SUBSCRIBER role exists
        let subscriberRole = await prisma.role.findUnique({
            where: { name: 'SUBSCRIBER' }
        });

        if (!subscriberRole) {
            console.log('📌 SUBSCRIBER role not found, creating it...');
            subscriberRole = await prisma.role.create({
                data: {
                    name: 'SUBSCRIBER',
                    description: 'Individual subscriber with full access to their own organization'
                }
            });
            console.log('✅ SUBSCRIBER role created:', subscriberRole.id);
        } else {
            console.log('✅ SUBSCRIBER role found:', subscriberRole.id);
        }

        // 2. Check if workflows:create permission exists
        const existingPerm = await prisma.permission.findFirst({
            where: {
                roleId: subscriberRole.id,
                resource: 'workflows',
                action: 'create'
            }
        });

        if (existingPerm) {
            console.log('✅ workflows:create permission already exists for SUBSCRIBER');
        } else {
            console.log('📌 workflows:create permission not found, creating it...');
            const newPerm = await prisma.permission.create({
                data: {
                    roleId: subscriberRole.id,
                    resource: 'workflows',
                    action: 'create'
                }
            });
            console.log('✅ workflows:create permission created:', newPerm.id);
        }

        // 3. Verify all workflows permissions for SUBSCRIBER
        const allWorkflowPerms = await prisma.permission.findMany({
            where: {
                roleId: subscriberRole.id,
                resource: 'workflows'
            }
        });

        console.log('\n📋 SUBSCRIBER workflows permissions:');
        allWorkflowPerms.forEach(p => {
            console.log(`   ✓ workflows:${p.action}`);
        });

        if (allWorkflowPerms.length === 0) {
            console.log('   ⚠️  No workflows permissions found!');
        }

        console.log('\n✨ Fix completed successfully!');
        console.log('Try creating a workflow now. If it still fails, check:');
        console.log('  1. Your user is actually assigned the SUBSCRIBER role (check definedRole in User table)');
        console.log('  2. The token includes the correct role: decode JWT from localStorage and check payload.role');
        console.log('  3. Your token is freshly issued after this fix was applied');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'P1001') {
            console.error('\n⚠️  Cannot connect to database. Make sure:');
            console.error('  - DATABASE_URL or DIRECT_URL is set in .env');
            console.error('  - Your Supabase database is running');
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

fixSubscriberWorkflowsPermission();
