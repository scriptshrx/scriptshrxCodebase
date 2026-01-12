
const prisma = require('./backend/src/lib/prisma');

async function main() {
    try {
        const users = await prisma.user.findMany({
            include: {
                subscription: true,
                tenant: true
            }
        });

        console.log(`Found ${users.length} users:`);
        const now = new Date();

        users.forEach(u => {
            const ageMs = now - new Date(u.createdAt);
            const ageDays = ageMs / (1000 * 60 * 60 * 24);

            console.log(`\nUser: ${u.email} (ID: ${u.id})`);
            console.log(`  Role: ${u.role}`);
            console.log(`  Created: ${u.createdAt} (${ageDays.toFixed(1)} days ago)`);
            console.log(`  Subscription: ${u.subscription ? u.subscription.status + ' (' + u.subscription.plan + ')' : 'NONE'}`);

            if (!u.subscription) {
                if (ageDays <= 14) {
                    console.log(`  -> Should have IMPLIED TRIAL access.`);
                } else {
                    console.log(`  -> EXPIRED implicit trial.`);
                }
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
