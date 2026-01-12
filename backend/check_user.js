const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'test@scriptishrx.com' },
            include: { tenant: true }
        });

        if (user) {
            console.log('User found:', {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenant: user.tenant,
                passwordHash: user.password.substring(0, 10) + '...'
            });
        } else {
            console.log('User NOT found: test@scriptishrx.com');
        }

        const tenants = await prisma.tenant.findMany();
        console.log('Tenants found:', tenants.length);
        if (tenants.length > 0) {
            console.log('First tenant:', tenants[0]);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
