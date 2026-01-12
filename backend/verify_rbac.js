const axios = require('axios');

async function login(email, password) {
    try {
        const res = await axios.post('http://localhost:3001/api/auth/login', { email, password });
        return { token: res.data.token, user: res.data.user };
    } catch (e) {
        console.error(`Login failed for ${email}:`, e.response?.data || e.message);
        return null;
    }
}

async function verifyRBAC() {
    console.log('--- Verifying RBAC & Multi-User Support ---');

    // 1. Login as Admin/Owner
    console.log('1. Logging in as Admin (test@scriptishrx.net)...');
    const adminAuth = await login('test@scriptishrx.net', 'password123');
    if (!adminAuth) process.exit(1);
    console.log(`   ✅ Logged in as ${adminAuth.user.role}`);

    const api = axios.create({ baseURL: 'http://localhost:3001/api' });

    // 2. Add Subscriber
    console.log('2. Creating Subscriber User...');
    const subEmail = `sub_${Date.now()}@scriptishrx.net`;
    let subToken = null;

    try {
        const res = await api.post('/users', {
            email: subEmail,
            password: 'password123',
            name: 'Demo Subscriber',
            role: 'SUBSCRIBER'
        }, { headers: { Authorization: `Bearer ${adminAuth.token}` } });
        console.log('   ✅ Subscriber created:', res.data.email);

        // 3. Login as Subscriber
        console.log('3. Logging in as Subscriber...');
        const subAuth = await login(subEmail, 'password123');
        if (subAuth) {
            subToken = subAuth.token;
            console.log(`   ✅ Logged in as ${subAuth.user.role}`);
        }

    } catch (e) {
        console.error('   ❌ Failed to create subscriber:', {
            status: e.response?.status,
            statusText: e.response?.statusText,
            data: e.response?.data
        });
    }

    if (subToken) {
        // 4. Subscriber tries to create user (Should Fail)
        console.log('4. Testing Access Control (Subscriber adding user)...');
        try {
            await api.post('/users', {
                email: 'fail@test.com',
                password: 'password123',
                name: 'Fail User',
                role: 'SUBSCRIBER'
            }, { headers: { Authorization: `Bearer ${subToken}` } });
            console.error('   ❌ Subscriber WAS permitted to add user (Security Failure)');
        } catch (e) {
            if (e.response?.status === 403) {
                console.log('   ✅ Access Denied (Correct Behavior)');
            } else {
                console.error('   ❌ Unexpected error:', e.message);
            }
        }
    }
}

verifyRBAC();
