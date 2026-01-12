
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

async function main() {
    // 1. Get a valid token for test@scriptishrx.net
    const user = await prisma.user.findUnique({ where: { email: 'test@scriptishrx.net' } });
    if (!user) {
        console.error("User not found via Prisma!");
        return;
    }
    const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    console.log("🔑 Generated Token for:", user.email);

    // 2. Call the API
    console.log("📡 Fetching http://localhost:3001/api/settings...");
    try {
        const res = await fetch('http://localhost:3001/api/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            console.log("✅ API Response Body:");
            console.log(JSON.stringify(data, null, 2));

            // Check specific fields expected by Frontend
            console.log("\n🧪 Verification:");
            console.log(`- data.name: "${data.name}" (Should be 'Test User')`);
            console.log(`- data.tenant.plan: "${data.tenant?.plan}"`);
            console.log(`- data.tenant.brandColor: "${data.tenant?.brandColor}"`);
        } else {
            console.error(`❌ API Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Response:", text);
        }
    } catch (err) {
        console.error("❌ Fetch Failed:", err.message);
    }
}

main().finally(() => prisma.$disconnect());
