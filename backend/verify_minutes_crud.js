// Native fetch is available in Node 18+

// Test User Credentials (from previous sessions)
const email = 'test@scriptishrx.net';
const password = 'password123';

async function verifyMinutesCRUD() {
    console.log('--- Verifying Meeting Minutes CRUD ---');

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
    console.log('Login Successful. Token received.');

    // 2. Get a Client ID (needed to create a minute)
    console.log('\n2. Fetching Clients...');
    const clientsRes = await fetch('http://localhost:3001/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const clients = await clientsRes.json();
    if (clients.length === 0) {
        console.error('No clients found. Please run verify_crud.js first to create a client.');
        return;
    }
    const clientId = clients[0].id;
    console.log(`Using Client ID: ${clientId} (${clients[0].name})`);

    // 3. Create Minute
    console.log('\n3. Creating Minute...');
    const createRes = await fetch('http://localhost:3001/api/minutes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            clientId,
            content: 'Initial Meeting Notes'
        })
    });
    const minute = await createRes.json();
    console.log(`Minute Created: ID ${minute.id} - Content: "${minute.content}"`);

    // 4. Update Minute
    console.log('\n4. Updating Minute...');
    const updateRes = await fetch(`http://localhost:3001/api/minutes/${minute.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            content: 'Updated Meeting Notes - Verified Update'
        })
    });
    const updatedMinute = await updateRes.json();
    console.log(`Minute Updated: Content: "${updatedMinute.content}"`);

    if (updatedMinute.content !== 'Updated Meeting Notes - Verified Update') {
        console.error('Update Verification Failed!');
    }

    // 5. Delete Minute
    console.log('\n5. Deleting Minute...');
    const deleteRes = await fetch(`http://localhost:3001/api/minutes/${minute.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (deleteRes.ok) {
        console.log('Minute Deleted Successfully.');
    } else {
        console.error('Delete Failed:', await deleteRes.text());
    }

    // 6. Verify Deletion
    console.log('\n6. Verifying Deletion (Fetch All)...');
    const verifyRes = await fetch('http://localhost:3001/api/minutes', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const minutes = await verifyRes.json();
    const exists = minutes.find(m => m.id === minute.id);

    if (!exists) {
        console.log('Deletion Verified: Minute not found in list.');
    } else {
        console.error('Deletion Verification Failed: Minute still exists.');
    }
}

verifyMinutesCRUD();
