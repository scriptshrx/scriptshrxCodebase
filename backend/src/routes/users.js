const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../lib/authMiddleware');
const requireRole = require('../lib/rbac');
const { createUserSchema, RoleEnum } = require('../schemas/validation');

router.use(authMiddleware);

// GET /api/users - List users for the tenant
router.get('/', requireRole(['OWNER', 'ADMIN']), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { tenantId: req.user.tenantId },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });
        res.json(users);
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/users - Create a new user (Admin/Subscriber)
router.post('/', requireRole(['OWNER', 'ADMIN']), async (req, res) => {
    try {
        const validated = createUserSchema.parse(req.body);
        const { email, password, name, role } = validated;

        // Prevent creating OWNERs (only one per tenant usually, or handled purely by billing)
        if (role === 'OWNER' && req.user.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only Owners can create other Owners' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
                tenantId: req.user.tenantId
            },
            select: { id: true, name: true, email: true, role: true }
        });

        // Create subscription record if needed
        await prisma.subscription.create({
            data: {
                userId: newUser.id,
                plan: 'Basic', // Default plan for sub-users? Or inherit? 
                status: 'Active'
            }
        });

        res.status(201).json(newUser);

    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
        if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

module.exports = router;
