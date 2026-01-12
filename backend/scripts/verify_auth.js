const { PrismaClient } = require('@prisma/client');
const axios = require('axios'); // Assuming axios is installed, otherwise will different method or install it
// If axios is not installed in backend, we can use fetch (Node 18+)

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api/auth';

const TARGET_EMAIL = 'admin@scriptishrx.com';
const TARGET_PASSWORD = 'Password123!';

async function verifyAuth() {
    console.log('🔍 Starting Auth Verification...\n');

    // 1. Check if user exists in DB
    console.log(`1️⃣  Checking database for user: ${TARGET_EMAIL}`);
    try {
        const user = await prisma.user.findUnique({
            where: { email: TARGET_EMAIL }
        });

        if (user) {
            console.log(`   ✅ User found in database! (ID: ${user.id})`);
            console.log(`      Tenant ID: ${user.tenantId}`);
            console.log(`      Role: ${user.role}`);
        } else {
            console.log(`   ❌ User NOT found in database.`);
            // Optional: Create it? For now just report.
        }
    } catch (e) {
        console.error('   ❌ Database connection failed:', e.message);
        return;
    }

    // 2. Test Login
    console.log(`\n2️⃣  Testing Login Endpoint with provided credentials...`);
    try {
        // We need to use dynamic import for node-fetch if axios isn't there, 
        // but let's assume standard fetch is available in Node 18+
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TARGET_EMAIL,
                password: TARGET_PASSWORD
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`   ✅ Login Successful!`);
            console.log(`      Token received: ${data.token ? 'Yes' : 'No'}`);
            console.log(`      User: ${data.user?.name} (${data.user?.email})`);
        } else {
            console.log(`   ❌ Login Failed. Status: ${response.status}`);
            console.log(`      Message: ${data.error || data.message}`);
        }
    } catch (e) {
        console.error(`   ❌ Login Request Failed: ${e.message}`);
        console.log('      (Ensure server is running on port 5000)');
    }

    // 3. Test Registration (Smoke Test)
    const testEmail = `test_reg_${Date.now()}@scriptishrx.com`;
    console.log(`\n3️⃣  Testing Registration Flow (Smoke Test)`);
    console.log(`   Attempting to register: ${testEmail}`);

    try {
        const regResponse = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: 'TestPassword123!',
                name: 'Auth Test User',
                companyName: 'Auth Test Corp'
            })
        });

        const regData = await regResponse.json();

        if (regResponse.ok) {
            console.log(`   ✅ Registration Successful!`);
            console.log(`      New User ID: ${regData.user?.id}`);

            // Clean up
            console.log(`   🧹 Cleaning up test user...`);
            await prisma.user.delete({ where: { email: testEmail } });
            // We might need to delete tenant too if it created one, but cascading might handle it 
            // or we leave it for now to avoid accidental deletion of shared stuff if logic differs.
            // Assuming 1-to-1 or cascade for now.
            if (regData.user?.tenantId) {
                // Try to delete tenant if it was just created for this user
                // This is a bit risky blindly, so I'll just delete the user for safety
            }
            console.log(`   ✅ Test user deleted.`);

        } else {
            console.log(`   ❌ Registration Failed. Status: ${regResponse.status}`);
            console.log(`      Message: ${regData.error || regData.message}`);
        }

    } catch (e) {
        console.error(`   ❌ Registration Request Failed: ${e.message}`);
    }

    console.log('\n🏁 Verification Complete.');
    process.exit(0);
}

verifyAuth();
