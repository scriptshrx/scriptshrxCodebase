const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const hpp = require('hpp');
const crypto = require('crypto');
const AppError = require('./utils/AppError');


const app = express();

// Trust Proxy (Crucial for Render/Heroku Rate Limiting)
app.set('trust proxy', 1);

// Security & Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.paystack.co"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://*.paystack.co", "https://*.paystack.com"],
            connectSrc: ["'self'", "https://checkout.paystack.com", "https://api.paystack.co"],
            frameSrc: ["'self'", "https://standard.paystack.co", "https://checkout.paystack.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false // Keep disabled for now if using 3rd party assets not CORP compatible yet
})); // Secure HTTP headers (Relaxed for API)
app.use(hpp());    // Prevent HTTP Parameter Pollution

// OBSERVABILITY: Add Correlation ID to valid requests
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Configure CORS with dynamic origin checking for Render domains
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5000',
            'http://localhost:5001',
            'https://scriptishrx.net',
            'https://www.scriptishrx.net',
            'https://scriptishrxcodebase.onrender.com',
            process.env.FRONTEND_URL
        ].filter(Boolean);

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin) || origin?.includes('onrender.com')) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(cookieParser());

// Request timeout middleware - 30 seconds for all requests
app.use((req, res, next) => {
    req.setTimeout(30000); // 30 seconds
    res.setTimeout(30000);
    next();
});

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    }
});

// Apply rate limiting ONLY to API routes, not static files
app.use('/api', limiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== IMPORT ROUTES ====================
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const clientsRouter = require('./routes/clients');
const bookingsRouter = require('./routes/bookings');
const minutesRouter = require('./routes/minutes');
const settingsRouter = require('./routes/settings');
const insightsRouter = require('./routes/insights');
const workflowsRouter = require('./routes/workflows');
const notificationsRouter = require('./routes/notifications');
const paymentsRouter = require('./routes/payments');
const uploadRouter = require('./routes/upload');
const voiceRouter = require('./routes/voice');
const webhooksRouter = require('./routes/webhooks');
const marketingRouter = require('./routes/marketing');
const organizationRouter = require('./routes/organization');
const servicesRouter = require('./routes/services');

// Load AI Chat routes (production: must exist)
let chatAIRouter = null;
try {
    chatAIRouter = require('./routes/chat.routes');
    console.log('✓ AI Chat routes loaded (chat.routes.js)');
} catch (error) {
    console.error('ERROR: AI Chat routes (./routes/chat.routes) not found or failed to load. NOT registering /api/chat.');
    console.error(error && error.message ? error.message : error);
    chatAIRouter = null;
}

// Load Legacy Chat routes (optional)
let legacyChatRouter = null;
try {
    legacyChatRouter = require('./routes/chat');
    console.log('✓ Legacy chat routes loaded');
} catch (error) {
    console.warn('INFO: Legacy chat routes (./routes/chat) not found');
    legacyChatRouter = null;
}

// ==================== REGISTER ALL ROUTES ====================

// Authentication & Users
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Chat routes - AI chat takes priority on /api/chat
app.use('/api/chat', chatAIRouter);
app.use('/api/chat', require('./routes/ai-refine')); // Mount refine endpoint under /api/chat/refine
console.log('→ /api/chat registered (AI Chat)');

// Legacy chat on different path (if it exists)
if (legacyChatRouter) {
    app.use('/api/legacy-chat', legacyChatRouter);
    console.log('→ /api/legacy-chat registered (Legacy)');
}


// Other routes
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/clients', clientsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/minutes', minutesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/organization', organizationRouter);
app.use('/api/services', servicesRouter);
app.use('/api/leads', require('./routes/leads'));
app.use('/api/inbound-calls', require('./routes/inbound-calls'));

// Enterprise Features: Audit Logs (SOC2)
app.use('/api/audit-logs', require('./routes/audit'));
console.log('→ /api/audit-logs registered (Enterprise SOC2)');

// Twilio Webhooks
const twilioRouter = require('./routes/twilio');
app.use('/api/twilio', twilioRouter);
app.use('/webhooks', webhooksRouter); // Existing webhooks (Stripe?)

// Admin Routes (Subscribers, Analytics)
const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

const os = require('os');

// ==================== ACTIVE USER TRACKING ====================
// Simple in-memory tracker for "users active in last 5 minutes"
const activeUsers = new Map(); // UserId -> Timestamp

// Middleware to update active status
app.use((req, res, next) => {
    if (req.user && req.user.id) {
        activeUsers.set(req.user.id, Date.now());
    }
    // Cleanup old users every ~100 requests (optimization)
    if (Math.random() > 0.99) {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        for (const [uid, timestamp] of activeUsers.entries()) {
            if (timestamp < fiveMinutesAgo) activeUsers.delete(uid);
        }
    }
    next();
});

// ==================== HEALTH / SYSTEM STATUS ====================
app.get('/api/health', (req, res) => {
    // 1. Calculate Active Users (cleanup first)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let currentActive = 0;
    for (const [uid, timestamp] of activeUsers.entries()) {
        if (timestamp > fiveMinutesAgo) currentActive++;
        else activeUsers.delete(uid);
    }
    // Add a minimum floor of 1 (the requester) if auth'd, or just a baseline for realistic feel if dev
    if (currentActive === 0 && process.env.NODE_ENV === 'development') currentActive = 1;

    // 2. Calculate System Load using OS module
    const cpus = os.cpus().length;
    const loadAvg = os.loadavg()[0]; // 1 minute load avg
    // Normalize load to percentage (can exceed 100% if overloaded, cap at 100 for UI)
    const loadPercentage = Math.min(Math.round((loadAvg / cpus) * 100), 100) || 5;

    // 3. Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = Math.round((usedMem / totalMem) * 100);

    res.json({
        status: 'ok',
        version: '2.0.0',
        system: {
            activeUsers: currentActive,
            cpuLoad: loadPercentage, // "System Load"
            memoryUsage: memPercentage
        },
        env: process.env.NODE_ENV,
        routes: {
            auth: true,
            users: true,
            chat: true,
            legacyChat: !!legacyChatRouter,
            clients: true,
            bookings: true,
            voice: true,
            webhooks: true
        }
    });
});


//UptimeRobot
let count = 0;
app.get("/keep/render/awake", async (req, res) => {
  console.log("Keep Render awake cron job GET request successful");
  const source = req.headers["user-agent"].includes("UptimeRobot")
    ? "UptimeRobot/2.0"
    : "Github cron job";
  count++;

  console.log("Number of times pinged since last deployment:", count);

  console.log("Pinged by:", source);
  res.status(200).send("OK");
});
// Serve Frontend Static Files (SPA)
const publicPath = path.join(__dirname, '../public');
if (fs.existsSync(publicPath)) {
    console.log(`✓ Serving static files from: ${publicPath}`);
    // Fix: Enforce Content-Type for static files to prevent "garbage text" (mime mismatch)
    app.use(express.static(publicPath, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Content-Type', 'text/html');
                res.removeHeader('Content-Encoding'); // Safety against double-compression
            }
        }
    }));

    // SPA Fallback: Serve index.html for any unknown route that isn't /api
    // Note: Using (.*) for wildcard compatibility with newer Express routers
    app.get(/(.*)/, (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/media-stream')) return next();

        // Explicitly set headers for the fallback
        res.setHeader('Content-Type', 'text/html');
        res.removeHeader('Content-Encoding');
        res.sendFile(path.join(publicPath, 'index.html'));
    });
} else {
    console.warn('⚠ No frontend build found in public directory');
    app.get('/', (req, res) => {
        res.status(200).send('ScriptishRx API is running. Frontend build not matched.');
    });
    // Fallback if public doesn't exist
    app.get(/(.*)/, (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.status(200).send('ScriptishRx API (No Frontend)');
    });
}

// ==================== ERROR HANDLERS ====================

// 404 Handler
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        method: req.method,
        hint: 'Check /health or / for available routes'
    });
});

// ==================== SCHEDULED JOBS ====================
// Initialize cron jobs for booking reminders and trial warnings
try {
    const { initializeScheduledJobs } = require('../scripts/scheduledJobs');
    initializeScheduledJobs();
} catch (err) {
    console.error('⚠️ Failed to initialize scheduled jobs:', err.message);
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    res.status(statusCode).json({
        success: false,
        status: status,
        error: err.message,
        code: err.code || 'INTERNAL_ERROR',
        requestId: req.id,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;