async function main() {
    try {
        console.log('Attempting login via API...');
        const res = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@scriptishrx.net',
                password: 'password123'
            }),
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (e) {
        console.error('API Request failed:', e);
    }
}

main();
