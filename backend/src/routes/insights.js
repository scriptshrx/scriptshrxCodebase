const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../lib/authMiddleware');

router.use(authMiddleware);

// Helper to calculate percentage growth
const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};

// GET /api/insights - Real-time Dashboard Stats
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // Date Ranges
        const now = new Date();
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // 1. VOICE INTERACTIONS (Call Sessions)
        const voiceInteractions = await prisma.callSession.count({ where: { tenantId } });
        const voiceLastMonth = await prisma.callSession.count({
            where: {
                tenantId,
                createdAt: { gte: firstDayLastMonth, lte: lastDayLastMonth }
            }
        });
        const voiceCurrentMonth = await prisma.callSession.count({
            where: {
                tenantId,
                createdAt: { gte: firstDayCurrentMonth }
            }
        });

        // 2. ACTIVE CLIENTS
        const activeClients = await prisma.client.count({ where: { tenantId } });
        const clientsLastMonth = await prisma.client.count({
            where: {
                tenantId,
                createdAt: { gte: firstDayLastMonth, lte: lastDayLastMonth }
            }
        });
        const clientsCurrentMonth = await prisma.client.count({
            where: {
                tenantId,
                createdAt: { gte: firstDayCurrentMonth }
            }
        });

        // 3. PENDING BOOKINGS
        const pendingBookings = await prisma.booking.count({
            where: {
                tenantId,
                status: { in: ['Pending', 'Scheduled'] } // Adjust based on your default status
            }
        });
        // Growth for bookings based on VOLUME created
        const bookingsLastMonth = await prisma.booking.count({
            where: { tenantId, createdAt: { gte: firstDayLastMonth, lte: lastDayLastMonth } }
        });
        const bookingsCurrentMonth = await prisma.booking.count({
            where: { tenantId, createdAt: { gte: firstDayCurrentMonth } }
        });

        // 4. TOTAL REVENUE (From Transactions)
        // Note: Amount is stored in cents/kobo usually, or just assuming 'amount' field is float based on previous code
        // Checking schema: Transaction.amount is Int (kobo/cents).
        const revenueAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { tenantId, status: 'succeeded' }
        });
        const totalRevenue = (revenueAgg._sum.amount || 0) / 100; // Convert to main currency unit

        const revenueLastMonthAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                tenantId,
                status: 'succeeded',
                createdAt: { gte: firstDayLastMonth, lte: lastDayLastMonth }
            }
        });
        const revenueCurrentMonthAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                tenantId,
                status: 'succeeded',
                createdAt: { gte: firstDayCurrentMonth }
            }
        });

        const revCurrent = (revenueCurrentMonthAgg._sum.amount || 0) / 100;
        const revLast = (revenueLastMonthAgg._sum.amount || 0) / 100;

        // 5. Build Response
        res.json({
            metrics: {
                voiceInteractions: {
                    value: voiceInteractions,
                    growth: calculateGrowth(voiceCurrentMonth, voiceLastMonth) // Simplified growth metric
                },
                activeClients: {
                    value: activeClients,
                    growth: calculateGrowth(clientsCurrentMonth, clientsLastMonth)
                },
                pendingBookings: {
                    value: pendingBookings,
                    growth: calculateGrowth(bookingsCurrentMonth, bookingsLastMonth)
                },
                totalRevenue: {
                    value: totalRevenue,
                    growth: calculateGrowth(revCurrent, revLast)
                }
            },
            // Keep existing generic keys just in case frontend relies on them temporarily
            totalRevenue: totalRevenue,
            activeClients: activeClients,
            voiceInteractions: voiceInteractions,
            pendingBookings: pendingBookings
        });

    } catch (error) {
        console.error('Error fetching dashboard insights:', error);
        res.status(500).json({ error: 'Failed to fetch insights' });
    }
});

// GET /api/insights/user-registrations - User Registration Trends
router.get('/user-registrations', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // Fetch all users for this tenant with their createdAt dates
        const users = await prisma.user.findMany({
            where: { tenantId },
            select: {
                id: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        if (users.length === 0) {
            return res.json({
                registrationData: []
            });
        }

        // Group users by date (YYYY-MM-DD) and create cumulative count
        const dateMap = new Map();
        let cumulativeCount = 0;

        users.forEach(user => {
            const date = user.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            if (!dateMap.has(date)) {
                dateMap.set(date, 0);
            }
            dateMap.set(date, dateMap.get(date) + 1);
        });

        // Convert to array and calculate cumulative counts
        const registrationData = Array.from(dateMap.entries())
            .map(([date, dailyCount]) => {
                cumulativeCount += dailyCount;
                return {
                    date,
                    dailyRegistrations: dailyCount,
                    totalUsers: cumulativeCount
                };
            });

        res.json({
            registrationData
        });

    } catch (error) {
        console.error('Error fetching user registrations:', error);
        res.status(500).json({ error: 'Failed to fetch user registration data' });
    }
});

module.exports = router;
