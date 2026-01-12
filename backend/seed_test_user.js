const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'test@scriptishrx.net';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = await prisma.tenant.create({
        data: {
            name: 'Demo Clinic',
            plan: 'Advanced',
        },
    });

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            tenantId: tenant.id
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Test Doctor',
            role: 'OWNER',
            tenantId: tenant.id
        },
    });

    console.log({ user });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
