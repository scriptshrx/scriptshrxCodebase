const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { verifyTenantAccess } = require('../middleware/permissions');

/**
 * GET /api/leads - Fetch all AI-captured leads
 */
router.get('/', authenticateToken, verifyTenantAccess, async (req, res) => {
    try {
        const tenantId = req.scopedTenantId;
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            source: 'AI_AGENT',
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [leads, total] = await Promise.all([
            prisma.client.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.client.count({ where })
        ]);

        res.json({
            success: true,
            leads,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[LeadsRoute] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leads' });
    }
});

/**
 * GET /api/leads/inbound - Fetch all inbound call leads
 */
router.get('/inbound', authenticateToken, verifyTenantAccess, async (req, res) => {
    try {
        const tenantId = req.scopedTenantId;
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            ...(search && {
                callerPhone: { contains: search, mode: 'insensitive' }
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
        console.error('[LeadsRoute] Inbound Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inbound leads' });
    }
});

/**
 * DELETE /api/leads/inbound/:id - Delete an inbound call lead
 */
router.delete('/inbound/:id', authenticateToken, verifyTenantAccess, async (req, res) => {
    try {
        const tenantId = req.scopedTenantId;
        const { id } = req.params;

        const inboundCall = await prisma.inboundCall.findUnique({ where: { id } });

        if (!inboundCall) {
            return res.status(404).json({ success: false, error: 'Inbound call not found' });
        }

        if (inboundCall.tenantId !== tenantId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        await prisma.inboundCall.delete({ where: { id } });

        res.json({ success: true, message: 'Inbound call deleted' });
    } catch (error) {
        console.error('[LeadsRoute] Delete Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete inbound call' });
    }
});

module.exports = router;
