
const prisma = require('./lib/prisma');

async function main() {
    const email = 'test@scriptishrx.net';
    console.log(`🔍 Checking data for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true }
    });

    if (!user) {
        console.error("❌ User not found!");
        return;
    }

    console.log(`✅ User Found: ${user.name} (${user.role})`);
    console.log(`   Tenant: ${user.tenant.name} (ID: ${user.tenantId})`);
    console.log(`   Avatar: ${user.avatarUrl}`);

    // Check Data for this Tenant
    const clients = await prisma.client.count({ where: { tenantId: user.tenantId } });
    const bookings = await prisma.booking.count({ where: { tenantId: user.tenantId } });

    console.log(`📊 Data for Tenant ${user.tenantId}:`);
    console.log(`   Clients: ${clients}`);
    console.log(`   Bookings: ${bookings}`);

    if (clients === 0 && bookings === 0) {
        console.log("⚠️  This user sees an EMPTY dashboard because their Tenant has no data.");

        // OPTIONAL: Create dummy data for them
        console.log("🛠  Creating dummy data for this user...");
        const newClient = await prisma.client.create({
            data: {
                name: 'Test Client For User',
                email: 'client@test.com',
                tenantId: user.tenantId
            }
        });
        await prisma.booking.create({
            data: {
                clientId: newClient.id,
                tenantId: user.tenantId,
                date: new Date(),
                purpose: 'Demo Meeting',
                status: 'Scheduled'
            }
        });
        console.log("✅ Dummy Client and Booking created. Dashboard should now show data.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
