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

module.exports = router;
