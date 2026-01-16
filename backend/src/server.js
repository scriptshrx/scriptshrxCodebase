const dotenv = require('dotenv');
const path = require('path');

// Load environment variables (Check multiple locations for deployment flexibility)
const envPaths = [
    path.resolve(__dirname, '../../.env'), // Monorepo root
    path.resolve(__dirname, '../.env'),    // Backend root (if deployed separately)
    path.resolve(__dirname, '.env')        // Src root
];

envPaths.forEach(envPath => {
    dotenv.config({ path: envPath });
});

const lifecycleService = require('./services/lifecycleService'); // start lifecycle automation
// DISABLED: Notification subscriber causes SMTP connection timeout on startup
// require('./subscribers/notificationSubscriber'); // Initialize Event Bus Subscribers
const http = require('http');
const app = require('./app');

// Port configuration (Critical for cPanel/Phusion Passenger)
// Passenger often passes the port/socket as a string via process.env.PORT
const DEFAULT_PORT = 5001;
// CRITICAL FIX: Ensure PORT is an integer for TCP listening.
// If it's a string (like "10000" from Render), invalid type coercion causes it to listen on a Named Pipe/Socket file instead of a TCP port.
const rawPort = process.env.PORT || DEFAULT_PORT;
const PORT = typeof rawPort === 'string' && !isNaN(rawPort) ? parseInt(rawPort, 10) : rawPort;

// If the default port is busy (EADDRINUSE), try an alternative port
function getAvailablePort(startPort, callback) {
    const net = require('net');
    const tester = net.createServer();
    tester.once('error', err => {
        if (err.code === 'EADDRINUSE') {
            // Port in use, try next
            getAvailablePort(startPort + 1, callback);
        } else {
            callback(err, null);
        }
    });
    tester.once('listening', () => {
        tester.close(() => callback(null, startPort));
    });
    tester.listen(startPort);
}


// Validate critical env vars
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('🔴 FATAL: JWT_SECRET is not defined in production environment.');
    process.exit(1);
}

// PRODUCTION REQUIREMENT: OpenAI API key
if (!process.env.OPENAI_API_KEY) {
    console.error('🔴 CRITICAL: OPENAI_API_KEY is not set!');
    console.error('AI features will NOT work without this.');
    console.error('Set OPENAI_API_KEY in your .env file.');

    if (process.env.NODE_ENV === 'production') {
        console.error('🔴 FATAL: Cannot run in production without OpenAI API key.');
        process.exit(1);
    }
}


const server = http.createServer(app);

// Initialize Socket.IO
const socketService = require('./services/socketService');
const io = socketService.init(server);
console.log('socket.io initialized');

// WebSocket handling (Native WS for Twilio Media Streams)
const WebSocket = require('ws');
const wss = new WebSocket.Server({
    server,
    path: '/api/voice/stream'
});

// Import Voice Service
const voiceService = require('./services/voiceService');

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`New WebSocket connection from ${clientIp}`);

    try {
        voiceService.handleConnection(ws, req);
    } catch (error) {
        console.error('Error handling WebSocket connection:', error);
        ws.close();
    }
});

wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
});

// Listen on PORT
// For Render and other cloud platforms, bind to 0.0.0.0 to accept external connections
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
server.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log('ScriptishRx API Server Started Successfully');
    console.log('='.repeat(60));
    console.log(`Listening on:    ${HOST}:${PORT}`);
    console.log(`WebSocket:       ws://${HOST}:${PORT}/api/voice/stream`);
    console.log(`Environment:     ${process.env.NODE_ENV || 'development'}`);
    console.log(`Root Directory:  ${path.resolve(__dirname, '../..')}`);
    console.log('\nConfiguration Status:');
    console.log(`   JWT Secret:      ${process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
    console.log(`   OpenAI API:      ${process.env.OPENAI_API_KEY ? '✓ Set' : '⚠ Not set'}`);
    console.log('='.repeat(60) + '\n');

    // Log available routes
    console.log('Testing routes:');
    console.log(`   curl http://${HOST}:${PORT}/`);
    console.log(`   curl http://${HOST}:${PORT}/api/chat/status`);
    console.log('');
});

// Graceful shutdown with connection draining
const shutdown = (signal) => {
    console.log(`\n${signal} received: shutting down gracefully...`);
    console.log('Stopping new connections...');

    // Stop accepting new connections
    server.close(() => {
        console.log('HTTP server closed - no more new connections accepted');
        console.log('All existing connections closed');
        process.exit(0);
    });

    // Close all WebSocket connections
    wss.clients.forEach((client) => {
        client.close();
    });

    // Wait for in-flight requests to complete (with timeout)
    // Give requests up to 30 seconds to finish
    const drainTimeout = setTimeout(() => {
        console.error('⚠️ Drain timeout reached - forcing shutdown');
        process.exit(1);
    }, 30000);

    // If server closes before timeout, clear it
    server.on('close', () => {
        clearTimeout(drainTimeout);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, wss };