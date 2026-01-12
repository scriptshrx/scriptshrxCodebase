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

async function verify() {
    console.log('--- Verifying Notification Triggers ---');
    const token = await login();
    const api = axios.create({
        baseURL: 'http://localhost:3001/api',
        headers: { Authorization: `Bearer ${token}` }
    });

    try {
        // 1. Create Client with Contact Info
        console.log('1. Creating Client...');
        const clientRes = await api.post('/clients', {
            name: 'Notify Test User',
            email: 'notify@test.com',
            phone: '+15550001234'
        });
        const clientId = clientRes.data.id;
        console.log('   ✅ Client Created:', clientId);

        // 2. Create Booking (Should trigger Confirmation Email/SMS)
        console.log('2. Creating Booking...');
        const bookingRes = await api.post('/bookings', {
            clientId,
            date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            purpose: 'Notification Check',
            status: 'Scheduled'
        });
        const bookingId = bookingRes.data.id;
        console.log('   ✅ Booking Created:', bookingId);
        console.log('   (Check server logs for [MOCK EMAIL] Confirmation)');

        // 3. Update Booking Status (Should trigger Update Email/SMS)
        console.log('3. Updating Booking Status to Confirmed...');
        await api.put(`/bookings/${bookingId}`, {
            status: 'Confirmed'
        });
        console.log('   ✅ Booking Updated');
        console.log('   (Check server logs for [MOCK EMAIL] Status Update)');

    } catch (e) {
        console.error('❌ Verification Failed:', e.response?.data || e.message);
    }
}

verify();
