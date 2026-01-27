const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const ragService = require('../services/ragService');
const ctaService = require('../services/ctaService');
const guideService = require('../services/guideService');
const clientService = require('../services/clientService');
const prisma = require('../lib/prisma');
const OpenAI = require('openai');

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const user = jwt.verify(token, process.env.JWT_SECRET);
            req.user = user;
        } catch (error) {
            console.warn('Invalid token provided, continuing without auth');
        }
    }
    next();
};

router.get('/status', optionalAuth, (req, res) => {
    const providerInfo = chatService.getProviderInfo();
    res.json({
        success: true,
        status: providerInfo.configured ? 'online' : 'not_configured',
        provider: providerInfo.provider,
        timestamp: new Date().toISOString()
    });
});

// Main Chat Endpoint - Ported from chat.js for Landing Page Specifics
router.post('/message', optionalAuth, async (req, res) => {
    try {
        const { message, tenantId, sessionId, systemPrompt: clientSystemPrompt, model: clientModel } = req.body;

        console.log('[Chat] POST /message received');
        console.log('[Chat] tenantId:', tenantId);
        console.log('[Chat] clientSystemPrompt provided:', !!clientSystemPrompt);
        console.log('[Chat] clientModel:', clientModel);

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // 1. Gather Context from Services (RAG, CTA, Guide)
        let context = "";

        // RAG Context
        const ragResponse = await ragService.query(message);
        if (ragResponse) context += `\n[Internal Knowledge Base]: ${ragResponse}\n`;

        // CTA Context (Directions)
        const ctaResponse = ctaService.getDirections(message);
        if (ctaResponse) context += `\n[Directions Info]: ${ctaResponse}\n`;

        // Guide Context (Sightseeing)
        const guideResponse = guideService.getRecommendation(message);
        if (guideResponse) context += `\n[Sightseeing Info]: ${guideResponse}\n`;

        // 2. Setup OpenAI
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Fetch Conversation History (last 10)
        let history = [];
        if (sessionId) {
            const previousMessages = await prisma.message.findMany({
                where: { sessionId },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            history = previousMessages.reverse().map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        }

        // Save Current User Message
        const activeTenantId = tenantId || req.user?.tenantId || 'landing_guest';

        if (activeTenantId && sessionId) {
            await prisma.message.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: message,
                    tenantId: activeTenantId,
                    userId: req.user?.id || null
                }
            });
        }

        // 3. Construct System Prompt - Use Tenant's Custom Prompt if Available
        let systemPrompt;

        // Priority 1: Use client-provided system prompt (from dashboard chat editor)
        if (clientSystemPrompt) {
            systemPrompt = clientSystemPrompt;
            console.log(`[Chat] Using client-provided system prompt (${systemPrompt.length} chars)`);
        }
        // Priority 2: Try to fetch tenant's aiConfig with new structure from database
        else if (activeTenantId && activeTenantId !== 'landing_guest') {
            try {
                const tenantData = await prisma.tenant.findUnique({
                    where: { id: activeTenantId },
                    select: { aiConfig: true, customSystemPrompt: true }
                });
                
                // Try new aiConfig structure first
                if (tenantData?.aiConfig?.systemPrompt) {
                    systemPrompt = tenantData.aiConfig.systemPrompt;
                    console.log(`[Chat] Using tenant's aiConfig.systemPrompt (${systemPrompt.length} chars)`);
                }
                // Fallback to legacy customSystemPrompt field
                else if (tenantData?.customSystemPrompt) {
                    systemPrompt = tenantData.customSystemPrompt;
                    console.log(`[Chat] Using tenant's legacy customSystemPrompt (${systemPrompt.length} chars)`);
                }
            } catch (err) {
                console.warn(`[Chat] Failed to fetch tenant's custom prompt:`, err.message);
            }
        }

        // Priority 3: Fallback to default system prompt if tenant's is not available
        if (!systemPrompt) {
            systemPrompt = `You are ScriptishRx AI, the intelligent, calm, and responsible AI assistant for ScriptishRx (an AI-powered Business Automation Platform).

        CORE KNOWLEDGE BASE (OFFICIAL FAQ):
        1. PRICING PLANS:
           - Startup ($99.99/mo): Voice Agent, 50 bookings/mo, Basic Analytics.
           - Growth ($149.99/mo): Everything in Startup + Unlimited bookings, Advanced Analytics, Priority Support.
           - Enterprise ($249.99/mo): Dedicated Account Manager, SOC2 compliance, White Labeling.
        
        2. FEATURES & POLICIES:
           - Free Trial: 14 days, full access to premium features. After trial -> Auto-transition to Startup unless paid plan selected.
           - Mobile: Fully optimized for mobile devices.
           - Security: SOC2 Type II compliant, enterprise-grade encryption.
           - Support: Priority support for Growth/Enterprise (24/7).
           - Integrations: Google Calendar, Zoom, Slack.
           - Refunds: 30-day money-back guarantee.
           - Cancellation: Anytime via Account Settings.
        
        3. USAGE:
           - Ideal for: Healthcare, education, coaching, professional services.
           - Personal use: Allowed, but designed for business.
           - Global Limit: Startup has 50 bookings cap; others are unlimited.
        
        See below for specific context retrieved (if any):
        ${context ? context : ""}

        INSTRUCTIONS:
        1. BE ROBUST & INTELLIGENT: Answer broadly and helpfully. If a user asks about pricing, explain the tiers clearly.
        2. TONE: Calm, responsible, professional, and friendly.
        3. LEAD CAPTURE: If the user seems interested in signing up or a demo, ask for their Name and Email (trigger 'saveLead').
        4. UNKNOWN: If the answer isn't in the FAQ above or context, politely offer to connect them with support or suggest they visit the website. Do not make up prices.
        `;
        }

        // 4. OpenAI Call with History + Tools
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        const tools = [
            {
                type: "function",
                function: {
                    name: "saveLead",
                    description: "Save a new lead to the CRM. Extract name/email from conversation.",
                    parameters: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            email: { type: "string" },
                            phone: { type: "string" },
                            notes: { type: "string" }
                        },
                        required: ["name", "email"]
                    }
                }
            }
        ];

        // Determine which model to use (client preference or env default)
        const modelToUse = clientModel || process.env.OPENAI_MODEL || "gpt-4o";
        console.log('[Chat] Using model:', modelToUse);

        let completion = await openai.chat.completions.create({
            model: modelToUse,
            messages: messages,
            tools: tools,
            tool_choice: "auto",
        });

        let aiMessage = completion.choices[0].message;

        // 5. Handle Tool Calls
        if (aiMessage.tool_calls) {
            const toolCalls = aiMessage.tool_calls;
            for (const toolCall of toolCalls) {
                if (toolCall.function.name === 'saveLead') {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log('🤖 Chatbot triggering saveLead:', args);

                    let toolResult = "Failed to save lead.";
                    if (activeTenantId) {
                        const success = await clientService.captureClient(args, activeTenantId, 'AI_AGENT');
                        toolResult = success ? "Lead saved successfully." : "Failed to save lead in database.";
                    } else {
                        toolResult = "No tenant context found.";
                    }

                    messages.push(aiMessage);
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: toolResult
                    });

                    completion = await openai.chat.completions.create({
                        model: modelToUse,
                        messages: messages
                    });
                    aiMessage = completion.choices[0].message;
                }
            }
        }

        const aiContent = aiMessage.content || "I'm listening.";

        // 6. Save AI Response
        if (activeTenantId && sessionId) {
            await prisma.message.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: aiContent,
                    tenantId: activeTenantId,
                    userId: req.user?.id || null
                }
            });
        }

        // 7. Return Response in correct format for Frontend
        return res.json({
            success: true,
            response: aiContent,
            metadata: {
                model: completion.model,
                usage: completion.usage
            }
        });

    } catch (error) {
        console.error('Error in chat route:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error', 
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Preserve other generic endpoints
router.get('/history', optionalAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        const messages = await chatService.getChatHistory(tenantId);
        res.json({ success: true, messages: messages, total: messages.length });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch chat history' });
    }
});

router.delete('/history', optionalAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default';
        await chatService.clearChatHistory(tenantId);
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to clear chat history' });
    }
});

module.exports = router;