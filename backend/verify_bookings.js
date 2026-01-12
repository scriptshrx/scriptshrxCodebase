const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios');

async function login() {
    try {
        const res = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'test@scriptishrx.net',
            password: 'password123'
        });
        return res.data.token;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function verifyBookings() {
    console.log('--- Verifying Bookings API (Refactored) ---');

    try {
        const token = await login();
        const api = axios.create({
            baseURL: 'http://localhost:3001/api/bookings',
            headers: { Authorization: `Bearer ${token}` }
        });

        // 1. Create Booking
        console.log('1. Creating Booking...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
            // Test Validation (Empty Body)
            await api.post('/', {});
        } catch (e) {
            console.log('   ✅ Validation Caught Empty Body:', e.response?.data?.error ? 'Yes' : 'No');
        }

        const createRes = await api.post('/', {
            clientId: '11111111-1111-1111-1111-111111111111', // Should exist from seed? No, seed IDs are random-ish UUIDs unless we forced them.
            // Wait, seed created clients with auto IDs. I need a valid Client ID.
            // I'll fetch clients first.
        });
        // Wait, I can't create without a valid clientID.

    } catch (e) {
        console.error('Setup failed:', e.message);
    }
}

// I need to fetch clients first to get an ID.
async function main() {
    const token = await login();

    // 1. Get Clients (Legacy route still works? Yes, I moved it but haven't refactored it yet)
    const clientsRes = await axios.get('http://localhost:3001/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const clientId = clientsRes.data[0].id;
    console.log('Using Client ID:', clientId);

    const api = axios.create({
        baseURL: 'http://localhost:3001/api/bookings',
        headers: { Authorization: `Bearer ${token}` }
    });

    // 2. Create
    console.log('2. Creating Booking...');
    const date = new Date();
    date.setDate(date.getDate() + 5);
    const newBooking = await api.post('/', {
        clientId,
        date: date.toISOString(),
        purpose: 'Validation Test',
        status: 'Scheduled'
    });
    console.log('   ✅ Created:', newBooking.data.id);

    // 3. Update
    console.log('3. Updating Booking...');
    const updateRes = await api.put(`/${newBooking.data.id}`, {
        status: 'Confirmed'
    });
    console.log('   ✅ Updated Status:', updateRes.data.status);

    // 4. Delete
    console.log('4. Deleting Booking...');
    await api.delete(`/${newBooking.data.id}`);
    console.log('   ✅ Deleted');

}

main().catch(console.error);
