const axios = require('axios');
const prisma = require('../lib/prisma');
const notificationService = require('./notificationService');
const eventBus = require('../lib/eventBus');

class PaystackService {
    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY;
        this.baseURL = 'https://api.paystack.co';

        if (!this.secretKey) {
            console.warn('⚠️ Paystack Secret Key Missing. Payment features will be disabled.');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Initialize a Paystack Transaction
     * @param {string} userId 
     * @param {string} plan (Startup, Growth, Enterprise)
     * @param {string} email 
     */
    async initializeTransaction(userId, plan, email, callbackUrl) {
        if (!this.secretKey) throw new Error('Paystack not configured');

        // Define Plan Pricing (in Kobo/Cents - Paystack uses minor currency unit)
        // Assuming USD for now based on app, but Paystack is NGN by default unless supports USD.
        // If USD is enabled on Paystack account, currency: 'USD'.
        // Let's assume standard Pricing for now.
        const PRICE_MAP = {
            'Startup': 2900, // $29.00
            'Growth': 7900,  // $79.00
            'Enterprise': 19900 // $199.00
        };

        const amount = PRICE_MAP[plan] || 2900;

        try {
            const response = await this.client.post('/transaction/initialize', {
                email,
                amount: amount * 100, // Convert to lowest unit (e.g., cents/kobo)
                currency: 'USD', // Ensure USD is supported by your Paystack credentials!
                callback_url: callbackUrl,
                metadata: {
                    userId,
                    plan,
                    custom_fields: [
                        { display_name: "Plan", variable_name: "plan", value: plan },
                        { display_name: "User ID", variable_name: "userId", value: userId }
                    ]
                }
            });

            const { authorization_url, access_code, reference } = response.data.data;

            // Log pending transaction
            await prisma.transaction.create({
                data: {
                    userId,
                    amount: amount,
                    currency: 'USD',
                    status: 'PENDING',
                    reference: reference, // Paystack Reference
                    plan: plan,
                    metadata: { access_code }
                }
            });

            return { url: authorization_url, reference, accessCode: access_code };

        } catch (error) {
            console.error('Paystack Init Error:', error.response?.data || error.message);
            throw new Error('Failed to initialize Paystack transaction');
        }
    }

    /**
     * Verify Transaction (Called via Webhook or Callback)
     */
    async verifyTransaction(reference) {
        if (!this.secretKey) throw new Error('Paystack not configured');

        try {
            const response = await this.client.get(`/transaction/verify/${reference}`);
            const data = response.data.data;

            if (data.status === 'success') {
                await this.handleSuccess(data);
                return { success: true, data };
            } else {
                return { success: false, status: data.status };
            }

        } catch (error) {
            console.error('Paystack Verify Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Handle Internal Success Logic
     */
    async handleSuccess(data) {
        const reference = data.reference;
        const metadata = data.metadata;
        const userId = metadata.userId;
        const amount = data.amount / 100;

        // 1. Update Transaction
        const transaction = await prisma.transaction.findFirst({ where: { reference } });

        if (transaction && transaction.status !== 'SUCCESS') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'SUCCESS',
                    paidAt: new Date(),
                    metadata: { ...transaction.metadata, paystack_id: data.id }
                }
            });

            // 2. Update/Create Subscription
            if (userId) {
                const plan = metadata.plan || 'Startup';

                // Calculate Expiry (30 days)
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 30);

                // Upsert Subscription
                const sub = await prisma.subscription.findUnique({ where: { userId } });

                if (sub) {
                    await prisma.subscription.update({
                        where: { userId },
                        data: {
                            status: 'Active',
                            plan: plan,
                            startDate: startDate,
                            endDate: endDate,
                            paymentProvider: 'paystack',
                            paymentId: data.id.toString()
                        }
                    });
                } else {
                    await prisma.subscription.create({
                        data: {
                            userId,
                            status: 'Active',
                            plan: plan,
                            startDate: startDate,
                            endDate: endDate,
                            paymentProvider: 'paystack',
                            paymentId: data.id.toString()
                        }
                    });
                }

                // Update Tenant Plan Linking
                const user = await prisma.user.findUnique({ where: { id: userId }, include: { tenant: true } });
                if (user && user.tenantId) {
                    // Link to SubscriptionPlan model logic would go here if we are strictly using IDs
                    // For now, updating the legacy/hybrid string field is safer for compatibility
                    await prisma.tenant.update({
                        where: { id: user.tenantId },
                        data: { plan: plan }
                    });

                    // Emit Event
                    eventBus.emit('payment:success', {
                        user,
                        amount: amount * 100, // in cents for consistency
                        reference,
                        plan
                    });
                }
            }

            console.log(`✅ Paystack Transaction Verified: ${reference}`);
        }
    }
}

module.exports = new PaystackService();
