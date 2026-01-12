const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'test@scriptishrx.net';

    console.log(`--- Enforcing Roles ---`);
    console.log(`Target Admin: ${adminEmail}`);

    try {
        // 1. Promote/Ensure Admin
        const adminUser = await prisma.user.update({
            where: { email: adminEmail },
            data: { role: 'ADMIN' } // Or 'OWNER' if you prefer, but user asked for ADMIN
        });
        console.log(`✅ ${adminEmail} is now ${adminUser.role}`);

        // 2. Demote everyone else to SUBSCRIBER
        const result = await prisma.user.updateMany({
            where: {
                email: { not: adminEmail }
            },
            data: { role: 'SUBSCRIBER' }
        });
        console.log(`✅ Updated ${result.count} other users to SUBSCRIBER`);

    } catch (e) {
        console.error('❌ Error enforcing roles:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
