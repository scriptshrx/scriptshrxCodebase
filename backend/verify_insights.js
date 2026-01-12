// Native fetch (Node 18+)

// Test User Credentials
const email = 'test@scriptishrx.com';
const password = 'password123';

async function verifyInsights() {
    console.log('--- Verifying Real Insights API ---');

    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!loginRes.ok) {
        console.error('Login Failed:', await loginRes.text());
        return;
    }
    const { token } = await loginRes.json();
    console.log('Login Successful.');

    // 2. Fetch Insights
    console.log('\n2. Fetching Insights...');
    const res = await fetch('http://localhost:3001/api/insights', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        console.error('Insights Fetch Failed:', await res.text());
        return;
    }

    const data = await res.json();

    // 3. Validate Structure
    console.log('\n3. Validating Data Structure...');
    console.log('Metrics:', data.metrics);
    console.log('Revenue Chart Items:', data.revenueChart?.length);
    console.log('Behavior Chart Items:', data.behaviorChart?.length);
    console.log('AI Recommendation:', data.aiRecommendation);

    if (data.metrics && data.revenueChart && data.behaviorChart && data.aiRecommendation) {
        console.log('\n✅ Verification PASSED: Real Insights API is functional.');
    } else {
        console.error('\n❌ Verification FAILED: Missing data fields.');
    }
}

verifyInsights();
