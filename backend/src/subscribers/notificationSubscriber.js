const eventBus = require('../lib/eventBus');
const notificationService = require('../services/notificationService');
const workflowService = require('../services/workflowService');
const socketService = require('../services/socketService');
const prisma = require('../lib/prisma');

class NotificationSubscriber {
    constructor() {
        this.initialize();
    }

    initialize() {
        console.log('[NotificationSubscriber] Listening for events...');

        eventBus.on('booking:created', async (data) => {
            console.log('[EventBus] booking:created received');
            await this.handleBookingCreated(data);
        });

        eventBus.on('payment:success', async (data) => {
            console.log('[EventBus] payment:success received');
            await this.handlePaymentSuccess(data);
        });

        eventBus.on('meeting_minute:created', async (data) => {
            console.log('[EventBus] meeting_minute:created received');
            await this.handleMeetingMinuteCreated(data);
        });

        // NEW: Priority Lead Alerts (Enterprise Feature)
        eventBus.on('lead:priority_alert', async (data) => {
            console.log('[EventBus] lead:priority_alert received');
            await this.handlePriorityLeadAlert(data);
        });

        // NEW: Call sentiment analysis complete
        eventBus.on('call:analyzed', async (data) => {
            console.log('[EventBus] call:analyzed received');
            await this.handleCallAnalyzed(data);
        });
    }

    async handleMeetingMinuteCreated(data) {
        const { client, tenant, content } = data;
        if (!client || !client.email) return;

        await notificationService.sendTemplatedEmail(
            client.email,
            'MEETING_MINUTES',
            {
                tenantName: tenant.name,
                content: content
            }
        );
    }

    async handleBookingCreated(data) {
        const { tenantId, client, tenant, booking } = data;

        // 1. Trigger User-Defined Workflows
        await workflowService.trigger('booking:created', tenantId, data);

        // 2. Default Transactional Notifications
        if (client && client.email) {
            await notificationService.sendTemplatedEmail(
                client.email,
                'BOOKING_CONFIRMATION',
                {
                    tenantName: tenant.name,
                    clientName: client.name,
                    date: new Date(booking.date).toLocaleString(),
                    status: booking.status
                }
            );
        }
    }

    async handlePaymentSuccess(data) {
        const { user, amount, reference } = data;

        await notificationService.sendEmail(
            user.email,
            'Payment Receipt',
            `<p>Thank you for your payment of ${(amount / 100).toFixed(2)}.</p><p>Ref: ${reference}</p>`
        );
    }

    /**
     * Handle Priority Lead Alert (Enterprise Feature)
     * Sends real-time notification when AI detects high-priority lead
     */
    async handlePriorityLeadAlert(data) {
        const { tenantId, clientId, analysis, message, priority, reason } = data;

        try {
            // Find tenant owner for notification
            const owner = await prisma.user.findFirst({
                where: { tenantId, role: 'OWNER' }
            });

            const client = clientId ? await prisma.client.findUnique({
                where: { id: clientId }
            }) : null;

            // 1. Send real-time WebSocket notification to dashboard
            try {
                socketService.sendToTenant(tenantId, 'alert:priority_lead', {
                    clientId,
                    clientName: client?.name || 'Unknown',
                    analysis,
                    priority: priority || 'high',
                    reason: reason || 'High-priority lead detected',
                    message: message?.substring(0, 200), // Truncate for security
                    timestamp: new Date().toISOString()
                });
            } catch (socketErr) {
                console.error('[NotificationSubscriber] Socket error:', socketErr.message);
            }

            // 2. Send email to owner if critical
            if (owner && (priority === 'critical' || analysis?.sentiment === 'angry')) {
                const sentimentEmoji = {
                    'positive': '😊',
                    'neutral': '😐',
                    'frustrated': '😤',
                    'angry': '😡'
                };

                await notificationService.sendEmail(
                    owner.email,
                    `🚨 Priority Lead Alert: ${client?.name || 'New Customer'}`,
                    `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #e74c3c;">⚠️ Immediate Attention Required</h2>
                        <p><strong>Customer:</strong> ${client?.name || 'Unknown'} ${client?.phone ? `(${client.phone})` : ''}</p>
                        <p><strong>Sentiment:</strong> ${sentimentEmoji[analysis?.sentiment] || '❓'} ${analysis?.sentiment || 'unknown'}</p>
                        <p><strong>Urgency:</strong> ${analysis?.urgency || 'N/A'}/10</p>
                        <p><strong>Intent:</strong> ${analysis?.intent || 'N/A'}/10</p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <p><strong>Summary:</strong> ${analysis?.summary || 'No summary available'}</p>
                        <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; font-style: italic;">
                            "${message?.substring(0, 300) || 'No message content'}${message?.length > 300 ? '...' : ''}"
                        </p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">
                            This alert was triggered by ScriptishRx AI Analysis. 
                            <a href="${process.env.FRONTEND_URL || 'https://scriptishrx.net'}/dashboard/clients${clientId ? `?id=${clientId}` : ''}">
                                View in Dashboard →
                            </a>
                        </p>
                    </div>
                    `
                );
            }

            console.log(`[NotificationSubscriber] Priority alert processed for tenant ${tenantId}`);
        } catch (error) {
            console.error('[NotificationSubscriber] Priority alert error:', error.message);
        }
    }

    /**
     * Handle Call Analyzed Event
     * Updates call session with analysis results
     */
    async handleCallAnalyzed(data) {
        const { tenantId, callSessionId, analysis, followUpRequired } = data;

        try {
            // Notify dashboard of analysis completion
            socketService.sendToTenant(tenantId, 'call:analyzed', {
                callSessionId,
                analysis,
                followUpRequired,
                timestamp: new Date().toISOString()
            });

            // If follow-up required, create notification
            if (followUpRequired) {
                const owner = await prisma.user.findFirst({
                    where: { tenantId, role: 'OWNER' }
                });

                if (owner) {
                    await prisma.notification.create({
                        data: {
                            userId: owner.id,
                            title: 'Follow-up Required',
                            message: `Call analysis indicates follow-up needed: ${analysis?.summary || 'Check call details'}`,
                            type: 'TASK',
                            read: false
                        }
                    });
                }
            }
        } catch (error) {
            console.error('[NotificationSubscriber] Call analyzed error:', error.message);
        }
    }
}

module.exports = new NotificationSubscriber();
