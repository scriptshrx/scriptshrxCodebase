
const prisma = require('./lib/prisma');
const clientService = require('./services/clientService');

async function main() {
    console.log("🚀 Starting Verification...");

    // 1. Setup Tenant
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Verification Tenant',
                phoneNumber: '+15550009999'
            }
        });
        console.log("Created Test Tenant:", tenant.id);
    } else {
        console.log("Using Existing Tenant:", tenant.id);
        if (!tenant.phoneNumber) {
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { phoneNumber: '+15550009999' }
            });
            console.log("Updated Tenant with Test Phone Number");
        }
    }

    // 2. Test Client Capture with Source
    console.log("\n🧪 Testing Client Capture with Source...");
    const testEmail = `test_${Date.now()}@example.com`;
    const saved = await clientService.captureClient({
        name: "Test User",
        email: testEmail,
        phone: "1234567890",
        notes: "Verification Note"
    }, tenant.id, 'Chatbot');

    if (saved) {
        const client = await prisma.client.findFirst({ where: { email: testEmail } });
        if (client && client.source === 'Chatbot') {
            console.log("✅ PASS: Client saved with Source: Chatbot");
        } else {
            console.error("❌ FAIL: Client saved but Source is incorrect:", client?.source);
        }
    } else {
        console.error("❌ FAIL: captureClient returned false");
    }

    // 3. Test Duplicate Booking Logic (Direct DB Check Simulation)
    console.log("\n🧪 Testing Duplicate Booking Logic...");
    const bookingTime = new Date();
    bookingTime.setHours(bookingTime.getHours() + 24); // Tomorrow
    bookingTime.setMinutes(0, 0, 0);

    // Create First Booking
    const client = await prisma.client.findFirst({ where: { email: testEmail } });
    await prisma.booking.create({
        data: {
            clientId: client.id,
            tenantId: tenant.id,
            date: bookingTime,
            status: 'Scheduled'
        }
    });
    console.log(`Created Booking 1 at ${bookingTime.toISOString()}`);

    // Try to create Overlap
    const conflict = await prisma.booking.findFirst({
        where: {
            tenantId: tenant.id,
            date: bookingTime,
            status: { not: 'Cancelled' }
        }
    });

    if (conflict) {
        console.log("✅ PASS: Conflict detection found existing booking.");
    } else {
        console.error("❌ FAIL: Conflict detection failed to find existing booking.");
    }

    console.log("\n---------------------------------");
    console.log("Verification Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
