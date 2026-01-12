const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log('Cleaning up stuck "LIVE" calls...');

    // Find calls that are 'in_progress' (or 'live' if that's the enum) but started more than 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check your schema status enum if needed, usually it's 'in_progress' or 'live' based on previous code
    // Based on voiceService.js, it uses 'in_progress'

    const result = await prisma.callSession.updateMany({
        where: {
            status: 'in_progress',
            startedAt: {
                lt: oneHourAgo
            }
        },
        data: {
            status: 'completed', // or 'failed'
            endedAt: new Date()
        }
    });

    console.log(`Updated ${result.count} stuck calls to 'completed'.`);
}

cleanup()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
