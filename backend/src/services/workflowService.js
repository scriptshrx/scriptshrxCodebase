const prisma = require('../lib/prisma');
const notificationService = require('./notificationService');

class WorkflowService {
    /**
     * Trigger workflows for a specific event
     * @param {string} eventName - The event trigger (e.g., 'booking:created')
     * @param {string} tenantId - The tenant ID
     * @param {object} data - Context data for the workflow
     */
    async trigger(eventName, tenantId, data) {
        console.log(`[Workflow] Triggering '${eventName}' for tenant ${tenantId}`);

        try {
            // Find active workflows matching this trigger
            const workflows = await prisma.workflow.findMany({
                where: {
                    tenantId,
                    trigger: eventName,
                    isActive: true
                }
            });

            if (workflows.length === 0) {
                console.log(`[Workflow] No active workflows found for '${eventName}'`);
                return;
            }

            console.log(`[Workflow] Found ${workflows.length} workflows to execute.`);

            // Execute each workflow
            const results = await Promise.all(workflows.map(async (wf) => {
                try {
                    await this.executeWorkflow(wf, data);
                    return { id: wf.id, status: 'success' };
                } catch (e) {
                    console.error(`[Workflow] Failed to execute workflow ${wf.id}:`, e);
                    return { id: wf.id, status: 'error', error: e.message };
                }
            }));

            return results;

        } catch (error) {
            console.error('[Workflow] Error triggering workflows:', error);
        }
    }

    /**
     * Execute a single workflow
     */
    async executeWorkflow(workflow, context) {
        let actions = [];
        try {
            actions = JSON.parse(workflow.actions);
        } catch (e) {
            console.error(`[Workflow] Invalid JSON actions for workflow ${workflow.id}`);
            return;
        }

        console.log(`[Workflow] Executing ${workflow.name} (${actions.length} actions)`);

        for (const action of actions) {
            await this.performAction(action, context, workflow.tenantId);
        }

        // Log execution
        await prisma.auditLog.create({
            data: {
                tenantId: workflow.tenantId,
                action: 'Workflow Executed',
                details: `Executed workflow '${workflow.name}' (Trigger: ${workflow.trigger})`,
            }
        }).catch(err => console.error('AuditLog Error:', err)); // Non-blocking
    }

    /**
     * Perform a single action
     */
    async performAction(action, context, tenantId) {
        try {
            switch (action.type) {
                case 'send_email':
                    await this.handleEmailAction(action, context);
                    break;
                case 'send_sms':
                    await this.handleSmsAction(action, context, tenantId);
                    break;
                case 'notification':
                    await this.handleSystemNotification(action, context);
                    break;
                default:
                    console.warn(`[Workflow] Unknown action type: ${action.type}`);
            }
        } catch (error) {
            console.error(`[Workflow] Action failed (${action.type}):`, error.message);
            throw error;
        }
    }

    // --- Action Handlers ---

    async handleEmailAction(action, context) {
        // Resolve dynamic fields 
        const to = this.resolveField(action.to, context);
        const subject = this.resolveField(action.subject, context);
        const body = this.resolveField(action.body, context);

        if (to && subject && body) {
            await notificationService.sendEmail(to, subject, body);
        }
    }

    async handleSmsAction(action, context, tenantId) {
        const to = this.resolveField(action.to, context);
        const inputBody = action.message || action.body; // handle inconsistent naming
        const message = this.resolveField(inputBody, context);

        if (to && message) {
            await notificationService.sendSMS(to, message, tenantId);
        }
    }

    async handleSystemNotification(action, context) {
        const userId = this.resolveField(action.userId, context);
        const title = this.resolveField(action.title, context);
        const message = this.resolveField(action.message, context);

        if (userId) {
            await notificationService.createNotification(
                userId,
                title || 'New Workflow Notification',
                message || 'A workflow action occurred.',
                'info'
            );
        }
    }

    /**
     * Helper to resolve placeholders like {{client.email}}
     */
    resolveField(template, context) {
        if (!template) return null;
        if (typeof template !== 'string') return template;

        return template.replace(/\{\{([\w\.]+)\}\}/g, (match, key) => {
            const keys = key.split('.');
            let value = context;
            for (const k of keys) {
                value = value ? value[k] : null;
            }
            return value !== null && value !== undefined ? value : '';
        });
    }
}

const eventBus = require('../lib/eventBus');

// Listener for Async Workflow Triggers
eventBus.on('workflow.triggered', async ({ tenantId, event, data }) => {
    await module.exports.trigger(event, tenantId, data);
});

// Also listen for domain events directly (e.g. 'booking.created') to auto-trigger workflows
eventBus.on('booking.created', async ({ tenantId, bookingId }) => {
    // We need to fetch context first? Or does trigger() handle it?
    // The previous implementation passed full objects {client, tenant, etc.} to trigger.
    // Here we only have IDs.
    // Ideally, the Service emitting the event should pass the necessary data context.
    // But since 'booking.created' event in BookingService only had IDs...
    // We'll let the specific service logic handle the data fetching if needed, OR we expect 'booking.created' to carry data.
    // In BookingService: eventBus.emit('booking.created', { bookingId: booking.id, tenantId });
    // So we don't have the full context here.

    // Strategy: We won't auto-trigger here if context is missing. usage:
    // await workflowService.trigger('booking:created', ...) was called manually in BookingService.
    // So for now, we leave this commented or we rely on explicit workflow.triggered event.
});

module.exports = new WorkflowService();
