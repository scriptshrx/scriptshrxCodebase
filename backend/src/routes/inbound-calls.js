const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { verifyTenantAccess } = require('../middleware/permissions');

/**
 * GET /api/inbound-calls - Fetch all inbound calls for a tenant
 */
router.get('/', authenticateToken, verifyTenantAccess, async (req, res) => {
    try {
        const tenantId = req.scopedTenantId;
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            ...(search && {
                OR: [
                    { callerPhone: { contains: search, mode: 'insensitive' } },
                    { callerName: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [inboundCalls, total] = await Promise.all([
            prisma.inboundCall.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.inboundCall.count({ where })
        ]);

        res.json({
            success: true,
            inboundCalls,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[InboundCallsRoute] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inbound calls' });
    }
});

/**
 * DELETE /api/inbound-calls/:id - Delete an inbound call record
 */
router.delete('/:id', authenticateToken, verifyTenantAccess, async (req, res) => {
    try {
        const tenantId = req.scopedTenantId;
        const { id } = req.params;

        // Verify the inbound call belongs to this tenant
        const inboundCall = await prisma.inboundCall.findFirst({
            where: { id, tenantId }
        });

        if (!inboundCall) {
            return res.status(404).json({ success: false, error: 'Inbound call not found' });
        }

        await prisma.inboundCall.delete({ where: { id } });

        res.json({
            success: true,
            message: 'Inbound call deleted successfully'
        });
    } catch (error) {
        console.error('[InboundCallsRoute] Delete Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete inbound call' });
    }
});

/**
 * POST /api/inbound-calls/:id/convert-to-lead - Convert inbound call to a lead/client
 */
router.post('/:id/convert-to-lead', authenticateToken, verifyTenantAccess, async (req, res) => {
    try {
        const tenantId = req.scopedTenantId;
        const { id } = req.params;
        const { name, email, notes } = req.body;

        // Verify the inbound call belongs to this tenant
        const inboundCall = await prisma.inboundCall.findFirst({
            where: { id, tenantId }
        });

        if (!inboundCall) {
            return res.status(404).json({ success: false, error: 'Inbound call not found' });
        }

        // Create or update client
        const existingClient = await prisma.client.findFirst({
            where: {
                tenantId,
                OR: [
                    { phone: inboundCall.callerPhone },
                    email ? { email } : { phone: 'never-match' }
                ]
            }
        });

        let client;
        if (existingClient) {
            client = await prisma.client.update({
                where: { id: existingClient.id },
                data: {
                    name: name || existingClient.name,
                    email: email || existingClient.email,
                    notes: notes ? `${existingClient.notes || ''}\n[Inbound Call]: ${notes}` : existingClient.notes
                }
            });
        } else {
            client = await prisma.client.create({
                data: {
                    tenantId,
                    name: name || 'Unknown Caller',
                    email: email || null,
                    phone: inboundCall.callerPhone,
                    notes: `Converted from inbound call. ${notes ? 'Notes: ' + notes : ''}`,
                    source: 'INBOUND_CALL'
                }
            });
        }

        res.json({
            success: true,
            message: 'Inbound call converted to lead',
            client
        });
    } catch (error) {
        console.error('[InboundCallsRoute] Convert Error:', error);
        res.status(500).json({ success: false, error: 'Failed to convert inbound call' });
    }
});

module.exports = router;
