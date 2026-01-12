const express = require('express');
const router = express.Router();

const prisma = require('../lib/prisma');
const subscribers = []; // TODO: Implement Subscriber model in Prisma

/**
 * @route POST /api/marketing/newsletter
 * @desc Subscribe to newsletter
 * @access Public
 */
router.post('/newsletter', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // TODO: Save to database
    // await prisma.subscriber.create({ data: { email } });
    console.log(`[Newsletter] New subscriber request: ${email}`);

    res.json({
        success: true,
        message: 'Successfully subscribed to the newsletter!'
    });
});

/**
 * @route GET /api/marketing/stats
 * @desc Get public platform stats
 * @access Public
 */
router.get('/stats', async (req, res) => {
    try {
        const [activeUsers, appointments] = await Promise.all([
            prisma.user.count(),
            prisma.booking.count()
        ]);

        res.json({
            success: true,
            stats: {
                activeUsers,
                downloads: 0, // Track if app downloads are applicable
                appointments,
                satisfaction: 99 // Placeholder until feedback system is linked
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

module.exports = router;
