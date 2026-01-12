// Simple logger utility used throughout the backend
// Usage: const logger = require('../lib/logger')('Label');
// logger.info('message', { optional: 'data' });
// logger.error('error', { error: err });
// logger.warn('warning', { ... });

function createLogger(label) {
    const prefix = `[${label}]`;
    return {
        info: (msg, meta = {}) => {
            console.log(`${prefix} INFO: ${msg}`, meta);
        },
        warn: (msg, meta = {}) => {
            console.warn(`${prefix} WARN: ${msg}`, meta);
        },
        error: (msg, meta = {}) => {
            console.error(`${prefix} ERROR: ${msg}`, meta);
        },
    };
}

module.exports = createLogger;
