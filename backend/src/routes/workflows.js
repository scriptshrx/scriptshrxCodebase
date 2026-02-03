// backend/src/routes/workflows.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, verifyTenantAccess } = require('../middleware/permissions');
const { checkSubscriptionAccess } = require('../middleware/subscription');
const workflowService = require('../services/workflowService');

/**
 * GET /api/workflows - Get all workflows for tenant
 */
router.get('/',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('workflows', 'read'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;

            const workflows = await prisma.workflow.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' }
            });

            res.json({
                success: true,
                workflows
            });
        } catch (error) {
            console.error('Error fetching workflows:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch workflows'
            });
        }
    }
);

/**
 * POST /api/workflows - Create new workflow
 */
router.post('/',
    authenticateToken,
    verifyTenantAccess,
    checkSubscriptionAccess,
    checkPermission('workflows', 'create'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const userId = req.user?.userId || req.user?.id;
            const { name, trigger, actions } = req.body;

            if (!name || !trigger) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and trigger are required'
                });
            }

            const workflow = await prisma.workflow.create({
                data: {
                    name,
                    trigger,
                    actions: actions ? JSON.stringify(actions) : '[]',
                    tenantId
                }
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    userId,
                    action: 'Create Workflow',
                    details: `Created workflow: ${name}`
                }
            }).catch(err => console.error('Audit log failed:', err));

            // Notify User
            const notificationService = require('../services/notificationService');
            await notificationService.createNotification(
                userId,
                'Workflow Created',
                `Your workflow "${name}" has been successfully created.`,
                'success',
                '/dashboard/workflows'
            );

            res.status(201).json({
                success: true,
                workflow,
                message: 'Workflow created successfully'
            });
        } catch (error) {
            console.error('[Workflow Create] Error:', error.message, error.stack);
            res.status(500).json({
                success: false,
                error: 'Failed to create workflow',
                details: error.message,
                code: error.code
            });
        }
    }
);

/**
 * POST /api/workflows/:id/trigger - Manually trigger a workflow
 */
router.post('/:id/trigger',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('workflows', 'update'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const userId = req.user?.userId || req.user?.id;
            const { id } = req.params;
            const payload = req.body || {};

            const workflow = await prisma.workflow.findFirst({ where: { id, tenantId } });

            if (!workflow) {
                return res.status(404).json({ success: false, error: 'Workflow not found' });
            }

            if (!workflow.isActive) {
                return res.status(400).json({ success: false, error: 'Workflow is inactive' });
            }

            console.log(`[Workflow] Manually triggering ${workflow.id}`);

            // Execute using the service
            await workflowService.executeWorkflow(workflow, payload);

            // Audit log
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    userId,
                    action: 'Trigger Workflow (manual)',
                    details: `Manually triggered workflow ${workflow.name} (${workflow.id})`
                }
            }).catch(err => console.error('Audit log failed:', err));

            return res.json({
                success: true,
                message: 'Workflow executed successfully'
            });
        } catch (error) {
            console.error('Error triggering workflow:', error);
            return res.status(500).json({ success: false, error: 'Failed to trigger workflow', details: error.message });
        }
    }
);

/**
 * PATCH /api/workflows/:id/toggle - Toggle workflow status
 */
router.patch('/:id/toggle',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('workflows', 'update'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { id } = req.params;

            const workflow = await prisma.workflow.findFirst({
                where: { id, tenantId }
            });

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: 'Workflow not found'
                });
            }

            const updated = await prisma.workflow.update({
                where: { id },
                data: { isActive: !workflow.isActive }
            });

            res.json({
                success: true,
                workflow: updated,
                message: `Workflow ${updated.isActive ? 'activated' : 'deactivated'}`
            });
        } catch (error) {
            console.error('Error toggling workflow:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to toggle workflow'
            });
        }
    }
);

/**
 * DELETE /api/workflows/:id - Delete workflow
 */
router.delete('/:id',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('workflows', 'delete'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { id } = req.params;

            const workflow = await prisma.workflow.findFirst({
                where: { id, tenantId }
            });

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: 'Workflow not found'
                });
            }

            await prisma.workflow.delete({ where: { id } });

            res.json({
                success: true,
                message: 'Workflow deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting workflow:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete workflow'
            });
        }
    }
);

module.exports = router;
