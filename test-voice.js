// test-voice.js – Mock client for VoiceService
// Run with: node test-voice.js (while the backend server is running)

const WebSocket = require('ws');

// 1. Change this to your local port or your Render URL
// If you run the server locally with `npm run dev`, the default port is 5000.
const SERVER_URL = 'ws://localhost:5000/api/voice/stream';

// 2. Put a real Tenant ID from your database here to test "Hot‑Swapping"
// Example: const TEST_TENANT_ID = '3c7e5352-e8cf-4d74-8ce5-281bd7107a82';
const TEST_TENANT_ID = '3c7e5352-e8cf-4d74-8ce5-281bd7107a82';

const ws = new WebSocket(SERVER_URL);

ws.on('open', () => {
    console.log('✅ Connected to VoiceService');

    // Simulate Twilio "connected" event
    ws.send(JSON.stringify({
        event: 'connected',
        protocol: 'Call',
        version: '1.0.0'
    }));

    // Simulate Twilio "start" event with your Tenant ID
    console.log(`Sending start event for Tenant: ${TEST_TENANT_ID}`);
    ws.send(JSON.stringify({
        event: 'start',
        streamSid: 'test-stream-123',
        start: {
            accountSid: 'AC-test',
            callSid: 'CA-test',
            customParameters: {
                tenantId: TEST_TENANT_ID
            }
        }
    }), (err) => {
        if (err) console.error('❌ Send error:', err);
        else console.log('✅ Send complete');
    });

    // Simulate a 1‑second burst of "silence" audio (base64 encoded)
    // This ensures handleMessage triggers the OpenAI connection
    const silencePayload = Buffer.alloc(320, 0xff).toString('base64');
    const mediaInterval = setInterval(() => {
        // if (ws.readyState === WebSocket.OPEN) {
        //     ws.send(JSON.stringify({
        //         event: 'media',
        //         streamSid: 'test-stream-123',
        //         media: {
        //             payload: silencePayload,
        //             timestamp: Date.now().toString()
        //         }
        //     }));
        // }
    }, 20);

    // Stop after 30 seconds (extended for OpenAI warm‑up)
    setTimeout(() => {
        clearInterval(mediaInterval);
        console.log('\nTest time limit reached. Closing.');
        ws.close();
    }, 45000);
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data);

        // This is what your VoiceService is actually sending:
        if (msg.event === 'media') {
            console.log('🔈 SUCCESS: Received Audio Chunk from Server!');
        } else if (msg.event === 'mark') {
            console.log('📍 Received Mark:', msg.mark.name);
        } else {
            console.log('📩 Other Event:', msg.event);
        }
    } catch (e) {
        // Sometimes raw data comes through
    }
});

ws.on('error', (err) => console.error('❌ Test Error:', err));
ws.on('close', () => console.log('🔌 Connection Closed'));
