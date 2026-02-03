const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Fixing Workflow Permissions for SUBSCRIBER Role...\n');

    try {
        // 1. Ensure SUBSCRIBER role exists
        const subscriberRole = await prisma.role.upsert({
            where: { name: 'SUBSCRIBER' },
            update: {},
            create: {
                name: 'SUBSCRIBER',
                description: 'Individual subscriber with full access to their own organization'
            }
        });
        console.log('✅ SUBSCRIBER role exists:', subscriberRole.id);

        // 2. Create all workflow permissions
        const actions = ['create', 'read', 'update', 'delete'];
        const createdPermissions = [];

        for (const action of actions) {
            const permission = await prisma.permission.upsert({
                where: {
                    resource_action: {
                        resource: 'workflows',
                        action: action
                    }
                },
                update: {},
                create: {
                    resource: 'workflows',
                    action: action
                }
            });
            createdPermissions.push(permission);
            console.log(`✅ Permission created: workflows:${action} (${permission.id})`);
        }

        // 3. Link all workflow permissions to SUBSCRIBER role
        for (const permission of createdPermissions) {
            try {
                await prisma._permissionToRole.create({
                    data: {
                        A: permission.id,
                        B: subscriberRole.id
                    }
                });
                console.log(`✅ Linked: ${permission.resource}:${permission.action} → SUBSCRIBER`);
            } catch (e) {
                if (e.code === 'P2002') {
                    console.log(`⚠️  Already linked: ${permission.resource}:${permission.action} → SUBSCRIBER`);
                } else {
                    throw e;
                }
            }
        }

        // 4. Verify all workflow permissions are linked
        const verifyQuery = await prisma.role.findUnique({
            where: { id: subscriberRole.id },
            include: {
                permissions: {
                    where: { resource: 'workflows' }
                }
            }
        });

        console.log('\n📋 Verification Results:');
        console.log(`SUBSCRIBER Role has ${verifyQuery.permissions.length} workflow permissions:`);
        verifyQuery.permissions.forEach(p => {
            console.log(`   - ${p.resource}:${p.action}`);
        });

        if (verifyQuery.permissions.length === 4) {
            console.log('\n✨ SUCCESS! All workflow permissions are now granted to SUBSCRIBER role.');
        } else {
            console.error(`\n❌ ERROR: Expected 4 permissions, but found ${verifyQuery.permissions.length}`);
        }

    } catch (error) {
        console.error('\n❌ Error fixing permissions:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
