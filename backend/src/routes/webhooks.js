const express = require('express');
const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const prisma = require('../lib/prisma');
const notificationService = require('../services/notificationService');
const logger = require('../lib/logger')('PaymentWebhooks');

/**
 * STRIPE WEBHOOK HANDLER
 * Critical Requirements:
 * 1. Verify Signature using STRIPE_WEBHOOK_SECRET
 * 2. Idempotency (check if event already processed)
 * 3. Atomic DB updates (Subscription + Transaction)
 */
router.post('/stripe', async (req, res) => {
    if (!stripe) {
        logger.warn('Stripe not configured, skipping webhook');
        return res.status(503).send('Stripe not configured');
    }
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        // Use rawBody from app.js middleware for signature verification
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        logger.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // IDEMPOTENCY CHECK
    // Check if this event ID has already been processed to verify resilience against retries
    const existingEvent = await prisma.webhookEvent.findUnique({
        where: { eventId: event.id }
    });

    if (existingEvent) {
        logger.info(`Event ${event.id} already processed. Skipping.`);
        return res.json({ received: true });
    }

    // Save event processing start (Atomic lock concept)
    try {
        await prisma.webhookEvent.create({
            data: {
                eventId: event.id,
                type: event.type,
                provider: 'stripe',
                status: 'processing'
            }
        });
    } catch (e) {
        // Checking explicitly for race condition on create if prisma throws unique constraint here
        logger.warn(`Duplicate event race condition: ${event.id}`);
        return res.json({ received: true });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            default:
                logger.debug(`Unhandled event type ${event.type}`);
        }

        // Mark event as success
        await prisma.webhookEvent.update({
            where: { eventId: event.id },
            data: { status: 'success', processedAt: new Date() }
        });

        res.json({ received: true });

    } catch (error) {
        logger.error(`Error processing event ${event.id}:`, error);

        // Mark event as failed so we can debug or retry manually
        await prisma.webhookEvent.update({
            where: { eventId: event.id },
            data: { status: 'failed', error: error.message }
        });

        // Return 500 to trigger Stripe retry (exponential backoff)
        res.status(500).send('Webhook processing failed');
    }
});


// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutSessionCompleted(session) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId; // e.g., 'growth_monthly'

    if (!userId || !planId) {
        logger.warn('Missing metadata in Checkout Session', { id: session.id });
        return;
    }

    logger.info(`Processing Checkout Success for User ${userId}, Plan ${planId}`);

    // Update User Subscription in Transaction
    await prisma.$transaction(async (tx) => {
        // 1. Create/Update Subscription
        const subscription = await tx.subscription.upsert({
            where: { userId },
            create: {
                userId,
                stripeIds: { subscription: session.subscription, customer: session.customer },
                planId,
                status: 'active',
                startDate: new Date(),
                endDate: new Date(session.expires_at ? session.expires_at * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            update: {
                stripeIds: { subscription: session.subscription, customer: session.customer },
                planId,
                status: 'active',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Rough Estimate, real date comes from invoice
            }
        });

        // 2. Record Transaction
        await tx.transaction.create({
            data: {
                userId,
                amount: session.amount_total / 100,
                currency: session.currency,
                status: 'succeeded',
                provider: 'stripe',
                providerReference: session.payment_intent || session.id,
                metadata: { planId, type: 'subscription_creation' }
            }
        });

        // 3. User Notification
        await notificationService.sendTemplatedEmail(
            session.customer_details?.email,
            'PAYMENT_SUCCESS',
            {
                amount: (session.amount_total / 100).toFixed(2),
                planName: planId.toUpperCase(),
                date: new Date().toLocaleDateString()
            }
        );
    });
}

async function handleInvoicePaymentSucceeded(invoice) {
    if (invoice.billing_reason === 'subscription_create') return; // Handled by checkout.session

    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    // Find user by Stripe Customer ID
    const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId }
    });

    if (!user) {
        logger.warn(`User not found for Stripe Customer ${customerId}`);
        return;
    }

    await prisma.$transaction(async (tx) => {
        // 1. Extend Subscription
        await tx.subscription.updateMany({
            where: { userId: user.id },
            data: {
                status: 'active',
                endDate: new Date(invoice.lines.data[0].period.end * 1000)
            }
        });

        // 2. Log Transaction
        await tx.transaction.create({
            data: {
                userId: user.id,
                amount: invoice.amount_paid / 100,
                currency: invoice.currency,
                status: 'succeeded',
                provider: 'stripe',
                providerReference: invoice.payment_intent || invoice.id,
                metadata: { subscriptionId, type: 'renewal' }
            }
        });
    });
}

async function handleInvoicePaymentFailed(invoice) {
    const customerId = invoice.customer;
    const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });

    if (user) {
        await prisma.subscription.updateMany({
            where: { userId: user.id },
            data: { status: 'past_due' }
        });

        await notificationService.sendTemplatedEmail(
            user.email,
            'PAYMENT_FAILED',
            {
                amount: (invoice.amount_due / 100).toFixed(2),
                link: invoice.hosted_invoice_url
            }
        );
    }
}

async function handleSubscriptionUpdated(subscription) {
    // Handle status changes (e.g. active -> past_due, canceled)
    const status = subscription.status;
    const customerId = subscription.customer;

    await prisma.subscription.updateMany({
        where: {
            // We might need to find by stripeCustomerId if stored on user, or stripeIds column in subscription
            // Doing a robust look up:
            user: { stripeCustomerId: customerId }
        },
        data: {
            status: status,
            endDate: new Date(subscription.current_period_end * 1000)
        }
    });
}

async function handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;
    await prisma.subscription.updateMany({
        where: { user: { stripeCustomerId: customerId } },
        data: { status: 'canceled', endDate: new Date() }
    });
}

module.exports = router;