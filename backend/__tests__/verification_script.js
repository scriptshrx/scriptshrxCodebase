const axios = require('axios');
const { z } = require('zod');

const API_URL = 'http://localhost:5000/api';
const TEST_EMAIL = `test_staff_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

// --- Colors for Output ---
const green = (msg) => console.log(`\x1b[32m${msg}\x1b[0m`);
const red = (msg) => console.log(`\x1b[31m${msg}\x1b[0m`);
const bold = (msg) => console.log(`\x1b[1m${msg}\x1b[0m`);

async function runVerification() {
    bold('\n🚀 STARTING STAFF+ SYSTEM VERIFICATION\n');
    let token = '';
    let userId = '';
    let clientId = '';
    let bookingId = '';

    try {
        // 1. REGISTER
        bold('1️⃣  Testing Registration...');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            name: 'Staff Engineer',
            companyName: 'Staff Corp',
            location: 'US/Pacific',
            timezone: 'America/Los_Angeles'
        });
        if (regRes.status === 201 && regRes.data.token) {
            token = regRes.data.token;
            userId = regRes.data.user.id;
            green('  ✅ Registration successful');
        } else {
            throw new Error('Registration failed');
        }

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 2. LOGIN (Verification)
        bold('2️⃣  Testing Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        if (loginRes.status === 200) {
            green('  ✅ Login successful');
        }

        // 3. CREATE CLIENT
        bold('3️⃣  Testing Client Creation...');
        const clientRes = await axios.post(`${API_URL}/clients`, {
            name: 'Test Client',
            email: 'client@test.com',
            phone: '555-0100',
            notes: 'Created by verification script'
        }, authHeader);
        if (clientRes.status === 201) {
            console.log('Client Response:', JSON.stringify(clientRes.data, null, 2));
            clientId = clientRes.data.id || clientRes.data.client?.id;
            if (!clientId) throw new Error('Client ID not found in response');
            green(`  ✅ Client created (ID: ${clientId})`);
        }

        // 4. CREATE BOOKING
        bold('4️⃣  Testing Booking Creation...');
        const bookingRes = await axios.post(`${API_URL}/bookings`, {
            clientId: clientId,
            date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            purpose: 'Verification Meeting'
        }, authHeader);
        if (bookingRes.status === 201) {
            console.log('Booking Response:', JSON.stringify(bookingRes.data, null, 2));
            bookingId = bookingRes.data.id || bookingRes.data.booking?.id;
            green(`  ✅ Booking created (ID: ${bookingId})`);
        }

        // 5. DATA PERMANENCE (READ)
        bold('5️⃣  Verifying Data Persistence...');
        const bookingsList = await axios.get(`${API_URL}/bookings`, authHeader);
        const savedBooking = bookingsList.data.bookings.find(b => b.id === bookingId);
        if (savedBooking && savedBooking.client.id === clientId) {
            green('  ✅ Data persistent and linked correctly');
        } else {
            throw new Error('Saved booking not found or malformed');
        }

        bold('\n✨ VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL ✨');

    } catch (error) {
        red(`\n❌ VERIFICATION FAILED`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            console.error('No response received (Connection refused or timeout)');
            console.error(error.message);
        } else {
            console.error('Error Message:', error.message);
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

runVerification();
