const twilio = require('twilio');
const prisma = require('../lib/prisma');
const chatService = require('./chatService');

class TwilioService {
    /**
     * Get Twilio Client for a specific tenant
     * Falls back to global env vars if tenant has no specific config
     */
    async getClientForTenant(tenantId) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { twilioConfig: true }
        });

        const config = tenant?.twilioConfig || {};
        const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
        const apiKeySid = config.apiKeySid || process.env.TWILIO_API_KEY_SID;
        const apiKeySecret = config.apiKeySecret || process.env.TWILIO_API_KEY_SECRET;
        const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;

        if (process.env.NODE_ENV !== 'production' && !accountSid) {
            console.warn('[Twilio] Missing credentials in dev mode');
            return null;
        }

        if (!accountSid) {
            throw new Error('Twilio Account SID not found.');
        }

        let client;
        if (apiKeySid && apiKeySecret) {
            client = twilio(apiKeySid, apiKeySecret, { accountSid });
        } else if (authToken) {
            client = twilio(accountSid, authToken);
        } else {
            throw new Error('Twilio credentials missing.');
        }

        return {
            client,
            phoneNumber: config.phoneNumber || process.env.TWILIO_PHONE_NUMBER,
            accountSid
        };
    }

    /**
     * Send SMS
     */
    async sendSms(tenantId, to, body) {
        try {
            const { client, phoneNumber } = await this.getClientForTenant(tenantId);

            if (!phoneNumber) {
                throw new Error('No Twilio phone number configured.');
            }

            const message = await client.messages.create({
                body,
                from: phoneNumber,
                to
            });

            console.log(`[Twilio] SMS sent for Tenant ${tenantId}: ${message.sid}`);
            return message;
        } catch (error) {
            console.error('[Twilio] SMS Error:', error);
            throw error;
        }
    }

    /**
     * Make Outbound Call
     */
    async makeCall(tenantId, to, script, customData = {}) {
        try {
            const { client, phoneNumber } = await this.getClientForTenant(tenantId);
            // Add tenantId to the webhook so the voice stream knows the context
            const webhookUrl = `${process.env.APP_URL}/api/twilio/webhook/voice/outbound?tenantId=${tenantId}`;

            const call = await client.calls.create({
                url: `${webhookUrl}&script=${encodeURIComponent(script)}`,
                to,
                from: phoneNumber
            });

            console.log(`[Twilio] Call initiated for Tenant ${tenantId}: ${call.sid}`);
            return call;
        } catch (error) {
            console.error('[Twilio] Call Error:', error);
            throw error;
        }
    }

    /**
     * Handle Inbound Voice Webhook
     */
    async handleInboundVoice(params) {
        const logger = require('../lib/logger')('TwilioService');
        try {
            const { To, From, CallSid } = params;
            logger.info('Inbound voice webhook', { To, From, CallSid });

            const cleanTo = To.replace('+', '');
            let tenant = null;
            try {
                tenant = await prisma.tenant.findFirst({
                    where: {
                        OR: [
                            { phoneNumber: To },
                            { phoneNumber: cleanTo },
                            { phoneNumber: `+${cleanTo}` }
                        ]
                    },
                    select: { id: true, name: true }
                });
                if (tenant) {
                    logger.info('Tenant identified', { tenantId: tenant.id, name: tenant.name });
                } else {
                    logger.warn('No tenant found for number', { To });
                }
            } catch (dbErr) {
                logger.error('Tenant lookup error', { error: dbErr.message, stack: dbErr.stack });
            }

            const voiceResponse = new twilio.twiml.VoiceResponse();

            let host = 'localhost:5000';
            try {
                if (process.env.APP_URL) {
                    host = new URL(process.env.APP_URL).host;
                }
            } catch (e) {
                logger.warn('Invalid APP_URL, using localhost', { error: e.message });
            }

            const connect = voiceResponse.connect();
            const stream = connect.stream({ url: `wss://${host}/api/voice/stream` }); // Stream connection

            // Pass tenantId so VoiceService can identify the correct tenant on the start event
            if (tenant && tenant.id) {
                stream.parameter({ name: 'tenantId', value: tenant.id });
            }

            return voiceResponse.toString();
        } catch (err) {
            logger.error('Unexpected error in handleInboundVoice', { error: err.message, stack: err.stack });
            const errorResponse = new twilio.twiml.VoiceResponse();
            errorResponse.say('Sorry, an error occurred. Please try again later.');
            return errorResponse.toString();
        }
    }

    /**
     * Handle Inbound SMS
     */
    async handleInboundSms(params) {
        const { To, From, Body } = params;
        console.log(`[Twilio] Inbound SMS from ${From} to ${To}: ${Body}`);

        const tenant = await prisma.tenant.findFirst({
            where: { phoneNumber: To }
        });

        if (!tenant) {
            console.warn(`[Twilio] SMS sent to unknown number: ${To}`);
            return null;
        }

        const sessionId = `sms_${From.replace(/\D/g, '')}`;

        await prisma.message.create({
            data: {
                tenantId: tenant.id,
                sessionId,
                role: 'user',
                content: Body,
                source: 'sms'
            }
        });

        const response = await chatService.processMessage(Body, tenant.id);

        if (response?.response) {
            await prisma.message.create({
                data: {
                    tenantId: tenant.id,
                    sessionId,
                    role: 'assistant',
                    content: response.response,
                    source: 'sms'
                }
            });

            await this.sendSms(tenant.id, From, response.response);
        }

        return { success: true, sessionId };
    }

    /**
     * Get real-time call status
     */
    async getCallStatus(tenantId, callSid) {
        try {
            const { client } = await this.getClientForTenant(tenantId);
            const call = await client.calls(callSid).fetch();

            return {
                callSid: call.sid,
                status: call.status,
                duration: call.duration,
                from: call.from,
                to: call.to
            };
        } catch (error) {
            console.error(`[Twilio] Error fetching call ${callSid}:`, error.message);
            throw new Error(`Failed to fetch call status: ${error.message}`);
        }
    }

    /**
     * Hang up active call
     */
    async hangupCall(tenantId, callSid) {
        try {
            const { client } = await this.getClientForTenant(tenantId);

            const call = await client.calls(callSid).update({ status: 'completed' });

            await prisma.callSession.updateMany({
                where: { tenantId, callSid },
                data: { status: 'completed', endedAt: new Date() }
            });

            return { success: true, status: call.status };
        } catch (error) {
            console.error(`[Twilio] Failed to hangup call ${callSid}:`, error);
            throw error;
        }
    }

    /**
     * List available phone numbers for a tenant account
     * Used for dashboard number selection
     */
    async getPhoneNumbers(tenantId, limit = 20) {
        try {
            const { client } = await this.getClientForTenant(tenantId);

            const numbers = await client.incomingPhoneNumbers.list({ limit });

            return numbers.map(num => ({
                sid: num.sid,
                phoneNumber: num.phoneNumber,
                friendlyName: num.friendlyName,
                capabilities: num.capabilities,
                voiceUrl: num.voiceUrl,
                smsUrl: num.smsUrl,
                status: num.status
            }));
        } catch (error) {
            console.error('[Twilio] Error listing numbers:', error);
            throw error;
        }
    }

    /**
    * Get aggregate call statistics
    * Replaces the old VoiceCake stats endpoint
    */
    async getCallStats(tenantId, { startDate, endDate } = {}) {
        const where = { tenantId };
        if (startDate && endDate) {
            where.startedAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const stats = await prisma.callSession.aggregate({
            where,
            _count: {
                id: true
            },
            _avg: {
                duration: true
            }
        });

        const byStatus = await prisma.callSession.groupBy({
            by: ['status'],
            where,
            _count: { id: true }
        });

        const statusCounts = byStatus.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
        }, {});

        return {
            totalCalls: stats._count.id || 0,
            avgDuration: Math.round(stats._avg.duration || 0),
            completed: statusCounts.completed || 0,
            failed: statusCounts.failed || 0,
            inProgress: statusCounts.in_progress || 0,
            estimatedCost: ((stats._count.id || 0) * 0.01).toFixed(2)
        };
    }

    /**
   * Update webhook URL for a specific phone number
   * Essential for configuring new numbers automatically
   */
    async updatePhoneNumberWebhook(tenantId, phoneNumberSid, webhookUrl) {
        try {
            const { client } = await this.getClientForTenant(tenantId);

            const number = await client.incomingPhoneNumbers(phoneNumberSid).update({
                voiceUrl: webhookUrl,
                voiceMethod: 'POST',
                smsUrl: webhookUrl.replace('/voice', '/sms'),
                smsMethod: 'POST'
            });

            return {
                sid: number.sid,
                phoneNumber: number.phoneNumber,
                voiceUrl: number.voiceUrl,
                smsUrl: number.smsUrl
            };
        } catch (error) {
            console.error('[Twilio] Error updating webhook:', error);
            throw error;
        }
    }
}

module.exports = new TwilioService();
