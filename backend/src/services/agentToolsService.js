// backend/src/services/agentToolsService.js
/**
 * Agent Tools Service - Function Calling for Voice Agent
 * Enables the AI to perform actions during voice calls:
 * - Check appointment availability (with tenant calendar sync)
 * - Book appointments (with Google Calendar integration)
 * - Look up client information
 * - Get business information
 */

const prisma = require('../lib/prisma');
const bookingService = require('./bookingService');
const TenantCalendarService = require('./tenantCalendarService');

/**
 * Tool definitions for OpenAI Realtime API
 * These are sent during session.update to enable function calling
 */
const toolDefinitions = [
    {
        type: 'function',
        name: 'check_availability',
        description: 'Check available appointment slots for a given date. Use this when the caller asks about scheduling or availability.',
        parameters: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    description: 'The date to check availability for, in YYYY-MM-DD format'
                },
                timePreference: {
                    type: 'string',
                    enum: ['morning', 'afternoon', 'evening', 'any'],
                    description: 'Preferred time of day for the appointment'
                }
            },
            required: ['date']
        }
    },
    {
        type: 'function',
        name: 'create_booking',
        description: 'Book an appointment for the caller. Use this when the caller confirms they want to schedule an appointment.',
        parameters: {
            type: 'object',
            properties: {
                date: {
                    type: 'string',
                    description: 'The appointment date and time in ISO 8601 format (e.g., 2024-12-25T10:00:00)'
                },
                purpose: {
                    type: 'string',
                    description: 'The purpose or reason for the appointment'
                },
                clientName: {
                    type: 'string',
                    description: 'The name of the person booking the appointment'
                },
                clientPhone: {
                    type: 'string',
                    description: 'Phone number for the appointment (if different from caller)'
                },
                clientEmail: {
                    type: 'string',
                    description: 'Email address for confirmation'
                }
            },
            required: ['date', 'purpose', 'clientName']
        }
    },
    {
        type: 'function',
        name: 'lookup_client',
        description: 'Look up existing client by phone number to retrieve their information.',
        parameters: {
            type: 'object',
            properties: {
                phoneNumber: {
                    type: 'string',
                    description: 'The phone number to look up'
                }
            },
            required: ['phoneNumber']
        }
    },
    {
        type: 'function',
        name: 'get_business_info',
        description: 'Get information about the business such as services, pricing, hours, or location.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'What information the caller is asking about (e.g., "services", "pricing", "hours", "location")'
                }
            },
            required: ['query']
        }
    },
    {
        type: 'function',
        name: 'transfer_to_human',
        description: 'Transfer the call to a human agent when the AI cannot help or the caller requests it.',
        parameters: {
            type: 'object',
            properties: {
                reason: {
                    type: 'string',
                    description: 'The reason for the transfer'
                }
            },
            required: ['reason']
        }
    }
];

/**
 * Execute a tool function and return the result
 * @param {string} toolName - Name of the tool to execute
 * @param {object} args - Arguments passed to the tool
 * @param {object} context - { tenantId, callerPhone, callSessionId }
 * @returns {object} - Result to send back to OpenAI
 */
async function executeTool(toolName, args, context) {
    const { tenantId, callerPhone, callSessionId } = context;

    console.log(`[AgentTools] Executing tool: ${toolName}`, args);

    try {
        switch (toolName) {
            case 'check_availability':
                return await checkAvailability(tenantId, args.date, args.timePreference);

            case 'create_booking':
                return await createBooking(tenantId, args, callerPhone, callSessionId);

            case 'lookup_client':
                return await lookupClient(tenantId, args.phoneNumber);

            case 'get_business_info':
                return await getBusinessInfo(tenantId, args.query);

            case 'transfer_to_human':
                return await initiateTransfer(tenantId, args.reason, callSessionId);

            default:
                if (tenantId) {
                    const customTool = await prisma.customTool.findFirst({
                        where: { tenantId, name: toolName, isActive: true }
                    });

                    if (customTool) {
                        return await executeCustomTool(customTool, args, context);
                    }
                }

                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    } catch (error) {
        console.error(`[AgentTools] Error executing ${toolName}:`, error);
        return {
            success: false,
            error: `Failed to execute ${toolName}: ${error.message}`
        };
    }
}

/**
 * Check appointment availability for a given date
 * Checks both database bookings AND tenant's Google Calendar
 */
async function checkAvailability(tenantId, dateStr, timePreference = 'any') {
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Check database bookings for this tenant only
    const existingBookings = await prisma.booking.findMany({
        where: {
            tenantId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            },
            status: { not: 'Cancelled' }
        },
        select: { date: true }
    });

    const bookedHours = new Set(existingBookings.map(b => new Date(b.date).getHours()));

    // 2. Check tenant's Google Calendar if connected
    try {
        const hasCalendar = await TenantCalendarService.hasTenantCalendar(tenantId);
        if (hasCalendar) {
            const calendarBusyHours = await TenantCalendarService.getTenantCalendarBusySlots(
                tenantId,
                targetDate
            );
            calendarBusyHours.forEach(h => bookedHours.add(h));
        }
    } catch (err) {
        console.warn(`[Availability] Calendar access for tenant ${tenantId} not configured:`, err.message);
    }

    // 3. Generate available slots
    const allSlots = [];
    const startHour = timePreference === 'morning' ? 9 :
        timePreference === 'afternoon' ? 12 :
            timePreference === 'evening' ? 16 : 9;
    const endHour = timePreference === 'morning' ? 12 :
        timePreference === 'afternoon' ? 16 :
            timePreference === 'evening' ? 18 : 17;

    for (let hour = startHour; hour <= endHour; hour++) {
        if (!bookedHours.has(hour)) {
            const slotTime = new Date(targetDate);
            slotTime.setHours(hour, 0, 0, 0);
            allSlots.push({
                time: slotTime.toISOString(),
                display: slotTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                })
            });
        }
    }

    const dateDisplay = targetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    if (allSlots.length === 0) {
        return {
            success: true,
            available: false,
            message: `I'm sorry, there are no available slots on ${dateDisplay}. Would you like to check another day?`,
            date: dateStr
        };
    }

    const slotsText = allSlots.slice(0, 5).map(s => s.display).join(', ');

    return {
        success: true,
        available: true,
        date: dateStr,
        dateDisplay,
        slots: allSlots,
        message: `On ${dateDisplay}, I have the following times available: ${slotsText}. Which would you prefer?`
    };
}

/**
 * Create a booking during the call
 * Also creates Google Calendar event if tenant has calendar connected
 */
async function createBooking(tenantId, args, callerPhone, callSessionId) {
    const { date, purpose, clientName, clientPhone, clientEmail } = args;

    const phone = clientPhone || callerPhone;
    let client = await prisma.client.findFirst({
        where: { tenantId, phone }
    });

    if (!client) {
        client = await prisma.client.create({
            data: {
                tenantId,
                name: clientName,
                phone: phone,
                email: clientEmail || null,
                source: 'AI_AGENT'
            }
        });
        console.log(`[AgentTools] Created new client: ${client.id}`);
    }

    try {
        // 1. Create booking in database
        const booking = await bookingService.createBooking(tenantId, {
            clientId: client.id,
            date: new Date(date),
            purpose: purpose,
            status: 'Scheduled'
        });

        // 2. Create calendar event if tenant has calendar connected
        let meetingLink = null;
        try {
            const hasCalendar = await TenantCalendarService.hasTenantCalendar(tenantId);
            if (hasCalendar) {
                const calendarEvent = await TenantCalendarService.createTenantCalendarEvent(
                    tenantId,
                    booking,
                    clientName,
                    phone
                );
                meetingLink = calendarEvent.meetLink;

                // Update booking with meeting link
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { meetingLink }
                });

                console.log(`[AgentTools] Calendar event created for booking ${booking.id}`);
            }
        } catch (calErr) {
            console.warn(`[AgentTools] Calendar sync failed for tenant ${tenantId}:`, calErr.message);
            // Continue without calendar (non-fatal)
        }

        // 3. Update call session
        if (callSessionId) {
            await prisma.callSession.update({
                where: { id: callSessionId },
                data: {
                    bookingId: booking.id,
                    clientId: client.id
                }
            });
        }

        const bookingDate = new Date(date);
        const dateDisplay = bookingDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
        const timeDisplay = bookingDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        return {
            success: true,
            bookingId: booking.id,
            message: `Perfect! I've booked your appointment for ${dateDisplay} at ${timeDisplay}. You'll receive a confirmation shortly. Is there anything else I can help you with?`,
            booking: {
                id: booking.id,
                date: booking.date,
                purpose: booking.purpose,
                client: clientName,
                meetingLink
            }
        };
    } catch (error) {
        if (error.message.includes('CONFLICT')) {
            return {
                success: false,
                error: 'time_conflict',
                message: 'I apologize, but that time slot just became unavailable. Let me check what other times are open for you.'
            };
        }
        throw error;
    }
}

/**
 * Look up client by phone number
 */
async function lookupClient(tenantId, phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s()-]/g, '');

    const client = await prisma.client.findFirst({
        where: {
            tenantId,
            phone: { contains: cleanPhone.slice(-10) } // Match last 10 digits
        },
        include: {
            bookings: {
                where: { status: { not: 'Cancelled' } },
                orderBy: { date: 'desc' },
                take: 3
            }
        }
    });

    if (!client) {
        return {
            success: true,
            found: false,
            message: "I don't have your information on file yet. May I get your name please?"
        };
    }

    const upcomingBookings = client.bookings.filter(b => new Date(b.date) > new Date());

    return {
        success: true,
        found: true,
        client: {
            id: client.id,
            name: client.name,
            email: client.email
        },
        hasUpcomingBookings: upcomingBookings.length > 0,
        message: `Welcome back, ${client.name}! How can I help you today?`
    };
}

/**
 * Get business information based on query
 */
async function getBusinessInfo(tenantId, query) {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            name: true,
            location: true,
            aiConfig: true,
            phoneNumber: true
        }
    });

    if (!tenant) {
        return { success: false, error: 'Tenant not found' };
    }

    const aiConfig = tenant.aiConfig || {};
    const faqs = aiConfig.faqs || [];
    const lowerQuery = query.toLowerCase();

    const matchingFaq = faqs.find(faq => {
        const keywords = faq.keywords || [];
        return keywords.some(kw => lowerQuery.includes(kw.toLowerCase())) ||
            faq.question?.toLowerCase().includes(lowerQuery);
    });

    if (matchingFaq) {
        return {
            success: true,
            answer: matchingFaq.answer,
            source: 'faq'
        };
    }

    const queryType = detectQueryType(lowerQuery);



    return {
        success: true,
        queryType,
        businessName: tenant.name,
        location: tenant.location,
        message: `For detailed information about ${query}, I'd recommend speaking with one of our team members. Would you like me to have someone call you back?`
    };
}

function detectQueryType(query) {
    if (query.includes('price') || query.includes('cost') || query.includes('fee')) return 'pricing';
    if (query.includes('hour') || query.includes('open') || query.includes('close')) return 'hours';
    if (query.includes('location') || query.includes('address') || query.includes('where')) return 'location';
    if (query.includes('service') || query.includes('offer')) return 'services';
    return 'general';
}

/**
 * Initiate transfer to human agent
 */
async function initiateTransfer(tenantId, reason, callSessionId) {
    if (callSessionId) {
        await prisma.callSession.update({
            where: { id: callSessionId },
            data: {
                actionItems: {
                    push: {
                        type: 'transfer',
                        description: `Transfer requested: ${reason}`,
                        timestamp: new Date().toISOString()
                    }
                }
            }
        }).catch(() => { }); // Ignore if session not found
    }

    return {
        success: true,
        action: 'transfer',
        message: "I'll connect you with one of our team members. Please hold for just a moment.",
        reason
    };
}

/**
 * Get tool definitions formatted for OpenAI Realtime session (Flat format)
 * Includes built-in tools plus tenant's custom tools
 */
async function getToolsForSession(tenantId = null) {
    const tools = [...toolDefinitions];

    if (tenantId) {
        try {
            const customTools = await prisma.customTool.findMany({
                where: { tenantId, isActive: true }
            });

            for (const tool of customTools) {
                tools.push({
                    type: 'function',
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters || { type: 'object', properties: {} }
                });
            }

            console.log(`[AgentTools] Loaded ${customTools.length} custom tools for tenant ${tenantId}`);
        } catch (e) {
            console.error('[AgentTools] Error loading custom tools:', e);
        }
    }

    return tools;
}

/**
 * Get tool definitions formatted for OpenAI Chat Completions (Nested format)
 */
async function getToolsForChat(tenantId = null) {
    const flatTools = await getToolsForSession(tenantId);

    return flatTools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));
}

/**
 * Execute a custom tool via webhook, API, or internal handler
 */
async function executeCustomTool(tool, args, context) {
    const { tenantId } = context;

    console.log(`[AgentTools] Executing custom tool: ${tool.name} (${tool.handlerType})`);

    try {
        switch (tool.handlerType) {
            case 'webhook':
                return await executeWebhookHandler(tool, args, context);

            case 'api':
                return await executeApiHandler(tool, args, context);

            case 'internal':
                return await executeInternalHandler(tool.internalHandler, args, context);

            default:
                return { success: false, error: `Unknown handler type: ${tool.handlerType}` };
        }
    } catch (error) {
        console.error(`[AgentTools] Custom tool error (${tool.name}):`, error);
        return {
            success: false,
            error: error.message || 'Custom tool execution failed'
        };
    }
}

/**
 * Execute webhook-based custom tool
 */
async function executeWebhookHandler(tool, args, context) {
    if (!tool.webhookUrl) {
        return { success: false, error: 'No webhook URL configured' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), tool.timeout || 10000);

    try {
        const response = await fetch(tool.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Id': context.tenantId,
                'X-Tool-Name': tool.name
            },
            body: JSON.stringify({
                args,
                context: {
                    tenantId: context.tenantId,
                    callerPhone: context.callerPhone,
                    callSessionId: context.callSessionId
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
        }

        const result = await response.json();
        return { success: true, ...result };
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            return { success: false, error: 'Webhook timeout' };
        }
        throw error;
    }
}

/**
 * Execute API-based custom tool
 */
async function executeApiHandler(tool, args, context) {
    const config = tool.apiConfig || {};

    if (!config.endpoint) {
        return { success: false, error: 'No API endpoint configured' };
    }

    let body = config.bodyTemplate || args;
    if (typeof body === 'string') {
        // Replace placeholders in template
        body = body.replace(/\{\{(\w+)\}\}/g, (_, key) => args[key] || '');
        body = JSON.parse(body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), tool.timeout || 10000);

    try {
        const response = await fetch(config.endpoint, {
            method: config.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.headers || {})
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        return { success: true, ...result };
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

/**
 * Execute internal (built-in) handler by name
 */
async function executeInternalHandler(handlerName, args, context) {
    const handlers = {
        'check_inventory': async () => ({ success: true, message: 'Inventory checking not implemented' }),
        'send_notification': async () => ({ success: true, message: 'Notification sent' }),
        // Add more internal handlers as needed
    };

    const handler = handlers[handlerName];
    if (!handler) {
        return { success: false, error: `Unknown internal handler: ${handlerName}` };
    }

    return await handler(args, context);
}

/**
 * Get custom tools for a tenant
 */
async function getCustomTools(tenantId) {
    const tools = await prisma.customTool.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
    });
    return tools;
}

/**
 * Create a custom tool
 */
async function createCustomTool(tenantId, toolData) {
    const tool = await prisma.customTool.create({
        data: {
            tenantId,
            name: toolData.name,
            displayName: toolData.displayName,
            description: toolData.description,
            parameters: toolData.parameters || { type: 'object', properties: {} },
            handlerType: toolData.handlerType || 'webhook',
            webhookUrl: toolData.webhookUrl,
            apiConfig: toolData.apiConfig,
            internalHandler: toolData.internalHandler,
            isActive: toolData.isActive !== false,
            timeout: toolData.timeout || 10000
        }
    });
    return tool;
}

/**
 * Update a custom tool
 */
async function updateCustomTool(tenantId, toolId, updates) {
    const tool = await prisma.customTool.updateMany({
        where: { id: toolId, tenantId },
        data: updates
    });
    return tool;
}

/**
 * Delete a custom tool
 */
async function deleteCustomTool(tenantId, toolId) {
    await prisma.customTool.deleteMany({
        where: { id: toolId, tenantId }
    });
    return { success: true };
}

module.exports = {
    toolDefinitions,
    executeTool,
    getToolsForSession,
    getToolsForChat,
    checkAvailability,
    createBooking,
    lookupClient,
    getBusinessInfo,
    // Custom tools
    executeCustomTool,
    getCustomTools,
    createCustomTool,
    updateCustomTool,
    deleteCustomTool
};

