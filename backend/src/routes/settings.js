// backend/src/routes/settings.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, verifyTenantAccess } = require('../middleware/permissions');

/**
 * GET /api/settings - Get current user and tenant settings
 */
router.get('/',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const userId = req.user?.userId || req.user?.id;
            const tenantId = req.scopedTenantId;
            if (!tenantId) {
                console.error('[Settings] Missing tenantId');
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID missing'
                });
            }

            console.log(`[Settings] Fetching for UserID: ${userId}, TenantID: ${tenantId}`);

            if (!userId) {
                console.error('[Settings] Missing userId in request');
                return res.status(401).json({
                    success: false,
                    error: 'User identity missing'
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { tenant: true, subscription: true }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // SECURITY: Verify user belongs to scoped tenant
            // If tenantId is undefined (e.g. old token), we might check against user's own tenantId
            if (tenantId && user.tenantId !== tenantId) {
                console.warn(`[Settings] Tenant mismatch. User: ${user.tenantId}, Scoped: ${tenantId}`);
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Remove sensitive data
            const { password, ...userWithoutPassword } = user;

            res.json({
                success: true,
                user: userWithoutPassword
            });
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch settings'
            });
        }
    }
);

/**
 * PUT /api/settings/profile - Update user profile
 */
router.put('/profile',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const userId = req.user?.userId || req.user?.id;
            const { name, email, phoneNumber } = req.body;

            // Input validation
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (email !== undefined) updateData.email = email;
            if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

            const user = await prisma.user.update({
                where: { id: userId },
                data: updateData
            });

            const { password, ...userWithoutPassword } = user;

            res.json({
                success: true,
                user: userWithoutPassword,
                message: 'Profile updated successfully'
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use'
                });
            }
            console.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }
    }
);

/**
 * PUT /api/settings/password - Change password
 */
router.put('/password',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const userId = req.user?.userId || req.user?.id;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password and new password are required'
                });
            }

            // Enforce strong password policy
            if (newPassword.length < 12) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 12 characters long'
                });
            }

            if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) ||
                !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must contain uppercase, lowercase, number, and special character'
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Incorrect current password'
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12); // Increased rounds from 10 to 12

            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });

            res.json({
                success: true,
                message: 'Password updated successfully'
            });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to change password'
            });
        }
    }
);

/**
 * PUT /api/settings/tenant - Update tenant settings
 */
router.put('/tenant',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('settings', 'update'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { name, location, timezone, brandColor, logoUrl, aiName, aiWelcomeMessage, customSystemPrompt } = req.body;

            // Fetch current tenant
            const currentTenant = await prisma.tenant.findUnique({
                where: { id: tenantId }
            });

            if (!currentTenant) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            // Build update data
            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (location !== undefined) updateData.location = location;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (brandColor !== undefined) updateData.brandColor = brandColor;
            if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
            if (aiName !== undefined) updateData.aiName = aiName;
            if (aiWelcomeMessage !== undefined) updateData.aiWelcomeMessage = aiWelcomeMessage;

            // Enforce plan limits for custom system prompt
            if (customSystemPrompt !== undefined) {
                // Feature Gating: Custom Prompts (Voice Agent customization)
                // We'll let the middleware handle strict gating on the route if needed,
                // but checking here ensures we don't save unauthorised changes.
                // Ideally, use: if (!req.subscription.features.includes('voice_agent')) ... 
                // However, we'll stick to the existing robust logic but cleaner:

                const allowed = currentTenant.plan === 'Advanced' || currentTenant.plan === 'Trial' || currentTenant.plan === 'Growth';

                if (allowed) {
                    try {
                        const sanitizedPrompt = validateSystemPrompt(customSystemPrompt);
                        updateData.customSystemPrompt = sanitizedPrompt;
                    } catch (validationError) {
                        return res.status(400).json({ success: false, error: validationError.message });
                    }
                } else {
                    return res.status(403).json({
                        success: false,
                        error: 'Custom system prompts require Growth or Advanced plan',
                        code: 'FEATURE_NOT_AVAILABLE',
                        requiredPlan: 'Growth',
                        currentPlan: currentTenant.plan
                    });
                }
            }

            const tenant = await prisma.tenant.update({
                where: { id: tenantId },
                data: updateData
            });

            res.json({
                success: true,
                tenant,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            console.error('Error updating tenant:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update settings'
            });
        }
    }
);

/**
 * GET /api/settings/audit-logs - Get audit logs
 */
router.get('/audit-logs',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('audit_logs', 'read'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { limit = 50 } = req.query;

            const logs = await prisma.auditLog.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
            });

            res.json({
                success: true,
                logs,
                total: logs.length
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch audit logs'
            });
        }
    }
);

/**
 * PUT /api/settings/integrations - Toggle integrations
 */
router.put('/integrations',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('settings', 'update'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { integrations } = req.body;

            // Verify plan
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId }
            });

            if (tenant.plan !== 'Advanced' && tenant.plan !== 'Trial') {
                return res.status(403).json({
                    success: false,
                    error: 'Integrations require Advanced plan',
                    code: 'FEATURE_NOT_AVAILABLE',
                    requiredPlan: 'Advanced',
                    currentPlan: tenant.plan
                });
            }

            const updatedTenant = await prisma.tenant.update({
                where: { id: tenantId },
                data: { integrations: JSON.stringify(integrations) }
            });

            res.json({
                success: true,
                integrations: JSON.parse(updatedTenant.integrations || '{}'),
                message: 'Integrations updated successfully'
            });
        } catch (error) {
            console.error('Error updating integrations:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update integrations'
            });
        }
    }
);

/**
 * Helper: Validate and sanitize system prompt
 */
function validateSystemPrompt(prompt) {
    const maxLength = 2000;
    const blockedPhrases = [
        'ignore previous',
        'ignore all previous',
        'system override',
        'admin mode',
        'reveal all',
        'disregard',
        '[system]',
        '<system>',
        '```',
        'jailbreak',
        'prompt injection'
    ];

    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt');
    }

    if (prompt.length > maxLength) {
        throw new Error(`System prompt too long (max ${maxLength} characters)`);
    }

    const lowerPrompt = prompt.toLowerCase();
    for (const phrase of blockedPhrases) {
        if (lowerPrompt.includes(phrase)) {
            throw new Error('System prompt contains blocked content');
        }
    }

    // Remove potentially dangerous characters
    return prompt.trim()
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '');
}

module.exports = router;
