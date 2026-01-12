const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const email = 'test@scriptishrx.com';
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log('User not found');
            return;
        }

        const tenant = await prisma.tenant.update({
            where: { id: user.tenantId },
            data: { plan: 'Advanced' }
        });

        console.log(`Updated tenant ${tenant.name} to plan: ${tenant.plan}`);

        // Also update subscription
        await prisma.subscription.update({
            where: { userId: user.id },
            data: { plan: 'Advanced' }
        });
        console.log('Updated subscription to Advanced');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
