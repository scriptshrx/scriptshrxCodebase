/**
 * Audit Logs API Routes
 * ----------------------
 * Enterprise Feature: SOC2 Compliance audit trail
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkEntitlement } = require('../middleware/subscription');
const auditService = require('../services/auditService');

/**
 * GET /api/audit-logs
 * Retrieve audit logs for the tenant (Enterprise only)
 */
router.get('/', authenticateToken, checkEntitlement('soc2_logging'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const {
            limit = 50,
            offset = 0,
            model,
            operation,
            userId,
            startDate,
            endDate
        } = req.query;

        const logs = await auditService.getLogs(tenantId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            model,
            operation,
            userId,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: logs,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('[AuditLogs] Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

/**
 * GET /api/audit-logs/record/:model/:recordId
 * Get full audit trail for a specific record
 */
router.get('/record/:model/:recordId', authenticateToken, checkEntitlement('soc2_logging'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { model, recordId } = req.params;

        const history = await auditService.getRecordHistory(tenantId, model, recordId);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('[AuditLogs] Error fetching record history:', error);
        res.status(500).json({ error: 'Failed to fetch record history' });
    }
});

/**
 * GET /api/audit-logs/export
 * Export audit logs as CSV (Enterprise only)
 */
router.get('/export', authenticateToken, checkEntitlement('soc2_logging'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { startDate, endDate } = req.query;

        const logs = await auditService.getLogs(tenantId, {
            limit: 10000, // Max export
            startDate,
            endDate
        });

        // Log the export action
        await auditService.logDataExport(req.user.userId, tenantId, 'audit_logs', logs.length);

        // Generate CSV
        const headers = ['Timestamp', 'User ID', 'Model', 'Operation', 'Record ID', 'Action', 'Details', 'IP Address'];
        const rows = logs.map(log => [
            log.createdAt.toISOString(),
            log.userId || 'System',
            log.model || '-',
            log.operation || '-',
            log.recordId || '-',
            log.action || '-',
            (log.details || '').replace(/,/g, ';'),
            log.ipAddress || '-'
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('[AuditLogs] Export error:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

module.exports = router;
