const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const logger = require('../utils/logger');

// GET /api/admin/subscribers/summary
// Access: SUPER_ADMIN, OWNER, ADMIN
router.get('/subscribers/summary', authenticateToken, requireRole(['SUPER_ADMIN', 'OWNER', 'ADMIN']), async (req, res) => {
    try {
        // 1. Total Subscribers
        const totalSubscribers = await prisma.subscription.count();

        // 2. Breakdown by Type (Individual vs Organization)
        const typeBreakdown = await prisma.subscription.groupBy({
            by: ['type'],
            _count: {
                id: true
            }
        });

        // 3. Breakdown by Status (Active, Inactive, etc.)
        const statusBreakdown = await prisma.subscription.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });

        // 4. Breakdown by Plan
        const planBreakdown = await prisma.subscription.groupBy({
            by: ['plan'],
            _count: {
                id: true
            }
        });

        // Format for response
        const responseData = {
            totalSubscribers,
            breakdown: typeBreakdown.reduce((acc, curr) => ({ ...acc, [curr.type]: curr._count.id }), {}),
            status: statusBreakdown.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {}),
            plans: planBreakdown.reduce((acc, curr) => ({ ...acc, [curr.plan]: curr._count.id }), {})
        };

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        logger.error('Admin Summary Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch subscriber summary' });
    }
});

// GET /api/admin/subscribers
// Access: SUPER_ADMIN, OWNER, ADMIN
router.get('/subscribers', authenticateToken, requireRole(['SUPER_ADMIN', 'OWNER', 'ADMIN']), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status;
        const type = req.query.type;

        const skip = (page - 1) * limit;

        // Build filter object
        const where = {};

        if (search) {
            where.OR = [
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } }
                // Add tenant name search if relation exists locally in prisma schema, assuming user relation is standard
            ];
        }

        if (status && status !== 'ALL') where.status = status;
        if (type && type !== 'ALL') where.type = type;

        // Fetch Data
        const [subscribers, total] = await Promise.all([
            prisma.subscription.findMany({
                where,
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            tenant: { select: { name: true } }
                        }
                    }
                }
            }),
            prisma.subscription.count({ where })
        ]);

        res.json({
            success: true,
            data: subscribers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Admin Subscribers List Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch subscribers' });
    }
});

module.exports = router;
