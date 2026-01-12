const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Roles and Admin Users...');

    // 1. Upsert Superadmin
    const superAdminEmail = 'test@scriptishrx.net';
    const superAdminPassword = await bcrypt.hash('password123', 10);

    // We need to ensure we have a Tenant for them. Assuming default or creating one.
    const defaultTenant = await prisma.tenant.upsert({
        where: { phoneNumber: '0000000000' }, // Dummy unique
        update: {},
        create: {
            name: 'System Tenant',
            phoneNumber: '0000000000',
            plan: 'Enterprise'
        }
    });

    const superAdmin = await prisma.user.upsert({
        where: { email: superAdminEmail },
        update: {
            role: 'SUPER_ADMIN',
            tenantId: defaultTenant.id
        },
        create: {
            email: superAdminEmail,
            name: 'Super Admin',
            password: superAdminPassword,
            role: 'SUPER_ADMIN',
            tenantId: defaultTenant.id
        },
    });
    console.log(`✅ Superadmin Configured: ${superAdmin.email}`);

    // 2. Upsert Admin
    const adminEmail = 'admin@scriptishrx.net';
    const adminPassword = await bcrypt.hash('Password123!', 10);

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            role: 'ADMIN',
            tenantId: defaultTenant.id
        },
        create: {
            email: adminEmail,
            name: 'Admin User',
            password: adminPassword,
            role: 'ADMIN',
            tenantId: defaultTenant.id
        },
    });
    console.log(`✅ Admin Configured: ${admin.email}`);

    // 3. Ensure some dummy subscriptions exist for counting if needed, 
    // but for now we just want to ensure the users exist.
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
