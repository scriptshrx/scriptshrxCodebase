// backend/src/routes/voice.js
const express = require('express');
const router = express.Router();
const voiceService = require('../services/voiceService');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, verifyTenantAccess } = require('../middleware/permissions');
const { checkSubscriptionAccess, checkFeature } = require('../middleware/subscription');
const { voiceLimiter } = require('../middleware/rateLimiting');
const { checkFeature: checkGlobalFeature } = require('../config/features');

// GLOBAL FEATURE LOCK
router.use(checkGlobalFeature('VOICE_AGENTS'));

/**
 * HARD BLOCK browser access to stream endpoint
 */
router.all('/stream', (req, res) => {
    res.status(426).send('Upgrade Required: Use WebSocket connection');
});

/**
 * GET /api/voice/health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'voice',
        provider: 'twilio',
        status: 'operational',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/voice/logs
 */
router.get(
    '/logs',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('voice_agents', 'read'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            // Map legacy call to getCallSessions if getCallLogs doesn't exist on new service
            const logs = voiceService.getCallLogs
                ? await voiceService.getCallLogs(tenantId)
                : await voiceService.getCallSessions(tenantId, { limit: 20 });

            res.json({
                success: true,
                logs,
                total: logs.length
            });
        } catch (error) {
            console.error('[Voice] Error fetching logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch logs'
            });
        }
    }
);

/**
 * POST /api/voice/outbound
 */
router.post(
    '/outbound',
    voiceLimiter,
    authenticateToken,
    verifyTenantAccess,
    checkSubscriptionAccess,
    checkFeature('voice_agent'),
    checkPermission('voice_agents', 'configure'),
    async (req, res) => {
        try {
            const phoneNumber = req.body.to || req.body.phoneNumber;
            const { customData } = req.body;

            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number is required'
                });
            }

            const tenantId = req.scopedTenantId;
            const cleanPhone = phoneNumber.replace(/[\s()-]/g, '');

            console.log(
                `[Voice] Initiating Twilio call to ${cleanPhone} for tenant ${tenantId}`
            );

            const result = await voiceService.initiateOutboundCall(
                cleanPhone,
                tenantId,
                customData || {}
            );

            if (!result?.success) {
                return res.status(400).json({
                    success: false,
                    error: result?.error || 'Call failed',
                    message: result?.message
                });
            }

            res.json({
                success: true,
                message: result.message,
                callId: result.callId,
                status: result.status,
                provider: 'twilio'
            });
        } catch (error) {
            console.error('[Voice] Outbound call error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
);

/**
 * GET /api/voice/status/:callId
 */
router.get(
    '/status/:callId',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('voice_agents', 'read'),
    async (req, res) => {
        const { callId } = req.params;
        const tenantId = req.scopedTenantId;

        // Use getCallSession instead of getCallStatus if status doesn't exist
        const status = voiceService.getCallStatus
            ? await voiceService.getCallStatus(callId, tenantId)
            : await voiceService.getCallSession(callId, tenantId);


        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Call not found'
            });
        }

        res.json({ success: true, ...status });
    }
);

/**
 * GET /api/voice/agents
 */
router.get(
    '/agents',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: req.scopedTenantId },
                select: { aiConfig: true, id: true }
            });

            const aiConfig = tenant && tenant.aiConfig ? tenant.aiConfig : {};

            const virtualAgent = {
                id: `ai_${tenant.id}`,
                name: aiConfig.aiName || 'Twilio AI Assistant',
                status: 'active',
                type: 'artificial_intelligence',
                model: aiConfig.model || 'gpt-4'
            };

            res.json({
                success: true,
                agents: [virtualAgent]
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch agent info'
            });
        }
    }
);

/**
 * GET /api/voice/phone-numbers
 */
router.get(
    '/phone-numbers',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: req.scopedTenantId },
                select: { twilioConfig: true, phoneNumber: true }
            });

            const config = tenant && tenant.twilioConfig ? tenant.twilioConfig : {};
            const number = config.phoneNumber || tenant.phoneNumber;

            res.json({
                success: true,
                phoneNumbers: number
                    ? [{ phoneNumber: number, friendlyName: 'Business Line' }]
                    : []
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch phone numbers'
            });
        }
    }
);

/**
 * GET /api/voice/calls
 */
router.get(
    '/calls',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('voice_agents', 'read'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { limit = 50, includeTranscript = false } = req.query;

            const sessions = await voiceService.getCallSessions(tenantId, {
                limit: Number(limit),
                includeTranscript: includeTranscript === 'true'
            });

            res.json({
                success: true,
                calls: sessions,
                total: sessions.length
            });
        } catch (error) {
            console.error('[Voice] Fetch sessions error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch call sessions'
            });
        }
    }
);

module.exports = router;