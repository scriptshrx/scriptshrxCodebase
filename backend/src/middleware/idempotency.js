const crypto = require('crypto');

// In-memory store for idempotency keys (in production, use Redis)
// Format: key => { status, code, body, timestamp }
const idempotencyStore = new Map();

// Cleanup every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of idempotencyStore.entries()) {
        if (now - data.timestamp > 24 * 60 * 60 * 1000) { // 24 hour TTL
            idempotencyStore.delete(key);
        }
    }
}, 60000);

const idempotency = (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) return next();

    if (idempotencyStore.has(key)) {
        const cached = idempotencyStore.get(key);
        console.log(`[Idempotency] Hit: ${key}`);

        // If request is still processing, return 409 or 429 logic, or wait. 
        // For simplicity, we assume if it's in store it's done or processing.
        // A robust impl waits for "processing" status. 
        // Here we just return cached response if it exists.

        if (cached.status === 'processing') {
            return res.status(409).json({
                success: false,
                error: 'Request is already processing',
                code: 'CONFLICT'
            });
        }

        return res.status(cached.code).json(cached.body);
    }

    console.log(`[Idempotency] key: ${key}`);

    // Mark as processing
    idempotencyStore.set(key, { status: 'processing', timestamp: Date.now() });

    // Hook into response
    const originalJson = res.json;
    res.json = function (body) {
        idempotencyStore.set(key, {
            status: 'completed',
            code: res.statusCode,
            body: body,
            timestamp: Date.now()
        });
        return originalJson.call(this, body);
    };

    next();
};

module.exports = idempotency;
