// Node 18+ has native fetch


async function main() {
    console.log('--- Testing New Auth API ---');
    try {
        // 1. Test Login with invalid credentials
        console.log('1. Testing Invalid Login...');
        const resInvalid = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'wrong@example.com', password: 'wrong' })
        });
        console.log(`   Status: ${resInvalid.status} (Expected: 401)`);

        // 2. Test Login with valid credentials (from previous "test user" knowledge)
        // If the DB is the same, this should work.
        console.log('2. Testing Valid Login...');
        const resValid = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@scriptishrx.net', password: 'password123' })
        });

        if (resValid.status === 200) {
            const data = await resValid.json();
            console.log('   Login Successful!');
            console.log(`   Token received: ${!!data.token}`);
            console.log(`   User Role: ${data.user.role}`);
        } else {
            console.error(`   Login Failed: ${resValid.status}`);
            const err = await resValid.text();
            console.error(`   Error: ${err}`);
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

main();
