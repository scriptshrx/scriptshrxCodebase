require('dotenv').config();
const voiceService = require('./src/services/voiceService');
const prisma = require('./src/lib/prisma');

async function testOutboundCall() {
    // 1. SET YOUR PHONE NUMBER HERE
    const YOUR_PHONE_NUMBER = '+2348177148582'; // <--- CHANGE THIS

    console.log('--- TEST OUTBOUND CALL ---');

    try {
        // Get a tenant to attribute the call to (using the first one found)
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            console.error('❌ No tenants found in database. Run the seed script first.');
            return;
        }

        console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);
        console.log(`Calling: ${YOUR_PHONE_NUMBER}...`);

        // Initiate Call
        const result = await voiceService.initiateOutboundCall(
            YOUR_PHONE_NUMBER,
            tenant.id,
            { script: 'Hello! This is a test call from your Scriptish Rx system. Your Twilio integration is working perfectly.' }
        );

        if (result.success) {
            console.log('✅ Call Initiated!');
            console.log(`   Call SID: ${result.callId}`);
            console.log('   Check your phone!');
        } else {
            console.error('❌ Call Failed:', result.error);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (process.argv[2]) {
    // If run with a number arg: node test_call.js +15550000000
    // We'd need to modify the script to accept args, but for safety lets guide them to edit it.
    console.log('Please edit the script to set your phone number safely.');
}

testOutboundCall();
