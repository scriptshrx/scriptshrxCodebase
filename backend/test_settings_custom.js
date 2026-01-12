// Native fetch in Node 18+

async function main() {
    const ports = [5000, 3001, 3000, 8080];
    let PORT;
    let BASE_URL;

    for (const p of ports) {
        try {
            const res = await fetch(`http://localhost:${p}/api/health`);
            if (res.ok) {
                PORT = p;
                BASE_URL = `http://localhost:${p}/api`;
                console.log(`Found server on port ${PORT}`);
                break;
            }
        } catch (e) { }
    }

    if (!PORT) {
        console.error('Could not find running server on common ports.');
        return;
    }

    try {
        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'debug@scriptishrx.com',
                password: 'Debug123!'
            })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', loginRes.status, await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Token obtained.');
        console.log('Token:', token);

        console.log('Fetching settings...');
        const settingsRes = await fetch(`${BASE_URL}/settings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Settings Status:', settingsRes.status);
        const text = await settingsRes.text();
        console.log('Settings Response:', text);

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
