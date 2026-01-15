const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');
const context = require('./context');

// Load env vars from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Disable prepared statements for PgBouncer compatibility
// statement_cache_size=0 prevents "prepared statement already exists" errors
function getPrismaUrl() {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const separator = url.includes('?') ? '&' : '?';
    return url.includes('statement_cache_size') ? url : `${url}${separator}statement_cache_size=0`;
}

const dbUrl = getPrismaUrl();

const prismaClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: dbUrl
        }
    }
});

// Create a separate client for high-concurrency operations (voice, webhooks)
// This bypasses the context extension to avoid prepared statement conflicts
const prismaConcurrentClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: dbUrl
        }
    }
});

// Add event listeners for connection issues
prismaClient.$on('beforeDisconnect', () => {
    console.log('[Prisma] Preparing to disconnect');
});

prismaClient.$on('error', (error) => {
    if (error.message?.includes('prepared statement')) {
        console.error('[Prisma] Prepared statement error detected:', error.message);
    }
});

// Extend Prisma with RLS (Row Level Security) using modern Client Extensions
const prisma = prismaClient.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                // List of models that HAVE a tenantId and should be filtered
                const tenantModels = [
                    'Client', 'Booking', 'Campaign', 'Workflow', 'Message',
                    'CallSession', 'MeetingMinute', 'CustomTool', 'Service',
                    'Notification', 'Transaction'
                ];

                // SKIP extension for models not in tenantModels to avoid prepared statement issues
                if (!tenantModels.includes(model)) {
                    return query(args);
                }

                const tenantId = context.getTenantId();
                const userId = context.getUserId();

                // Only filter tenant-scoped models when tenantId is available
                if (
                    tenantId &&
                    tenantModels.includes(model) &&
                    ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)
                ) {
                    if (!args.where) args.where = {};

                    // If tenantId is not already explicitly set, inject it
                    if (args.where.tenantId === undefined) {
                        args.where.tenantId = tenantId;
                    }

                    // Workflow privacy: enforce owner access
                    if (model === 'Workflow' && userId && !args.where.createdById) {
                        args.where.createdById = userId;
                    }
                }

                // For create/createMany, inject tenantId if missing
                if (tenantId && tenantModels.includes(model) && ['create', 'createMany'].includes(operation)) {
                    if (operation === 'create') {
                        if (!args.data) args.data = {};
                        if (!args.data.tenantId) args.data.tenantId = tenantId;

                        // Workflow privacy: set creator
                        if (model === 'Workflow' && userId && !args.data.createdById) {
                            args.data.createdById = userId;
                        }
                    }
                }

                // For update/delete operations, ensure tenant isolation
                if (tenantId && tenantModels.includes(model) && ['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
                    if (!args.where) args.where = {};
                    if (!args.where.tenantId) args.where.tenantId = tenantId;
                }

                return query(args);
            }
        }
    }
});

// Polyfill for global attachment in dev
if (process.env.NODE_ENV !== 'production') {
    global.__prisma__ = prisma;
}

module.exports = prisma;
module.exports.concurrent = prismaConcurrentClient;

