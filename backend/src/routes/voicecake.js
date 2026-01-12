const express = require('express');
const router = express.Router();

/**
 * @deprecated
 * VoiceCake API has been fully replaced by Twilio Service.
 * These endpoints exist only for backward compatibility during migration.
 */

const shimResponse = (res, newMessage) => {
    res.json({
        status: "deprecated",
        message: "VoiceCake API has been deprecated. Please use /api/twilio instead.",
        migration_note: newMessage
    });
};

router.get('/health', (req, res) => {
    shimResponse(res, "Use /api/twilio/health");
});

router.get('/agents', (req, res) => {
    shimResponse(res, "Use /api/voice/agents (or removed if not applicable)");
});

router.post('/tenant/link-agent', (req, res) => {
    shimResponse(res, "Agent linking is now handled via Twilio configuration in Tenant settings.");
});

router.get('/tenant/agent', (req, res) => {
    shimResponse(res, "Check /api/settings for Twilio configuration.");
});

router.post('/calls/outbound', (req, res) => {
    shimResponse(res, "Use /api/voice/outbound");
});

router.get('/calls', (req, res) => {
    shimResponse(res, "Use /api/voice/calls");
});

router.get('/stats', (req, res) => {
    shimResponse(res, "Use /api/twilio/stats");
});

module.exports = router;
