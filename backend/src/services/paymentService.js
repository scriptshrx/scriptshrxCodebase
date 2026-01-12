const prisma = require('../lib/prisma');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

class PaymentService {
    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.warn('⚠️ Stripe Secret Key Missing. Payment features will be disabled.');
        }
    }

    // Initialize Stripe Checkout Session
    async initiateTransaction(userId, plan, cycle = 'monthly') {
        if (!process.env.STRIPE_SECRET_KEY) throw new AppError('Payment processing unavailable.', 503);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { tenant: true }
        });

        if (!user) throw new AppError('User not found', 404);

        // Map Plans to Stripe Price IDs (You should set these in .env or a config)
        const priceMap = {
            'Basic': process.env.STRIPE_PRICE_BASIC || 'price_basic_placeholder',
            'Intermediate': process.env.STRIPE_PRICE_INTERMEDIATE || 'price_intermediate_placeholder',
            'Advanced': process.env.STRIPE_PRICE_ADVANCED || 'price_advanced_placeholder'
        };

        const priceId = priceMap[plan];
        // Fallback for demo/test if no price ID: use ad-hoc line item
        const fallbackAmount = plan === 'Basic' ? 2900 : plan === 'Intermediate' ? 7900 : 19900; // Cents

        try {
            const sessionConfig = {
                payment_method_types: ['card'],
                mode: 'subscription',
                customer_email: user.email,
                client_reference_id: user.id,
                metadata: {
                    userId: user.id,
                    tenantId: user.tenantId,
                    plan,
                    cycle
                },
                line_items: priceId && !priceId.includes('placeholder') ? [
                    { price: priceId, quantity: 1 }
                ] : [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `${plan} Plan Subscription`,
                            },
                            unit_amount: fallbackAmount, // amount in cents
                            recurring: {
                                interval: cycle === 'yearly' ? 'year' : 'month',
                            },
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription?status=cancelled`,
            };

            const session = await stripe.checkout.sessions.create(sessionConfig);

            // PERSIST TRANSACTION TO DB (Pending)
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    tenantId: user.tenantId, // Store tenant context
                    reference: session.id, // Use Session ID as reference
                    amount: session.amount_total || fallbackAmount,
                    currency: session.currency || 'usd',
                    status: 'INITIATED',
                    plan: plan,
                    metadata: { ...sessionConfig.metadata, checkoutUrl: session.url }
                }
            });

            console.log(`✅ Stripe Session Initiated: ${session.id}`);
            return { url: session.url, reference: session.id };
        } catch (error) {
            console.error('Stripe Init Error:', error.message);
            throw new AppError('Failed to initiate payment', 502);
        }
    }

    // Handle Completed Checkout via Webhook
    async handleCheckoutSuccess(session) {
        const reference = session.id;
        const metadata = session.metadata || {};
        const amount = session.amount_total || session.amount_subtotal;

        // Find existing transaction or create (if webhook comes first)
        const existingTx = await prisma.transaction.findFirst({
            where: { reference }
        });

        // 1. Update/Create Transaction
        await prisma.$transaction(async (tx) => {
            if (existingTx) {
                await tx.transaction.update({
                    where: { id: existingTx.id },
                    data: {
                        status: 'SUCCESS',
                        paidAt: new Date(),
                        metadata: { ...existingTx.metadata, stripePaymentIntent: session.payment_intent }
                    }
                });
            } else {
                await tx.transaction.create({
                    data: {
                        userId: metadata.userId, // Might be null if direct Stripe link used, handle with care
                        tenantId: metadata.tenantId,
                        reference: reference,
                        amount: amount || 0,
                        currency: session.currency || 'usd',
                        status: 'SUCCESS',
                        plan: metadata.plan || 'Unknown',
                        paidAt: new Date(),
                        metadata: session
                    }
                });
            }

            // 2. Update Subscription
            if (metadata.userId) {
                const plan = metadata.plan || 'Basic';
                await tx.subscription.upsert({
                    where: { userId: metadata.userId },
                    create: {
                        userId: metadata.userId,
                        plan: plan,
                        status: 'active',
                        stripeId: session.subscription || session.payment_intent, // Sub ID for recurring
                        startDate: new Date(),
                        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Rough default
                    },
                    update: {
                        plan: plan,
                        status: 'active',
                        stripeId: session.subscription || session.payment_intent,
                        updatedAt: new Date()
                    }
                });

                // Update Tenant
                if (metadata.tenantId) {
                    await tx.tenant.update({
                        where: { id: metadata.tenantId },
                        data: { plan: plan }
                    });
                }
            }
        });

        console.log(`✅ Stripe Payment Verified: ${reference}`);

        // 3. Notify
        try {
            const user = await prisma.user.findUnique({ where: { id: metadata.userId } });
            if (user) {
                await this.sendSuccessEmail(user, (amount / 100).toFixed(2), reference, metadata.plan);
            }
        } catch (e) {
            console.error('Notification error:', e.message);
        }
    }

    // Handle Invoice Paid (Recurring renewal)
    async handleInvoicePaid(invoice) {
        // Logic to extend subscription expiry based on invoice period
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) return;

        console.log(`💰 Invoice Paid for Sub: ${subscriptionId}`);
        // Find subscription by stripeId
        const sub = await prisma.subscription.findFirst({ where: { stripeId: subscriptionId } });
        if (sub) {
            await prisma.subscription.update({
                where: { id: sub.id },
                data: {
                    status: 'active',
                    // Extend date based on invoice period_end
                    endDate: new Date(invoice.lines.data[0].period.end * 1000)
                }
            });
        }
    }

    async sendSuccessEmail(user, amount, reference, plan) {
        const subject = `Payment Successful - ${plan} Plan`;
        const body = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Payment Confirmed!</h2>
                <p>Hi ${user.name || 'there'},</p>
                <p>We successfully received your payment of <strong>$${amount}</strong> for the <strong>${plan}</strong> plan.</p>
                <p><strong>Reference:</strong> ${reference}</p>
                <p>Your subscription is now active.</p>
            </div>
        `;
        await notificationService.sendEmail(user.email, subject, body);
    }

    async createPortalSession(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true }
        });

        if (!user || !user.subscription || !user.subscription.stripeId) {
            throw new AppError('No active stripe subscription found', 400);
        }

        // Quick fix: Retrieve sub from Stripe to get customer ID
        const sub = await stripe.subscriptions.retrieve(user.subscription.stripeId);
        const session = await stripe.billingPortal.sessions.create({
            customer: sub.customer,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings`,
        });

        return { url: session.url };
    }
}

module.exports = new PaymentService();
