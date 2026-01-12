const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Client Deletion (Cascade) ---');

    // 1. Create a dummy tenant, client, and booking
    const tenantId = 'test-tenant-del-' + Date.now();

    // We need a user to satisfy tenant relation if strict, but let's check schema
    // Tenant usually created via seed or just exists. Let's use an existing tenant ID from a known user or create one safely.
    // Actually, Tenant model is simple.
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Delete Test Tenant',
            plan: 'Basic'
        }
    });
    console.log(`✅ Created Tenant: ${tenant.id}`);

    const client = await prisma.client.create({
        data: {
            tenantId: tenant.id,
            name: 'Doomed Client',
            email: 'doomed@example.com'
        }
    });
    console.log(`✅ Created Client: ${client.id}`);

    const booking = await prisma.booking.create({
        data: {
            tenantId: tenant.id,
            clientId: client.id,
            date: new Date(),
            status: 'Scheduled'
        }
    });
    console.log(`✅ Created Booking: ${booking.id} linked to Client`);

    // 2. Attempt to delete Client
    try {
        await prisma.client.delete({
            where: { id: client.id }
        });
        console.log('✅ Client Deleted Successfully');
    } catch (e) {
        console.error('❌ Failed to delete client:', e.message);
        process.exit(1);
    }

    // 3. Verify Booking is gone
    const bookingCheck = await prisma.booking.findUnique({ where: { id: booking.id } });
    if (!bookingCheck) {
        console.log('✅ Cascade worked: Booking is also gone.');
    } else {
        console.error('❌ Error: Booking still exists!');
    }

    // Cleanup Tenant
    await prisma.tenant.delete({ where: { id: tenant.id } });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
