const prisma = require('../src/lib/prisma');

async function main() {
    const plans = [
        {
            name: 'Startup',
            price: 99.99,
            maxBookingsPerMonth: 50,
            features: ['voice_agent', 'basic_analytics']
        },
        {
            name: 'Growth',
            price: 149.99,
            maxBookingsPerMonth: null, // Unlimited
            features: ['voice_agent', 'basic_analytics', 'advanced_analytics', 'unlimited_clients']
        },
        {
            name: 'Enterprise',
            price: 249.99,
            maxBookingsPerMonth: null, // Unlimited
            features: ['voice_agent', 'basic_analytics', 'advanced_analytics', 'unlimited_clients', 'white_label', 'soc2_logging']
        }
    ];

    for (const plan of plans) {
        await prisma.subscriptionPlan.upsert({
            where: { name: plan.name },
            update: plan,
            create: plan
        });
        console.log(`Upserted plan: ${plan.name}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
