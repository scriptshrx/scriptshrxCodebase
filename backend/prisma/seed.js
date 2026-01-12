const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PERMISSIONS = {
    'SUPER_ADMIN': {
        'platform': ['*'],
        'organizations': ['create', 'read', 'update', 'delete', 'suspend'],
        'users': ['create', 'read', 'update', 'delete'],
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
        'voice_agents': ['create', 'read', 'update', 'delete', 'configure'],
        'chatbots': ['create', 'read', 'update', 'delete', 'train'],
        'workflows': ['create', 'read', 'update', 'delete'],
        'campaigns': ['create', 'read', 'update', 'delete'],
        'analytics': ['read'],
        'subscriptions': ['read', 'update'],
        'settings': ['read', 'update'],
        'integrations': ['create', 'read', 'update', 'delete']
    },
    'SUBSCRIBER': {
        'organization': ['read', 'update'],
        'clients': ['create', 'read', 'update', 'delete'],
        'bookings': ['create', 'read', 'update', 'delete'],
        'minutes': ['create', 'read', 'update', 'delete'],
        'voice_agents': ['create', 'read', 'update', 'delete', 'configure'],
        'chatbots': ['create', 'read', 'update', 'delete', 'train'],
        'workflows': ['create', 'read', 'update', 'delete'],
        'campaigns': ['create', 'read', 'update', 'delete'],
        'analytics': ['read'],
        'subscriptions': ['read', 'update'],
        'settings': ['read', 'update'],
        'integrations': ['read', 'update']
    },
    'ADMIN': {
        'organization': ['read', 'update'],
        'users': ['create', 'read', 'update', 'invite'],
        'clients': ['create', 'read', 'update', 'delete'],
        'bookings': ['create', 'read', 'update', 'delete'],
        'minutes': ['create', 'read', 'update', 'delete'],
        'voice_agents': ['read', 'update', 'configure'],
        'chatbots': ['read', 'update', 'train'],
        'workflows': ['create', 'read', 'update'],
        'campaigns': ['create', 'read', 'update'],
        'analytics': ['read'],
        'settings': ['read'],
        'integrations': ['read', 'update']
    },
    'MANAGER': {
        'clients': ['create', 'read', 'update'],
        'bookings': ['create', 'read', 'update'],
        'minutes': ['create', 'read', 'update'],
        'voice_agents': ['read', 'configure'],
        'chatbots': ['read'],
        'analytics': ['read'],
        'campaigns': ['read']
    },
    'MEMBER': {
        'clients': ['read', 'update'],
        'bookings': ['read', 'update'],
        'minutes': ['read'],
        'chatbots': ['read']
    }
};

async function main() {
    console.log('🌱 Seeding RBAC Roles and Permissions...');

    for (const [roleName, resources] of Object.entries(PERMISSIONS)) {
        console.log(`Processing Role: ${roleName}`);

        // 1. Create or Update Role
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
                description: `System role for ${roleName}`,
                isSystem: true
            }
        });

        // 2. Create Permissions and Assign to Role
        for (const [resource, actions] of Object.entries(resources)) {
            for (const action of actions) {
                // Find or Create Permission
                const permission = await prisma.permission.upsert({
                    where: {
                        resource_action: { resource, action }
                    },
                    update: {},
                    create: { resource, action }
                });

                // Link Permission to Role (if not already linked)
                // Note: Prisma many-to-many connect is idempotent-ish inside update/create but here we separate
                // To be safe, we explicitly connect
                await prisma.role.update({
                    where: { id: role.id },
                    data: {
                        permissions: {
                            connect: { id: permission.id }
                        }
                    }
                });
            }
        }
    }

    console.log('✅ RBAC Seeding Completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
