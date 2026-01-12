// backend/src/routes/minutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, verifyTenantAccess } = require('../middleware/permissions');
const { checkSubscriptionAccess } = require('../middleware/subscription');

/**
 * GET /api/minutes - Get all meeting minutes for tenant
 */
router.get('/',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('meeting_minutes', 'read'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;

            const minutes = await prisma.meetingMinute.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                include: { client: true }
            });

            res.json({
                success: true,
                minutes
            });
        } catch (error) {
            console.error('Error fetching minutes:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch meeting minutes'
            });
        }
    }
);

/**
 * POST /api/minutes - Create meeting minute
 */
router.post('/',
    authenticateToken,
    verifyTenantAccess,
    checkSubscriptionAccess,
    checkPermission('meeting_minutes', 'create'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { clientId, content } = req.body;

            if (!clientId || !content) {
                return res.status(400).json({
                    success: false,
                    error: 'Client ID and content are required'
                });
            }

            // SECURITY: Verify client belongs to tenant
            const client = await prisma.client.findFirst({
                where: { id: clientId, tenantId }
            });

            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: 'Client not found in your organization'
                });
            }

            const minute = await prisma.meetingMinute.create({
                data: {
                    clientId,
                    tenantId,
                    content
                },
                include: { client: true, tenant: true }
            });

            // Emit Event
            const eventBus = require('../lib/eventBus');
            eventBus.emit('meeting_minute:created', {
                tenantId,
                client: minute.client,
                tenant: minute.tenant,
                content: minute.content
            });

            res.status(201).json({
                success: true,
                minute,
                message: 'Meeting minute created successfully'
            });
        } catch (error) {
            console.error('Error creating minute:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create meeting minute'
            });
        }
    }
);

/**
 * PATCH /api/minutes/:id - Update meeting minute
 */
router.patch('/:id',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('meeting_minutes', 'update'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { id } = req.params;
            const { content } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    error: 'Content is required'
                });
            }

            // SECURITY FIX: Filter by tenant FIRST
            const minute = await prisma.meetingMinute.findFirst({
                where: { id, tenantId }
            });

            if (!minute) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting minute not found'
                });
            }

            const updatedMinute = await prisma.meetingMinute.update({
                where: { id },
                data: { content },
                include: { client: true }
            });

            res.json({
                success: true,
                minute: updatedMinute,
                message: 'Meeting minute updated successfully'
            });
        } catch (error) {
            console.error('Error updating minute:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update meeting minute'
            });
        }
    }
);

/**
 * DELETE /api/minutes/:id - Delete meeting minute
 */
router.delete('/:id',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('meeting_minutes', 'delete'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { id } = req.params;

            // SECURITY FIX: Filter by tenant FIRST
            const minute = await prisma.meetingMinute.findFirst({
                where: { id, tenantId }
            });

            if (!minute) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting minute not found'
                });
            }

            await prisma.meetingMinute.delete({ where: { id } });

            res.json({
                success: true,
                message: 'Meeting minute deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting minute:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete meeting minute'
            });
        }
    }
);

module.exports = router;
