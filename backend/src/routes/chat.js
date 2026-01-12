const express = require('express');
const router = express.Router();
const ragService = require('../services/ragService');
const ctaService = require('../services/ctaService');
const guideService = require('../services/guideService');
const clientService = require('../services/clientService');

// Enterprise Features: AI Lead Scoring & Sentiment Analysis
const aiAnalysisService = require('../services/aiAnalysisService');
const eventBus = require('../lib/eventBus');

router.post('/', async (req, res) => {
    try {
        const { message, sessionId, tenantId, userId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 1. Gather Context from Services (RAG, CTA, Guide)
        let context = "";

        // RAG Context
        const ragResponse = await ragService.query(message);
        if (ragResponse) {
            context += `\n[Internal Knowledge Base]: ${ragResponse}\n`;
        }

        // CTA Context (Directions)
        const ctaResponse = ctaService.getDirections(message);
        if (ctaResponse) {
            context += `\n[Directions Info]: ${ctaResponse}\n`;
        }

        // Guide Context (Sightseeing)
        const guideResponse = guideService.getRecommendation(message);
        if (guideResponse) {
            context += `\n[Sightseeing Info]: ${guideResponse}\n`;
        }

        // 2. Setup OpenAI and DB
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prisma = require('../lib/prisma');

        // Fetch Conversation History
        let history = [];
        if (sessionId) {
            const previousMessages = await prisma.message.findMany({
                where: { sessionId },
                orderBy: { createdAt: 'desc' },
                take: 10 // Last 10 messages for context
            });
            // Reverse to chronological order
            history = previousMessages.reverse().map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        }

        // Save Current User Message
        if (tenantId && sessionId) {
            await prisma.message.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: message,
                    tenantId,
                    userId: userId || null
                }
            });
        }

        // Fetch Tenant for Customization
        let tenantParams = { aiName: 'ScriptishRx AI', customSystemPrompt: null, plan: 'Basic' };
        if (tenantId) {
            const tenantData = await prisma.tenant.findUnique({ where: { id: tenantId } });
            if (tenantData) {
                tenantParams = tenantData;
            }
        }

        // 3. Construct System Prompt
        // We include the full Knowledge Base text from RAG service's faqs logic implicitly via 'context' 
        // OR we can embed the core text directly if we want it to be super robust.
        // For now, let's make the System Prompt very strong.

        const systemPrompt = `You are ${tenantParams.aiName || 'ScriptishRx AI'}, the intelligent, calm, and responsible AI assistant for ScriptishRx (an AI-powered Business Automation Platform).

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
        3. LEAD CAPTURE: If the user seems interested in signing up or a demo, ask for their Name and Email to save them as a lead (trigger 'saveLead').
        4. UNKNOWN: If the answer isn't in the FAQ above or context, politely offer to connect them with support or suggest they visit the website. Do not make up prices.
        
        ${tenantParams.customSystemPrompt ? `CUSTOM INSTRUCTIONS: ${tenantParams.customSystemPrompt}` : ''}
        `;

        // 4. OpenAI Call with History + Tools
        const messages = [
            { role: "system", content: systemPrompt },
            ...history, // Insert history here
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

        let completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o", // Respect env var or fallback to 4o
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

                    const targetTenantId = tenantId || (await prisma.tenant.findFirst())?.id;
                    let toolResult = "Failed to save lead.";

                    if (targetTenantId) {
                        const success = await clientService.captureClient(args, targetTenantId, 'AI_AGENT');
                        toolResult = success ? "Lead saved successfully." : "Failed to save lead in database.";
                    } else {
                        toolResult = "No tenant context found.";
                    }

                    // Feed result back
                    messages.push(aiMessage); // Add original tool call msg
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: toolResult
                    });
                    completion = await openai.chat.completions.create({
                        model: process.env.OPENAI_MODEL || "gpt-4o",
                        messages: messages
                    });
                    aiMessage = completion.choices[0].message;
                }
            }
        }

        const aiContent = aiMessage.content || "I'm listening.";

        // 6. Save AI Response
        if (tenantId && sessionId) {
            await prisma.message.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: aiContent,
                    tenantId,
                    userId: userId || null
                }
            });
        }

        // 7. Enterprise Feature: Async Sentiment Analysis & Lead Scoring
        // This runs in background to not delay response
        if (tenantId && message.length > 10) {
            setImmediate(async () => {
                try {
                    // Analyze customer sentiment
                    const analysis = await aiAnalysisService.analyzeSentiment(message);

                    // Check if we should trigger a priority alert
                    const alertCheck = aiAnalysisService.shouldTriggerAlert(analysis);

                    // Find or create client based on session
                    let clientId = null;
                    if (sessionId) {
                        const sessionMessages = await prisma.message.findFirst({
                            where: { sessionId, tenantId },
                            include: { callSession: true }
                        });
                        if (sessionMessages?.callSession?.clientId) {
                            clientId = sessionMessages.callSession.clientId;
                        }
                    }

                    // Update lead score if we have a client
                    if (clientId) {
                        const client = await prisma.client.findUnique({ where: { id: clientId } });
                        if (client) {
                            const newScore = aiAnalysisService.calculateLeadScore(analysis, client.leadScore || 0);
                            await prisma.client.update({
                                where: { id: clientId },
                                data: {
                                    leadScore: newScore,
                                    lastSentiment: analysis.sentiment
                                }
                            });
                        }
                    }

                    // Emit priority alert if needed
                    if (alertCheck.shouldAlert) {
                        eventBus.emit('lead:priority_alert', {
                            tenantId,
                            clientId,
                            analysis,
                            message,
                            priority: alertCheck.priority,
                            reason: alertCheck.reason
                        });
                    }

                    console.log(`[Chat] Sentiment: ${analysis.sentiment}, Intent: ${analysis.intent}, Alert: ${alertCheck.shouldAlert}`);
                } catch (analysisError) {
                    console.error('[Chat] Sentiment analysis error:', analysisError.message);
                }
            });
        }

        return res.json({
            role: 'assistant',
            content: aiContent
        });

    } catch (error) {
        console.error('Error in chat route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

