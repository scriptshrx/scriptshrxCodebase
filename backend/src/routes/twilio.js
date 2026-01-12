const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const twilio = require('twilio');
const logger = require('../lib/logger')('TwilioRoutes');
const { authenticateToken } = require('../middleware/auth');

/**
 * Twilio Request Validation Middleware
 * Only enforces validation in production
 */
const validateTwilio = twilio.webhook({
    validate: process.env.NODE_ENV === 'production'
});

/* ==========================================================================
   TWILIO WEBHOOKS (PUBLIC, SIGNATURE-PROTECTED)
   ========================================================================== */

// Health probe
router.get('/webhook/voice', (req, res) =>
    res.send('Twilio Voice Webhook is active (use POST)')
);

/**
 * Inbound Voice Webhook
 */
router.post('/webhook/voice', validateTwilio, async (req, res) => {
    try {
        const twiml = await twilioService.handleInboundVoice(req.body);

        res.setHeader('Content-Encoding', 'identity');
        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        logger.error('Twilio Voice Webhook Error', { error: error.message, stack: error.stack });
        // Return a minimal valid TwiML error response so Twilio does not play generic fallback
        const errorResponse = new twilio.twiml.VoiceResponse();
        errorResponse.say('Sorry, an error occurred. Please try again later.');
        res.setHeader('Content-Encoding', 'identity');
        res.type('text/xml');
        res.status(500).send(errorResponse.toString());
    }
});

/**
 * Outbound Voice → Media Stream Webhook
 */
router.post('/webhook/voice/outbound-stream', validateTwilio, async (req, res) => {
    try {
        const response = new twilio.twiml.VoiceResponse();
        const connect = response.connect();

        const stream = connect.stream({
            url: `wss://${req.get('host')}/api/voice/stream`
        });

        if (req.query.tenantId) {
            stream.parameter({
                name: 'tenantId',
                value: String(req.query.tenantId)
            });
        }

        res.setHeader('Content-Encoding', 'identity');
        res.type('text/xml');
        res.send(response.toString());
    } catch (error) {
        logger.error('Twilio Outbound Stream Webhook Error', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).send('Error');
    }
});

/**
 * Inbound SMS Webhook
 */
router.get('/webhook/sms', (req, res) =>
    res.send('Twilio SMS Webhook is active (use POST)')
);

router.post('/webhook/sms', validateTwilio, async (req, res) => {
    try {
        await twilioService.handleInboundSms(req.body);

        res.type('text/xml');
        res.send('<Response />');
    } catch (error) {
        logger.error('Twilio SMS Webhook Error', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).send('Error');
    }
});

/**
 * Gather (DTMF) Webhook
 */
router.post('/webhook/voice/gather', validateTwilio, async (req, res) => {
    try {
        const twiml = await twilioService.handleGatherInput(req.body);

        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        logger.error('Twilio Gather Webhook Error', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).send('Error');
    }
});

/**
 * Status Callback Webhook
 */
router.post('/webhook/status', validateTwilio, async (req, res) => {
    try {
        logger.info('Twilio Call Status Update', req.body);
        // Optional: persist status updates here
        res.sendStatus(200);
    } catch (error) {
        logger.error('Twilio Status Webhook Error', error);
        res.sendStatus(500);
    }
});

/* ==========================================================================
   PUBLIC
   ========================================================================== */

router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Twilio' });
});

/* ==========================================================================
   AUTHENTICATED API
   ========================================================================== */

/**
 * Get Call Status
 */
router.get('/call/:callSid/status', authenticateToken, async (req, res) => {
    try {
        const { callSid } = req.params;
        const tenantId = req.user.tenantId;

        const status = await twilioService.getCallStatus(tenantId, callSid);
        res.json(status);
    } catch (error) {
        logger.error('Error fetching call status', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Hang up Call
 */
router.post('/call/:callSid/hangup', authenticateToken, async (req, res) => {
    try {
        const { callSid } = req.params;
        const tenantId = req.user.tenantId;

        const result = await twilioService.hangupCall(tenantId, callSid);
        res.json(result);
    } catch (error) {
        logger.error('Error hanging up call', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * List Phone Numbers
 */
router.get('/phone-numbers', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const numbers = await twilioService.getPhoneNumbers(tenantId, 20);
        res.json(numbers);
    } catch (error) {
        logger.error('Error fetching phone numbers', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get Call Statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { startDate, endDate } = req.query;

        const stats = await twilioService.getCallStats(tenantId, {
            startDate,
            endDate
        });

        res.json(stats);
    } catch (error) {
        logger.error('Error fetching stats', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update Phone Number Webhook
 */
router.post('/phone-numbers/:sid/webhook', authenticateToken, async (req, res) => {
    try {
        const { sid } = req.params;
        const { webhookUrl } = req.body;
        const tenantId = req.user.tenantId;

        if (!webhookUrl) {
            return res.status(400).json({ error: 'webhookUrl is required' });
        }

        const result = await twilioService.updatePhoneNumberWebhook(
            tenantId,
            sid,
            webhookUrl
        );

        res.json(result);
    } catch (error) {
        logger.error('Error updating webhook', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
