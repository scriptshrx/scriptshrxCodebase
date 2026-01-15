// backend/src/middleware/rateLimiting.js
/**
 * Rate Limiting Middleware
 * Prevents brute force attacks, trial abuse, and resource exhaustion
 */

const rateLimit = require('express-rate-limit');

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 5 : 20, // 20 attempts in dev, 5 in prod
    message: {
        success: false,
        error: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// Registration limiter - prevent trial abuse
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: {
        success: false,
        error: 'Too many registration attempts. Please try again later.',
        code: 'REGISTRATION_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Voice call limiter - prevent cost attacks
const voiceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 calls per minute
    message: {
        success: false,
        error: 'Voice call rate limit exceeded. Maximum 10 calls per minute.',
        code: 'VOICE_RATE_LIMIT_EXCEEDED',
        retryAfter: '60 seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Invite limiter - prevent spam
const inviteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 invites per hour per IP
    message: {
        success: false,
        error: 'Invite rate limit exceeded. Maximum 20 invites per hour.',
        code: 'INVITE_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Invite verification limiter - prevent enumeration
const inviteVerifyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 verification attempts per minute
    message: {
        success: false,
        error: 'Too many verification attempts. Please try again later.',
        code: 'VERIFICATION_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API limiter (fallback)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: {
        success: false,
        error: 'API rate limit exceeded. Please slow down.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Password reset limiter (for future implementation)
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 reset requests per hour
    message: {
        success: false,
        error: 'Too many password reset attempts. Please try again later.',
        code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authLimiter,
    registerLimiter,
    voiceLimiter,
    inviteLimiter,
    inviteVerifyLimiter,
    apiLimiter,
    passwordResetLimiter
};
