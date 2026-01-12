const express = require('express');
const router = express.Router();
const voiceService = require('../services/voiceService');
const { authenticate } = require('../middleware/auth');

/**
 * Initiate outbound call
 * POST /api/calls/outbound
 */
router.post('/outbound', authenticate, async (req, res) => {
    try {
        const { phoneNumber, context } = req.body;
        const tenantId = req.user.tenantId;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const result = await voiceService.initiateOutboundCall(
            phoneNumber,
            tenantId,
            context
        );

        res.json(result);
    } catch (error) {
        console.error('Error initiating call:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get call details
 * GET /api/calls/:callId
 */
router.get('/:callId', authenticate, async (req, res) => {
    try {
        const voiceService = require('../services/voiceService');
        const details = await voiceService.getCallStatus(req.params.callId, req.user.tenantId);
        if (!details) {
            return res.status(404).json({ error: 'Call not found' });
        }
        res.json(details);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;