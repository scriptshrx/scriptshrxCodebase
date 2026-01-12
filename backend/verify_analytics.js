
const prisma = require('./lib/prisma');

async function main() {
    console.log("🚀 Starting Analytics Logic Verification...");
    const tenant = await prisma.tenant.findFirst();

    // 1. Create Dummy Messages (Voice vs Chat)
    await prisma.message.create({
        data: {
            sessionId: 'voice-msg-1',
            role: 'system',
            content: 'Voice Call: User asked for pricing',
            tenantId: tenant.id
        }
    });

    await prisma.message.create({
        data: {
            sessionId: 'chat-msg-1',
            role: 'user',
            content: 'How much does it cost?',
            tenantId: tenant.id
        }
    });

    // 2. Query Stats Logic (simulating what the API does)
    const voiceStats = await prisma.message.count({
        where: {
            tenantId: tenant.id,
            content: { startsWith: 'Voice Call:' }
        }
    });

    const chatStats = await prisma.message.count({
        where: {
            tenantId: tenant.id,
            role: 'user',
            NOT: { content: { startsWith: 'Voice Call:' } }
        }
    });

    console.log(`📊 Voice Stats: ${voiceStats} (Expected >= 1)`);
    console.log(`📊 Chat Stats: ${chatStats} (Expected >= 1)`);

    if (voiceStats >= 1 && chatStats >= 1) {
        console.log("✅ Analytics Logic Verified");
    } else {
        console.error("❌ Analytics Logic Failed");
    }

    console.log("---------------------------------");
    console.log("Analytics Verification Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
