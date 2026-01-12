// backend/src/lib/logger.js
/**
 * Structured Logger for Voice AI Platform
 * Outputs logs in JSON format for easy parsing and monitoring (e.g. CloudWatch, Datadog)
 */

const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
};

class Logger {
    constructor(context = 'App') {
        this.context = context;
    }

    _log(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            context: this.context,
            message,
            ...meta
        };
        console.log(JSON.stringify(logEntry));
    }

    info(message, meta = {}) {
        this._log(LOG_LEVELS.INFO, message, meta);
    }

    warn(message, meta = {}) {
        this._log(LOG_LEVELS.WARN, message, meta);
    }

    error(message, error = null, meta = {}) {
        const errorMeta = error ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack
        } : {};
        this._log(LOG_LEVELS.ERROR, message, { ...meta, ...errorMeta });
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'DEBUG') {
            this._log(LOG_LEVELS.DEBUG, message, meta);
        }
    }
}

module.exports = (context) => new Logger(context);
