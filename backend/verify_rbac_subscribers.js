// backend/verify_rbac_subscribers.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5000/api';

async function generateToken(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`User ${email} not found`);
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        process.env.JWT_SECRET || 'dev_secret_123',
        { expiresIn: '1h' }
    );
}

async function verify() {
    console.log('🛡️ Verifying RBAC & Subscriber Management...\n');

    // 1. Setup Tokens
    const superAdminToken = await generateToken('test@scriptishrx.net');
    const adminToken = await generateToken('admin@scriptishrx.net');

    // 2. Test 1: SUPER_ADMIN accessing Summary (Should Succeed)
    console.log('🔹 Test 1: Superadmin accessing /admin/subscribers/summary');
    try {
        const res = await axios.get(`${API_URL}/admin/subscribers/summary`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        console.log('✅ Success! Data:', JSON.stringify(res.data.data, null, 2));
    } catch (err) {
        console.error('❌ Failed:', err.response?.data || err.message);
    }

    // 3. Test 2: ADMIN accessing Summary (Should Fail)
    console.log('\n🔹 Test 2: Admin accessing /admin/subscribers/summary');
    try {
        await axios.get(`${API_URL}/admin/subscribers/summary`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.error('❌ FAILED: Admin was able to access restricted endpoint!');
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log('✅ Success! Access Denied (403 Forbidden) as expected.');
        } else {
            console.error('❌ Unexpected Error:', err.message);
        }
    }

    console.log('\n✨ Verification Complete.');
}

verify().catch(console.error).finally(() => prisma.$disconnect());
