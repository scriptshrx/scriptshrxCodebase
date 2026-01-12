const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    console.log('🌱 Creating Default Tenant and Admin User...');

    // 1. Create Default Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'ScriptishRx HQ',
            plan: 'Enterprise',
            aiName: 'Scriptish Assistant',
            aiConfig: {
                model: 'gpt-4o',
                voice: 'alloy',
                systemPrompt: 'You are a helpful assistant for ScriptishRx.'
            }
        }
    });

    console.log(`✅ Tenant Created: ${tenant.name} (${tenant.id})`);

    // 2. Find SUPER_ADMIN Role
    const role = await prisma.role.findUnique({
        where: { name: 'SUPER_ADMIN' }
    });

    if (!role) {
        throw new Error('SUPER_ADMIN role not found. Run prisma/seed.js first.');
    }

    // 3. Create Admin User
    const email = 'admin@scriptishrx.net';
    const password = 'Password123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name: 'System Admin',
            role: 'SUPER_ADMIN', // Legacy string field
            roleId: role.id,     // Relation to Role table (Critical fix)
            tenantId: tenant.id
        }
    });

    console.log(`✅ Admin User Created:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
