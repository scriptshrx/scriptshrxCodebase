// backend/src/routes/organization.js
/**
 * Organization Management Routes
 * Handles team invites, member management, and organization settings
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { SendMailClient } = require("zeptomail");
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, requireOwnerOrAdmin, verifyTenantAccess } = require('../middleware/permissions');
const { inviteLimiter, inviteVerifyLimiter } = require('../middleware/rateLimiting');

// Initialize ZeptoMail client
const ZEPTOMAIL_URL = "https://api.zeptomail.com/v1.1/email";
const ZEPTOMAIL_KEY = process.env.ZEPTOMAIL_KEY;
let mailClient = null;

if (ZEPTOMAIL_KEY) {
    mailClient = new SendMailClient({ url: ZEPTOMAIL_URL, token: ZEPTOMAIL_KEY });
}

// Load invite email template
const inviteMailPath = path.join(process.cwd(), 'src', 'routes', 'inviteMail.html');
const inviteMailTemplate = fs.existsSync(inviteMailPath) ? fs.readFileSync(inviteMailPath, 'utf8') : null;

/**
 * Helper function to send invite email
 */
async function sendInviteEmail(email, organizationName, inviteLink, inviterName, role) {
    if (!mailClient || !inviteMailTemplate) {
        console.warn('⚠️  ZeptoMail not configured or email template missing. Skipping email send.');
        return false;
    }

    try {
        const htmlContent = inviteMailTemplate
            .replace('inviteeEmail', email)
            .replace(/organizationName/g, organizationName)
            .replace('inviteLinkPlaceholder', inviteLink)
            .replace('inviterName', inviterName)
            .replace('inviteRole', role);

        const response = await mailClient.sendMail({
            from: {
                address: 'support@scriptishrx.net',
                name: "ScriptishRX"
            },
            to: [
                {
                    "email_address": {
                        address: email
                    }
                }
            ],
            bcc: [{ email_address: { address: "support@scriptishrx.net" } }],
            subject: `Join ${organizationName} on ScriptishRX`,
            htmlbody: htmlContent,
        });

        console.log('✅ Invite email sent successfully to:', email);
        return true;
    } catch (error) {
        console.error('❌ Failed to send invite email:', error.message);
        return false;
    }
}

// ========== ORGANIZATION INVITES ==========

/**
 * POST /api/organization/invite
 * Invite a user to join the organization
 */
router.post('/invite',
    inviteLimiter,
    authenticateToken,
    checkPermission('users', 'invite'),
    async (req, res) => {
        try {
            const { email, role, metadata } = req.body;
            const tenantId = req.user?.tenantId;
            const invitedBy = req.user?.userId || req.user?.id;

            if (!email || !role) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and role are required'
                });
            }

            // Validate role
            const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MEMBER'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }

            // Check if user already exists in the organization
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    tenantId
                }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists in this organization'
                });
            }

            // Check if invite already exists
            const existingInvite = await prisma.invite.findFirst({
                where: {
                    email,
                    tenantId,
                    acceptedAt: null,
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });

            if (existingInvite) {
                return res.status(400).json({
                    success: false,
                    error: 'An active invite already exists for this email'
                });
            }

            // Generate unique invite token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

            // Create invite with optional metadata
            const invite = await prisma.invite.create({
                data: {
                    email,
                    role,
                    token,
                    expiresAt,
                    createdBy: invitedBy,
                    tenantId,
                    metadata: metadata || null
                },
                include: {
                    tenant: true,
                    createdByUser: {
                        select: { name: true }
                    }
                }
            });

            // Build invite link with fields configuration
            let inviteLink = `https://scriptishrx.net/register?invite=${token}`;
            
            // Add fields configuration if provided in metadata
            if (metadata?.fieldsConfig) {
                const fieldsParam = Buffer.from(JSON.stringify(metadata.fieldsConfig)).toString('base64');
                inviteLink += `&fields=${fieldsParam}`;
            }
            
            // Add role parameter
            inviteLink += `&role=${role}`;
            
            const inviterName = invite.createdByUser?.name || 'Your colleague';
            
            const emailSent = await sendInviteEmail(
                email,
                invite.tenant.name,
                inviteLink,
                inviterName,
                role
            );

            res.json({
                success: true,
                invite: {
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    expiresAt: invite.expiresAt,
                    inviteLink,
                    organization: invite.tenant.name,
                    emailSent,
                    metadata: invite.metadata
                },
                message: emailSent 
                    ? 'Invite created and email sent successfully.' 
                    : 'Invite created but email could not be sent. Share the link manually.'
            });
        } catch (error) {
            console.error('Error creating invite:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create invite'
            });
        }
    }
);

/**
 * GET /api/organization/invites
 * List all pending invites for the organization
 */
router.get('/invites',
    authenticateToken,
    requireOwnerOrAdmin,
    async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;

            const invites = await prisma.invite.findMany({
                where: {
                    tenantId,
                    acceptedAt: null
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            res.json({
                success: true,
                invites: invites.map(inv => ({
                    id: inv.id,
                    email: inv.email,
                    role: inv.role,
                    createdAt: inv.createdAt,
                    expiresAt: inv.expiresAt,
                    isExpired: new Date() > inv.expiresAt
                }))
            });
        } catch (error) {
            console.error('Error fetching invites:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch invites'
            });
        }
    }
);

/**
 * DELETE /api/organization/invite/:inviteId
 * Cancel a pending invite
 */
router.delete('/invite/:inviteId',
    authenticateToken,
    requireOwnerOrAdmin,
    async (req, res) => {
        try {
            const { inviteId } = req.params;
            const tenantId = req.user?.tenantId;

            const invite = await prisma.invite.findUnique({
                where: { id: inviteId }
            });

            if (!invite) {
                return res.status(404).json({
                    success: false,
                    error: 'Invite not found'
                });
            }

            if (invite.tenantId !== tenantId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            await prisma.invite.delete({
                where: { id: inviteId }
            });

            res.json({
                success: true,
                message: 'Invite cancelled'
            });
        } catch (error) {
            console.error('Error cancelling invite:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to cancel invite'
            });
        }
    }
);

/**
 * POST /api/organization/invite/:inviteId/resend
 * Resend an invite email
 */
router.post('/invite/:inviteId/resend',
    inviteLimiter,
    authenticateToken,
    requireOwnerOrAdmin,
    async (req, res) => {
        try {
            const { inviteId } = req.params;
            const tenantId = req.user?.tenantId;

            const invite = await prisma.invite.findUnique({
                where: { id: inviteId },
                include: {
                    tenant: true,
                    createdByUser: {
                        select: { name: true }
                    }
                }
            });

            if (!invite) {
                return res.status(404).json({
                    success: false,
                    error: 'Invite not found'
                });
            }

            if (invite.tenantId !== tenantId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            if (invite.acceptedAt) {
                return res.status(400).json({
                    success: false,
                    error: 'This invite has already been accepted'
                });
            }

            if (new Date() > invite.expiresAt) {
                return res.status(400).json({
                    success: false,
                    error: 'This invite has expired. Please create a new one.'
                });
            }

            // Resend the invite email
            const inviteLink = `${process.env.FRONTEND_URL}/register?invite=${invite.token}`;
            const inviterName = invite.createdByUser?.name || 'Your colleague';

            const emailSent = await sendInviteEmail(
                invite.email,
                invite.tenant.name,
                inviteLink,
                inviterName,
                invite.role
            );

            if (!emailSent) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send invite email'
                });
            }

            res.json({
                success: true,
                message: 'Invite email resent successfully'
            });
        } catch (error) {
            console.error('Error resending invite:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to resend invite'
            });
        }
    }
);

/**
 * GET /api/organization/invite/verify/:token
 * Verify an invite token (public route for registration)
 */
router.get('/invite/verify/:token', inviteVerifyLimiter, async (req, res) => {
    try {
        const { token } = req.params;

        const invite = await prisma.invite.findUnique({
            where: { token },
            include: {
                tenant: true
            }
        });

        // SECURITY FIX: Unified error response for all failure cases
        // This prevents token enumeration attacks
        const isValid = invite &&
            !invite.acceptedAt &&
            new Date() < new Date(invite.expiresAt);

        if (!isValid) {
            // SAME response for: invalid token, expired token, or already accepted
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired invite link',
                code: 'INVITE_INVALID'
            });
        }

        // Only reveal organization details if token is fully valid
        res.json({
            success: true,
            invite: {
                email: invite.email,
                role: invite.role,
                organization: invite.tenant.name,
                expiresAt: invite.expiresAt,
                metadata: invite.metadata
            }
        });
    } catch (error) {
        console.error('Error verifying invite:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify invite'
        });
    }
});

// ========== TEAM MANAGEMENT ==========

/**
 * GET /api/organization/team
 * Get all team members
 */
router.get('/team',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;

            const users = await prisma.user.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true,
                    avatarUrl: true,
                    phoneNumber: true,
                    country: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            res.json({
                success: true,
                team: users
            });
        } catch (error) {
            console.error('Error fetching team:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch team members'
            });
        }
    }
);

/**
 * PATCH /api/organization/team/:userId/role
 * Update a team member's role
 */
router.patch('/team/:userId/role',
    authenticateToken,
    requireOwnerOrAdmin,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { role } = req.body;
            const tenantId = req.user?.tenantId;
            const currentUserId = req.user?.userId || req.user?.id;

            // Cannot change your own role
            if (userId === currentUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot change your own role'
                });
            }

            // Validate role
            const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MEMBER'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user || user.tenantId !== tenantId) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found in your organization'
                });
            }

            // Cannot change owner's role
            if (user.role === 'OWNER') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot change the owner\'s role'
                });
            }

            await prisma.user.update({
                where: { id: userId },
                data: { role }
            });

            res.json({
                success: true,
                message: `User role updated to ${role}`
            });
        } catch (error) {
            console.error('Error updating role:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update role'
            });
        }
    }
);

/**
 * DELETE /api/organization/team/:userId
 * Remove a team member
 */
router.delete('/team/:userId',
    authenticateToken,
    checkPermission('users', 'delete'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const tenantId = req.user?.tenantId;
            const currentUserId = req.user?.userId || req.user?.id;

            // Cannot delete yourself
            if (userId === currentUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot remove yourself'
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user || user.tenantId !== tenantId) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found in your organization'
                });
            }

            // Cannot delete owner
            if (user.role === 'OWNER') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot remove the organization owner'
                });
            }

            await prisma.user.delete({
                where: { id: userId }
            });

            res.json({
                success: true,
                message: 'Team member removed'
            });
        } catch (error) {
            console.error('Error removing team member:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to remove team member'
            });
        }
    }
);

// ========== ORGANIZATION SETTINGS ==========

/**
 * GET /api/organization/info
 * Get organization information
 */
router.get('/info',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;

            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId }
            });

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            res.json({
                success: true,
                organization: {
                    id: tenant.id,
                    name: tenant.name,
                    location: tenant.location,
                    timezone: tenant.timezone,
                    phoneNumber: tenant.phoneNumber,
                    plan: tenant.plan,
                    brandColor: tenant.brandColor,
                    logoUrl: tenant.logoUrl,
                    aiName: tenant.aiName,
                    aiWelcomeMessage: tenant.aiWelcomeMessage,
                    customSystemPrompt: tenant.customSystemPrompt,
                    aiConfig: tenant.aiConfig,
                    twilioConfig: tenant.twilioConfig, // Proceed with caution if exposing secrets to frontend - typically filtering is needed
                    createdAt: tenant.createdAt
                }
            });
        } catch (error) {
            console.error('Error fetching organization:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch organization'
            });
        }
    }
);

/**
 * PATCH /api/organization/info
 * Update organization information
 */
router.patch('/info',
    authenticateToken,
    checkPermission('organization', 'update'),
    async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            const {
                name, location, timezone, phoneNumber,
                brandColor, logoUrl,
                aiName, aiWelcomeMessage, customSystemPrompt,
                aiConfig, // JSON: { model, temperature, systemPrompt, voiceId, welcomeMessage, faqs: [] }
                twilioConfig // JSON: { accountSid, authToken, phoneNumber ... }
            } = req.body;

            console.log('[Organization API] PATCH /info received');
            console.log('[Organization API] Tenant ID:', tenantId);
            console.log('[Organization API] customSystemPrompt from request:', customSystemPrompt ? `${customSystemPrompt.substring(0, 50)}...` : 'UNDEFINED');
            console.log('[Organization API] aiConfig:', aiConfig);

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    error: 'No tenant ID found'
                });
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (location !== undefined) updateData.location = location;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
            if (brandColor !== undefined) updateData.brandColor = brandColor;
            if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
            if (aiName !== undefined) updateData.aiName = aiName;
            if (aiWelcomeMessage !== undefined) updateData.aiWelcomeMessage = aiWelcomeMessage;
            if (customSystemPrompt !== undefined) {
                console.log('[Organization API] Setting customSystemPrompt to:', customSystemPrompt.substring(0, 50) + '...');
                updateData.customSystemPrompt = customSystemPrompt;
                console.log('[Organization API] updateData.customSystemPrompt is now set:', updateData.customSystemPrompt ? 'YES' : 'NO');
            } else {
                console.log('[Organization API] customSystemPrompt was UNDEFINED in request body');
            }

            // New JSON Configs
            if (aiConfig !== undefined) {
                // Fetch current config to merge (Read-Modify-Write) prevents overwriting FAQs when saving Voice settings
                const currentTenantAI = await prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { aiConfig: true }
                });
                const existingAiConfig = (currentTenantAI && currentTenantAI.aiConfig) ? currentTenantAI.aiConfig : {};

                // Merge: New values override old, but missing keys (like faqs from Voice page) are preserved
                const mergedAiConfig = {
                    ...existingAiConfig,
                    ...aiConfig
                };

                // VALIDATION: Prevent empty saves
                if (!mergedAiConfig.aiName || !mergedAiConfig.aiName.trim()) {
                    return res.status(400).json({ success: false, error: 'AI Name is required' });
                }
                if (!mergedAiConfig.welcomeMessage || !mergedAiConfig.welcomeMessage.trim()) {
                    return res.status(400).json({ success: false, error: 'Welcome Message is required' });
                }
                if (!mergedAiConfig.systemPrompt || !mergedAiConfig.systemPrompt.trim()) {
                    return res.status(400).json({ success: false, error: 'System Instructions are required' });
                }

                // FAQ Validation
                if (mergedAiConfig.faqs && Array.isArray(mergedAiConfig.faqs)) {
                    for (const faq of mergedAiConfig.faqs) {
                        if (!faq.question || !faq.question.trim() || !faq.answer || !faq.answer.trim()) {
                            return res.status(400).json({ success: false, error: 'All Q&A pairs must have both a question and an answer.' });
                        }
                    }
                }

                updateData.aiConfig = mergedAiConfig;
            }

            if (twilioConfig !== undefined) {
                // Fetch current config to merge (Read-Modify-Write for JSON)
                const currentTenant = await prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { twilioConfig: true }
                });
                const existingConfig = (currentTenant && currentTenant.twilioConfig) ? currentTenant.twilioConfig : {};

                if (twilioConfig.phoneNumber) {
                    // Sanitize input: Allow users to paste formats like "+1 866-724-3198"
                    // We strip everything except '+' and digits.
                    const cleanedPhone = twilioConfig.phoneNumber.replace(/[^\d+]/g, '');

                    if (!cleanedPhone.trim()) {
                        return res.status(400).json({ success: false, error: 'Twilio Phone Number cannot be empty' });
                    }

                    // Basic E.164 validation on CLEANED number
                    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
                    if (!phoneRegex.test(cleanedPhone)) {
                        return res.status(400).json({ success: false, error: `Invalid Phone Number format. Got: '${cleanedPhone}'. Expected E.164 (e.g. +18667243198)` });
                    }

                    // Check if another tenant already has this phone number
                    const existingPhoneNumber = await prisma.tenant.findFirst({
                        where: {
                            AND: [
                                { id: { not: tenantId } },
                                {
                                    OR: [
                                        { phoneNumber: cleanedPhone }
                                    ]
                                }
                            ]
                        }
                    });

                    if (existingPhoneNumber) {
                        return res.status(409).json({
                            success: false,
                            error: `This phone number (${cleanedPhone}) is already registered with another company. Each company must use a unique phone number.`
                        });
                    }

                    // Use the sanitized number for saving in BOTH locations
                    twilioConfig.phoneNumber = cleanedPhone;
                    // IMPORTANT: Also sync to the main phoneNumber field to enforce UNIQUE constraint
                    updateData.phoneNumber = cleanedPhone;
                    console.log('[Organization API] Phone number synchronized: twilioConfig AND phoneNumber field set to:', cleanedPhone);
                }
                    ...existingConfig,
                    ...twilioConfig
                };
            }

            console.log('[Organization API] Final updateData to be saved:', JSON.stringify(updateData, null, 2));

            const tenant = await prisma.tenant.update({
                where: { id: tenantId },
                data: updateData
            });

            console.log('[Organization API] Tenant updated successfully');
            console.log('[Organization API] Updated customSystemPrompt:', tenant.customSystemPrompt ? `${tenant.customSystemPrompt.substring(0, 50)}...` : 'NULL');
            console.log('[Organization API] Updated aiConfig:', tenant.aiConfig);

            res.json({
                success: true,
                organization: tenant,
                message: 'Organization updated successfully'
            });
        } catch (error) {
            console.error('Error updating organization:', error);
            
            // Handle Prisma unique constraint violation
            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'This phone number is already registered. Each company must use a unique phone number.'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to update organization'
            });
        }
    }
);

module.exports = router;
