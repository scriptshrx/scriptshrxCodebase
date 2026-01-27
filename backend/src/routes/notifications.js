const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../lib/authMiddleware');

// Get all notifications for user
router.get('/', authMiddleware, async (req, res) => {
    try {
        console.log('[Notifications API] GET /notifications');
        console.log(`  Origin: ${req.headers.origin}`);
        console.log(`  User ID: ${req.user?.userId}`);
        
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user?.userId || req.user?.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user?.userId || req.user?.id, isRead: false },
            data: { isRead: true }
        });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error updating notifications:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

module.exports = router;
