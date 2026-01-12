const axios = require('axios');

async function login() {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'test@scriptishrx.net',
            password: 'password123'
        });
        return { token: res.data.token, userId: res.data.user.id };
    } catch (e) {
        console.error('Login failed:', e.response?.data || e.message);
        process.exit(1);
    }
}

async function verifyPayments() {
    console.log('--- Verifying Payments (Paystack) ---');

    console.log('1. Logging in...');
    const { token } = await login();

    // 2. Initiate Transaction
    console.log('2. Initiating Checkout Session (Basic Plan)...');
    try {
        const res = await axios.post('http://localhost:5000/api/payments/create-session',
            { plan: 'Basic', cycle: 'monthly' },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.url && res.data.url.includes('paystack')) {
            console.log('✅ Checkout URL generated:', res.data.url);
            console.log('✅ Reference:', res.data.reference);
        } else {
            console.error('❌ Unexpected response:', res.data);
        }
    } catch (e) {
        if (e.response && e.response.status === 503) {
            console.log('⚠️ Paystack not configured (Expected in some test envs). Skipping.');
        } else {
            console.error('❌ Failed to create session:', e.response?.data || e.message);
        }
    }

    // 3. Test Portal Link (Management)
    console.log('3. getting Portal/Management Link...');
    try {
        const res = await axios.post('http://localhost:5000/api/payments/portal', {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Portal Link:', res.data.url);
    } catch (e) {
        console.error('❌ Failed to get portal link:', e.response?.data || e.message);
    }
}

verifyPayments();
