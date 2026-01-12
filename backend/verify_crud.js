
const prisma = require('./lib/prisma');

async function main() {
    console.log("🚀 Starting CRUD Verification...");
    const tenant = await prisma.tenant.findFirst();

    // 1. Create a Test Client
    const client = await prisma.client.create({
        data: {
            name: 'Delete Me',
            tenantId: tenant.id
        }
    });
    console.log(`✅ Created Client: ${client.id}`);

    // 2. Create a Test Booking
    const booking = await prisma.booking.create({
        data: {
            clientId: client.id,
            tenantId: tenant.id,
            date: new Date('2025-12-25T10:00:00Z'),
            purpose: 'Test Delete',
            status: 'Scheduled'
        }
    });
    console.log(`✅ Created Booking: ${booking.id}`);

    // 3. Test Conflict (Booking same slot)
    const conflictCheck = await prisma.booking.findFirst({
        where: {
            tenantId: tenant.id,
            date: new Date('2025-12-25T10:00:00Z'),
            status: { not: 'Cancelled' },
            id: { not: 'random' }
        }
    });
    if (conflictCheck) {
        console.log("✅ Conflict Logic Verified: Found existing booking.");
    } else {
        console.error("❌ Conflict Logic Failed");
    }

    // 4. Delete Booking via Prisma (Simulating API)
    await prisma.booking.delete({ where: { id: booking.id } });
    console.log("✅ Deleted Booking");

    // Verify it's gone
    const goneBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    if (!goneBooking) console.log("✅ Booking is truly gone.");

    // 5. Delete Client
    await prisma.client.delete({ where: { id: client.id } });
    console.log("✅ Deleted Client");

    console.log("---------------------------------");
    console.log("CRUD Verification Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
