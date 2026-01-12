const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

async function main() {
    const email = 'debug@scriptishrx.net';
    const password = 'Debug123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure Role exists
    let role = await prisma.role.findUnique({ where: { name: 'OWNER' } });
    if (!role) {
        console.log('Creating OWNER role...');
        role = await prisma.role.create({
            data: { name: 'OWNER', description: 'Debug Owner' }
        });
    }

    // Ensure Tenant exists
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.log('Creating Tenant...');
        tenant = await prisma.tenant.create({
            data: { name: 'Debug Tenant' }
        });
    }

    console.log('Upserting user...');
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'OWNER',
            roleId: role.id,
            tenantId: tenant.id
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Debug User',
            role: 'OWNER',
            roleId: role.id,
            tenantId: tenant.id
        }
    });

    // Ensure Subscription (optional but good for testing settings)
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub) {
        await prisma.subscription.create({
            data: {
                userId: user.id,
                plan: 'Advanced',
                status: 'Active'
            }
        });
    }

    console.log('Debug user created:', email);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
