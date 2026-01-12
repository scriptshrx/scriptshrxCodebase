/**
 * Audit Service - SOC2 Compliance Logging
 * ----------------------------------------
 * Enterprise Feature: Comprehensive audit trail for all
 * data operations to meet compliance requirements.
 */

const prisma = require('../lib/prisma');
const context = require('../lib/context');

class AuditService {
    /**
     * Log an audit event
     * @param {Object} params - Audit parameters
     * @param {string} params.tenantId - Tenant ID
     * @param {string} [params.userId] - User ID (optional)
     * @param {string} params.model - Model/table name
     * @param {string} params.operation - Operation type (create, update, delete)
     * @param {string} [params.recordId] - Affected record ID
     * @param {Object} [params.changes] - Data changes snapshot
     * @param {string} [params.ipAddress] - Client IP address
     * @param {string} [params.action] - Legacy action field
     * @param {string} [params.details] - Additional details
     */
    async log({
        tenantId,
        userId,
        model,
        operation,
        recordId,
        changes,
        ipAddress,
        action,
        details
    }) {
        try {
            // Don't block on audit logging
            setImmediate(async () => {
                try {
                    // Use the raw prisma client to avoid infinite loops with extensions
                    const { PrismaClient } = require('@prisma/client');
                    const rawPrisma = new PrismaClient();

                    await rawPrisma.auditLog.create({
                        data: {
                            tenantId,
                            userId,
                            model: model || 'unknown',
                            operation: operation || 'unknown',
                            recordId: recordId?.toString(),
                            changes: changes ? JSON.stringify(changes) : null,
                            ipAddress,
                            action: action || `${operation}:${model}`,
                            details,
                            createdAt: new Date()
                        }
                    });

                    await rawPrisma.$disconnect();
                } catch (innerError) {
                    console.error('[AuditService] Failed to write audit log:', innerError.message);
                }
            });
        } catch (error) {
            console.error('[AuditService] Audit logging error:', error.message);
        }
    }

    /**
     * Log a user action (simplified helper)
     * @param {string} action - Action description
     * @param {Object} [details] - Additional details
     */
    async logAction(action, details = {}) {
        const tenantId = context.getTenantId();
        const userId = context.getUserId();
        const store = context.getStore();
        const ipAddress = store?.get?.('ip');

        await this.log({
            tenantId: tenantId || 'system',
            userId,
            model: details.model || 'System',
            operation: details.operation || 'action',
            recordId: details.recordId,
            changes: details.changes,
            ipAddress,
            action,
            details: typeof details === 'string' ? details : JSON.stringify(details)
        });
    }

    /**
     * Get audit logs for a tenant
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Audit logs
     */
    async getLogs(tenantId, options = {}) {
        const {
            limit = 50,
            offset = 0,
            model,
            operation,
            userId,
            startDate,
            endDate
        } = options;

        try {
            const where = { tenantId };

            if (model) where.model = model;
            if (operation) where.operation = operation;
            if (userId) where.userId = userId;
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt.gte = new Date(startDate);
                if (endDate) where.createdAt.lte = new Date(endDate);
            }

            return await prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            });
        } catch (error) {
            console.error('[AuditService] Error fetching logs:', error.message);
            return [];
        }
    }

    /**
     * Get audit trail for a specific record
     * @param {string} tenantId - Tenant ID
     * @param {string} model - Model name
     * @param {string} recordId - Record ID
     * @returns {Promise<Array>} Audit trail
     */
    async getRecordHistory(tenantId, model, recordId) {
        try {
            return await prisma.auditLog.findMany({
                where: {
                    tenantId,
                    model,
                    recordId
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            console.error('[AuditService] Error fetching record history:', error.message);
            return [];
        }
    }

    /**
     * Log login event
     */
    async logLogin(userId, tenantId, ipAddress, success = true) {
        await this.log({
            tenantId: tenantId || 'unknown',
            userId,
            model: 'User',
            operation: success ? 'login' : 'login_failed',
            ipAddress,
            action: success ? 'USER_LOGIN' : 'LOGIN_FAILED'
        });
    }

    /**
     * Log logout event
     */
    async logLogout(userId, tenantId, ipAddress) {
        await this.log({
            tenantId,
            userId,
            model: 'User',
            operation: 'logout',
            ipAddress,
            action: 'USER_LOGOUT'
        });
    }

    /**
     * Log data export (for compliance)
     */
    async logDataExport(userId, tenantId, exportType, recordCount) {
        await this.log({
            tenantId,
            userId,
            model: 'Export',
            operation: 'export',
            action: 'DATA_EXPORT',
            details: JSON.stringify({ type: exportType, records: recordCount })
        });
    }
}

module.exports = new AuditService();
