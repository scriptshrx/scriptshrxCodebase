const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
    try {
        const users = await prisma.user.findMany({
            include: { subscription: true }
        });
        console.log('Users found:', users.length);
        users.forEach(u => {
            console.log(`User: ${u.email}, ID: ${u.id}, StripeID: '${u.stripeCustomerId}', Avatar: '${u.avatarUrl}'`);
            console.log(`Subscription:`, u.subscription); // Assuming subscription relation is loaded if we included it
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
