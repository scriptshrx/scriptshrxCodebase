const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Stripe Webhook
// Paystack Integration Endpoints
router.post('/paystack/initiate', authenticateToken, async (req, res, next) => {
    try {
        const { plan, email, callbackUrl } = req.body;
        // userId from token
        const userId = req.user?.userId || req.user?.id;
        if (!plan || !email) {
            return res.status(400).json({ success: false, error: 'plan and email are required' });
        }
        const result = await require('../services/paystackService').initializeTransaction(userId, plan, email, callbackUrl);
        res.json({ success: true, url: result.url, reference: result.reference });
    } catch (error) {
        next(error);
    }
});

// Paystack Webhook - verify transaction
router.post('/paystack/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
    if (hash !== signature) {
        console.warn('⚠️ Paystack webhook signature mismatch');
        return res.status(400).send('Invalid signature');
    }
    const event = JSON.parse(req.body);
    if (event.event === 'charge.success') {
        const reference = event.data.reference;
        try {
            await require('../services/paystackService').verifyTransaction(reference);
            res.json({ status: 'ok' });
        } catch (e) {
            console.error('Paystack webhook handling error', e);
            res.status(500).send('Error');
        }
    } else {
        res.json({ status: 'ignored' });
    }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        logger.warn('Stripe not configured, skipping webhook');
        return res.status(503).send('Stripe not configured');
    }
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // req.rawBody must be available. 
        // Note: In app.js, ensure rawBody is captured or use express.raw() here if not processed yet.
        // But app.js likely applies bodyParser globally. 
        // The safest way with global JSON parser is to verify signature using the raw buffer captured.
        // Assuming app.js captures `req.rawBody` as seen in previous view_file of app.js.
        event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, endpointSecret);
    } catch (err) {
        logger.error(`Webhook Signature Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await paymentService.handleCheckoutSuccess(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await paymentService.handleInvoicePaid(event.data.object);
                break;
            default:
            // console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    } catch (err) {
        logger.error(`Webhook Processing Failed: ${err.message}`);
        res.status(500).send(`Server Error: ${err.message}`);
    }
});

// Create Checkout Session
router.post('/create-session', authenticateToken, async (req, res, next) => {
    try {
        const { plan, cycle } = req.body;
        if (!plan) throw new AppError('Plan is required', 400);

        const { url, reference } = await paymentService.initiateTransaction(req.user.userId, plan, cycle);

        res.json({ url, reference });
    } catch (error) {
        next(error);
    }
});

// Portal
router.post('/portal', authenticateToken, async (req, res, next) => {
    try {
        const { url } = await paymentService.createPortalSession(req.user.userId);
        res.json({ url });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
