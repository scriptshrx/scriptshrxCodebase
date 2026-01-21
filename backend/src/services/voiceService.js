/**
 * VoiceService – Production Human-like AI Voice Agent
 * ----------------------------------------------------------
 * - Stable greeting playback (Dynamic & Strict)
 * - Safe barge-in handling
 * - Twilio Media Streams
 * - OpenAI Realtime API (Tools & VAD)
 * - Dashboard Logs Support
 * - Real-time WebSocket updates
 */

const WebSocket = require('ws');
const prismaDefault = require('../lib/prisma');
// Use the concurrent client to avoid prepared statement conflicts
const prisma = prismaDefault.concurrent || prismaDefault;
const socketService = require('./socketService');

// Twilio G711 μ-law = 20ms = 320 bytes
const CHUNK_SIZE = 320;
const SILENCE_BYTE = 0xff;

class VoiceService {
    constructor() {
        this.sessions = new Map();
    }

    async getGreeting(tenantId, timezone = 'UTC') {
        try {
            // Fetch tenant's custom welcome message
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { aiWelcomeMessage: true }
            });

             const hour = parseInt(new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: timezone || 'UTC'
        }).format(new Date()));

        let greeting = 'Hello';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
            // Use custom welcome message if set, otherwise fall back to generic greeting
            if (tenant?.aiWelcomeMessage) {
                return `${greeting}, ${tenant.aiWelcomeMessage}`;
            }
        } catch (error) {
            console.error('[VoiceService] Error fetching custom greeting:', error.message);
        }

        return 'Hello, thank you for calling. How can I assist you today?';
    }

    async getPricingContext(tenantId) {
        try {
            if (!prisma.service) {
                return 'Please ask me about our services and I’ll explain.';
            }

            const services = await prisma.service.findMany({
                where: { tenantId }
            });

            if (!services.length) {
                return 'Pricing is available upon request.';
            }

            return services
                .map(s => `• ${s.name}: ${s.currency} ${s.price}`)
                .join('\n');
        } catch (err) {
            console.warn('[VoiceService] Pricing context error (this is OK if services table not yet created):', err.message);
            return 'Pricing is available upon request.';
        }
    }

    /* -------------------- TWILIO WS -------------------- */

    async handleConnection(ws, req) {
        console.log('[VoiceService] New Client Connection Request');

        // 1. Start Tenant Lookup (Promise)
        const tenantPromise = (async () => {
            try {
                const url = new URL(req.url, `http://${req.headers.host}`);
                const calledNumber = url.searchParams.get('To');
                console.log('[VoiceService] Inbound call To number:', calledNumber);

                let t = null;
                
                // Try to find tenant by exact phone number match
                if (calledNumber) {
                    t = await prisma.tenant.findFirst({
                        where: { phoneNumber: calledNumber },
                        select: {
                            id: true,
                            name: true,
                            aiName: true,
                            aiWelcomeMessage: true,
                            customSystemPrompt: true,
                            aiConfig: true,
                            timezone: true
                        }
                    });
                    if (t) {
                        console.log(`[VoiceService] ✓ Tenant found by phone number: ${t.name} (ID: ${t.id})`);
                        console.log('[VoiceService] customSystemPrompt from db:', t?.customSystemPrompt);
                        console.log('[VoiceService] Full tenant object:', JSON.stringify(t, null, 2));
                    } else {
                        console.log(`[VoiceService] ⚠ No tenant found for phone number: ${calledNumber}`);
                    }
                }

                // Fallback: get any tenant if not found by phone
                if (!t) {
                    t = await prisma.tenant.findFirst({
                        select: {
                            id: true,
                            name: true,
                            aiName: true,
                            aiWelcomeMessage: true,
                            customSystemPrompt: true,
                            aiConfig: true,
                            timezone: true
                        }
                    });
                    if (t) {
                        console.log(`[VoiceService] ⚠ Using fallback tenant: ${t.name} (ID: ${t.id})`);
                        console.log('[VoiceService] customSystemPrompt from fallback:', t?.customSystemPrompt);
                    } else {
                        console.log('[VoiceService] ✗ No tenants found in database, using hardcoded fallback');
                        t = { id: 'fallback', name: 'Our Business', aiName: 'AI Assistant' };
                    }
                }
                
                return t;
            } catch (err) {
                console.error('[VoiceService] Tenant lookup error:', err);
                return { id: 'fallback', name: 'Fallback Business', aiName: 'AI Assistant' };
            }
        })();

        // 2. Attach Listener IMMEDIATELY (to catch early 'start' events)
        ws.on('message', async msg => {
            try {
                const tenant = await tenantPromise;
                const msgString = msg.toString();
                // console.log('[VoiceService] Received:', msgString.slice(0, 50)); 
                await this.handleMessage(ws, JSON.parse(msgString), tenant);
            } catch (e) {
                console.error('Twilio WS error:', e);
            }
        });

        ws.on('close', () => this.closeSession(ws));
    }

    async handleMessage(ws, msg, tenant) {
        let session = this.sessions.get(ws);

        if (msg.event === 'start') {
            // Check for tenantId in customParameters (passed from TwilioService)
            const paramTenantId = msg.start.customParameters?.tenantId;
            let currentTenant = tenant;

            if (paramTenantId && paramTenantId !== tenant.id) {
                // Reload tenant if ID mismatch (e.g. fallback was used initially)
                const found = await prisma.tenant.findUnique({ where: { id: paramTenantId } });
                if (found) {
                    currentTenant = found;
                    console.log(`[VoiceService] Tenant refined via params: ${currentTenant.name}`);
                }
            }

            session = {
                streamSid: msg.start.streamSid,
                tenant: currentTenant,
                openAiWs: null,
                audioQueue: [],
                remainder: Buffer.alloc(0),
                pacer: null,
                lastAudioAt: Date.now(),
                callerPhone: msg.start.customParameters?.From,  // Store caller phone
                callStartTime: Date.now(),
            };

            this.sessions.set(ws, session);
            
            // Save InboundCall to database
            try {
                const callerPhone = msg.start.customParameters?.From;
                if (callerPhone && currentTenant.id !== 'fallback') {
                    const inboundCall = await prisma.inboundCall.create({
                        data: {
                            tenantId: currentTenant.id,
                            callerPhone,
                            callSid: msg.start.customParameters?.CallSid,
                            status: 'in_progress'
                        }
                    });
                    console.log(`[VoiceService] InboundCall created: ${inboundCall.id} from ${callerPhone}`);
                    session.inboundCallId = inboundCall.id;
                }
            } catch (err) {
                console.error('[VoiceService] Failed to save InboundCall:', err.message);
            }
            
            this.connectToOpenAI(ws);

            // Emit real-time update to frontend
            try {
                socketService.sendToTenant(currentTenant.id, 'call:started', {
                    streamSid: msg.start.streamSid,
                    tenantId: currentTenant.id,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                console.error('[VoiceService] Socket emit error:', err.message);
            }

            return;
        }

        if (msg.event === 'media' && session?.openAiWs?.readyState === WebSocket.OPEN) {
            session.lastAudioAt = Date.now();
            session.openAiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: msg.media.payload
            }));
        }

        if (msg.event === 'stop') {
            this.closeSession(ws);
        }
    }

    /* -------------------- AUDIO OUT -------------------- */

    startPacer(ws, session) {
        if (session.pacer) return;

        session.pacer = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) return;

            const chunk =
                session.audioQueue.shift() ||
                Buffer.alloc(CHUNK_SIZE, SILENCE_BYTE);

            ws.send(JSON.stringify({
                event: 'media',
                streamSid: session.streamSid,
                media: { payload: chunk.toString('base64') }
            }));
        }, 20);
    }

    enqueue(session, payload, ws) {
        const buffer = Buffer.from(payload, 'base64');
        const combined = Buffer.concat([session.remainder, buffer]);

        let offset = 0;
        while (offset + CHUNK_SIZE <= combined.length) {
            session.audioQueue.push(combined.subarray(offset, offset + CHUNK_SIZE));
            offset += CHUNK_SIZE;
        }

        session.remainder = combined.subarray(offset);
        this.startPacer(ws, session);
    }

    /* -------------------- OPENAI -------------------- */

    async connectToOpenAI(ws) {
        const session = this.sessions.get(ws);
        if (!process.env.OPENAI_API_KEY) {
            console.error('[VoiceService] CRITICAL: OPENAI_API_KEY is missing!');
            return;
        }

        // 1. Refresh tenant data from database to ensure we have the latest customSystemPrompt
        let tenant = session.tenant;
        if (tenant && tenant.id !== 'fallback') {
            try {
                const freshTenant = await prisma.tenant.findUnique({
                    where: { id: tenant.id },
                    select: {
                        id: true,
                        name: true,
                        aiName: true,
                        aiWelcomeMessage: true,
                        customSystemPrompt: true,
                        aiConfig: true,
                        timezone: true
                    }
                });
                if (freshTenant) {
                    console.log('[VoiceService] Fresh tenant fetched:', JSON.stringify(freshTenant, null, 2));
                    tenant = freshTenant;
                    console.log('[VoiceService] ✓ Tenant data refreshed from database');
                }
            } catch (err) {
                console.error('[VoiceService] Error refreshing tenant data:', err.message);
                // Continue with stale tenant data if refresh fails
            }
        }

        // 2. Get the dynamic company name from the session tenant
        const aiName = tenant?.aiName || tenant?.name || 'our office';
        const companyName = tenant?.name || 'our office';

        let pricing = 'Pricing is available upon request.';
        if (tenant) {
            pricing = await this.getPricingContext(tenant.id);
        }

        // 3. Build the System Prompt - Use custom system prompt from tenant config if available
        let systemPrompt;
        
        console.log('[VoiceService] Tenant customSystemPrompt value:', tenant?.customSystemPrompt);
        console.log('[VoiceService] Tenant aiConfig:', tenant?.aiConfig);
        
        if (tenant?.customSystemPrompt && tenant.customSystemPrompt.trim()) {
            // Use the custom system prompt configured by the organization in dashboard
            systemPrompt = tenant.customSystemPrompt;
            console.log('[VoiceService] ✓ Using CUSTOM system prompt from tenant');
        } else if (tenant?.aiConfig?.systemPrompt && tenant.aiConfig.systemPrompt.trim()) {
            // Alternative: Use systemPrompt from aiConfig JSON if customSystemPrompt not set
            systemPrompt = tenant.aiConfig.systemPrompt;
            console.log('[VoiceService] ✓ Using system prompt from aiConfig');
        } else {
            // Fallback to default system prompt
            console.log('[VoiceService] ⚠ Using DEFAULT system prompt (custom prompt is null or empty)');
            systemPrompt = `
    You are an AI call agent representing Scriptishrx, a software solutions company.
Your role is to professionally greet callers, clearly present available services, explain pricing, and guide the caller toward booking a service.

GENERAL BEHAVIOR
- Be polite, confident, and professional.
- Speak clearly and concisely.
- Do not mention that prices are random or for testing.
- Do not overwhelm the caller; present information step by step.
- Always guide the conversation forward.

CALL OPENING
- Once the call starts, greet the caller.
- Immediately introduce Scriptishrx as a software solutions company.
- Clearly list all available services and their prices.

AVAILABLE SERVICES & PRICING
Present the services exactly once at the start of the call, using the following structure:

1. Workflow Automation  
   Price: $750 – $1,200 per project  
   Description: Automating repetitive business processes to improve efficiency and reduce manual work.

2. Chatbot Services  
   Price: $400 – $900 per chatbot  
   Description: AI-powered chatbots for websites, WhatsApp, and customer support automation.

3. Lead Generation Systems  
   Price: $600 – $1,100 per setup  
   Description: Automated systems to capture, qualify, and manage leads.

4. Customer Relationship Management (CRM) Solutions  
   Price: $900 – $1,800 per implementation  
   Description: Custom CRM systems to manage customers, sales pipelines, and communication.

SERVICE SELECTION FLOW
- After listing services, ask the caller which service they are interested in.
- Wait for the caller to select ONE service.
- Once a service is selected, briefly restate the chosen service and its price range.

BOOKING FLOW
- After confirming the selected service, ask the caller to choose a booking date.
- Clearly state that available booking days are Monday to Friday only.
- Example phrasing:
  “Please choose a preferred date for your booking. Our available days are Monday through Friday.”

DATE VALIDATION
- If the caller provides a date outside Monday–Friday, politely inform them it is unavailable and ask them to choose another date within the available days.
- If the caller provides a valid weekday date, confirm the booking date.

CLOSING
- Once the date is confirmed, acknowledge the booking.
- Inform the caller that a representative will follow up with further details.
- End the call politely.

RESTRICTIONS
- Do not offer services outside the listed ones.
- Do not negotiate prices unless explicitly instructed.
- Do not book on weekends.
`
        }
        
        // Append pricing info if not already in custom prompt
       /* if (!systemPrompt.toLowerCase().includes('pricing') && pricing) {
            systemPrompt += `\n\nPricing Information:\n${pricing}`;
        }*/

        console.log('[VoiceService] Initiating OpenAI WebSocket connection');
        console.log('[VoiceService] System Prompt:', systemPrompt.slice(0, 500) + '...');
        const apiKey = process.env.OPENAI_API_KEY;

        const openAiWs = new WebSocket(
            'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'realtime=v1'
                }
            }
        );

        session.openAiWs = openAiWs;

        // ----- OpenAI WebSocket opened -----
        openAiWs.on('open', () => {
            console.log('[VoiceService] OpenAI WebSocket opened');
            // Send session configuration (including tools & VAD)
            openAiWs.send(JSON.stringify({
                type: 'session.update',
                session: {
                    input_audio_format: 'g711_ulaw',
                    output_audio_format: 'g711_ulaw',
                    voice: 'alloy',
                    instructions: systemPrompt,
                    modalities: ['audio', 'text'],
                    input_audio_transcription: {
                        model: 'whisper-1'
                    },
                    turn_detection: {
                        type: 'server_vad',
                        threshold: 0.8,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 500
                    },
                    tools: [{
                        type: 'function',
                        name: 'bookAppointment',
                        description: 'Books an appointment for the customer.',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                phone: { type: 'string' },
                                dateTime: { type: 'string', description: 'ISO format date string' },
                                purpose: { type: 'string' }
                            },
                            required: ['phone', 'dateTime']
                        }
                    }]
                }
            }));

            // Send greeting after a short delay
            setTimeout(async () => {
                if (openAiWs.readyState === WebSocket.OPEN) {
                    const personalizedGreeting = await this.getGreeting(tenant.id, tenant?.timezone);
                    console.log('[VoiceService] Sending greeting:', personalizedGreeting);
                    openAiWs.send(JSON.stringify({
                        type: 'response.create',
                        response: {
                            modalities: ['audio', 'text'],
                            instructions: `You are starting a new call. Speak the following greeting immediately and then wait for the user to respond: "${personalizedGreeting}"`
                        }
                    }));
                }
            }, 400);
        });

        // ----- Message handling -----
        openAiWs.on('message', async data => {
            try {
                const msg = JSON.parse(data);

                // LOG EVERY EVENT FROM OPENAI
                // if (msg.type) {
                //      console.log(`[VoiceService] OpenAI Event: ${msg.type}`);
                // }

                // Barge‑in: user starts speaking
                if (msg.type === 'input_audio_buffer.speech_started') {
                    session.audioQueue = [];
                    session.remainder = Buffer.alloc(0);
                    ws.send(JSON.stringify({ event: 'clear', streamSid: session.streamSid }));
                    openAiWs.send(JSON.stringify({ type: 'response.cancel' }));
                    console.log('User barged in – clearing AI audio');
                }

                // Audio delta from OpenAI
                if (msg.type === 'response.audio.delta') {
                    this.enqueue(session, msg.delta, ws);
                }

                // AI Transcript
                if (msg.type === 'response.audio_transcript.done') {
                    const transcript = msg.transcript;
                    console.log(`[VoiceService] AI Transcript: "${transcript}"`);
                    if (session.tenant) {
                        this.saveMessage(session, 'assistant', transcript).catch(err => 
                            console.error('[VoiceService] Error saving AI transcript:', err.message)
                        );
                    }
                }

                // User Transcript
                if (msg.type === 'conversation.item.input_audio_transcription.completed') {
                    const transcript = msg.transcript;
                    console.log(`[VoiceService] User Transcript: "${transcript}"`);
                    if (session.tenant) {
                        this.saveMessage(session, 'user', transcript).catch(err => 
                            console.error('[VoiceService] Error saving user transcript:', err.message)
                        );
                    }
                }

                if (msg.type === 'response.done') {
                    if (msg.response?.status === 'failed') {
                        console.error('[VoiceService] Response Failed:', JSON.stringify(msg.response?.status_details));
                    }
                }

                // Tool call handling
                if (msg.type === 'response.function_call_arguments.done') {
                    const args = JSON.parse(msg.arguments);
                    let result = { success: false, message: "Action failed" };
                    if (msg.name === 'bookAppointment') {
                        result = await this.handleBookAppointment(args, tenant?.id);
                    }
                    openAiWs.send(JSON.stringify({
                        type: 'conversation.item.create',
                        item: {
                            type: 'function_call_output',
                            call_id: msg.call_id,
                            output: JSON.stringify(result)
                        }
                    }));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                }
            } catch (e) {
                console.error('OpenAI Message Error', e);
            }
        });

        // ----- Error handling -----
        openAiWs.on('error', e => {
            console.error('❌ OpenAI WS Error Detailed:', e.message);
            this.closeSession(ws);
        });
    }

    closeSession(ws) {
        const session = this.sessions.get(ws);
        if (!session) return;

        if (session.pacer) clearInterval(session.pacer);
        if (session.openAiWs?.readyState === WebSocket.OPEN) {
            session.openAiWs.close();
        }

        // Update InboundCall record with duration
        if (session.inboundCallId && session.callStartTime) {
            try {
                const duration = Math.floor((Date.now() - session.callStartTime) / 1000);
                prisma.inboundCall.update({
                    where: { id: session.inboundCallId },
                    data: { 
                        status: 'completed',
                        duration
                    }
                }).catch(err => console.error('[VoiceService] Failed to update InboundCall:', err.message));
            } catch (err) {
                console.error('[VoiceService] Error finalizing InboundCall:', err.message);
            }
        }

        // Emit real-time update to frontend
        try {
            if (session.tenant) {
                socketService.sendToTenant(session.tenant.id, 'call:ended', {
                    streamSid: session.streamSid,
                    tenantId: session.tenant.id,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error('[VoiceService] Socket emit error on close:', err.message);
        }

        this.sessions.delete(ws);
        console.log('✓ Session Closed');
    }

    /**
     * Handle Appointment Booking Tool Call
     */
    async handleBookAppointment(args, tenantId) {
        console.log(`[VoiceService] Booking Request for Tenant ${tenantId}:`, args);

        const { name, phone, dateTime, purpose } = args;

        if (!tenantId || !phone || !dateTime) {
            return { success: false, message: "Missing required details (phone or date)." };
        }

        try {
            // 1. Find or Create Client
            let client = await prisma.client.findFirst({
                where: {
                    tenantId,
                    phone: phone
                }
            });

            if (!client) {
                client = await prisma.client.create({
                    data: {
                        tenantId,
                        name: name || 'Unknown Caller',
                        phone: phone,
                        source: 'Voice AI'
                    }
                });
            }

            // 2. Create Booking
            const booking = await prisma.booking.create({
                data: {
                    tenantId,
                    clientId: client.id,
                    date: new Date(dateTime),
                    purpose: purpose || 'General Consultation',
                    status: 'Scheduled'
                }
            });

            console.log(`[VoiceService] Booking confirmed: ${booking.id}`);
            return {
                success: true,
                message: `Appointment confirmed for ${new Date(dateTime).toLocaleString()}. Reference: ${booking.id.slice(0, 8)}`
            };

        } catch (error) {
            console.error('Booking Error:', error);
            return { success: false, message: "There was an error saving your appointment." };
        }
    }

    /**
     * Dashboard: Fetch Call Logs
     * (Retained for Dashboard functionality)
     */
    async getCallSessions(tenantId, { limit, includeTranscript }) {
        try {
            return await prisma.callSession.findMany({
                where: { tenantId },
                orderBy: { startedAt: 'desc' },
                take: limit || 20
            });
        } catch (error) {
            console.error('Error fetching call sessions:', error);
            return [];
        }
    }
    async saveMessage(session, role, content) {
        try {
            // Validate required fields
            if (!session?.streamSid || !session?.tenant?.id || !content) {
                console.warn('[VoiceService] Skipping message save - missing required fields');
                return;
            }

            // Use concurrent client to avoid prepared statement conflicts during high concurrency
            await prisma.message.create({
                data: {
                    sessionId: session.streamSid,
                    role: role,
                    content: content,
                    tenantId: session.tenant.id,
                    source: 'voice'
                }
            });
        } catch (error) {
            console.error('[VoiceService] Failed to save message:', error?.message || error);
        }
    }

    /**
     * Initiate an outbound call via Twilio
     */
    async initiateOutboundCall(phoneNumber, tenantId, customData = {}) {
        try {
            const twilioService = require('./twilioService');
            
            // Get tenant config for greeting/script
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { 
                    name: true, 
                    aiName: true, 
                    aiWelcomeMessage: true,
                    customSystemPrompt: true,
                    timezone: true
                }
            });

            if (!tenant) {
                return {
                    success: false,
                    error: 'Tenant not found'
                };
            }

            // Build greeting/script
            const greeting = await this.getGreeting(tenantId, tenant.timezone);
            const script = greeting;

            // Make the call via Twilio
            const call = await twilioService.makeCall(tenantId, phoneNumber, script, customData);

            // Store call session in database
            const callSession = await prisma.callSession.create({
                data: {
                    tenantId,
                    callSid: call.sid,
                    callerPhone: phoneNumber,
                    status: 'initiated',
                    direction: 'outbound',
                    startedAt: new Date()
                }
            });

            return {
                success: true,
                message: 'Call initiated successfully',
                callId: call.sid,
                sessionId: callSession.id,
                status: 'initiated',
                provider: 'twilio'
            };
        } catch (error) {
            console.error('[VoiceService] Outbound call error:', error);
            
            // Check if it's a Twilio configuration error
            const errorMessage = error.message || 'Failed to initiate call';
            const isTwilioConfigError = errorMessage.includes('TWILIO') || 
                                       errorMessage.includes('Twilio') ||
                                       errorMessage.includes('credentials') ||
                                       errorMessage.includes('Account SID') ||
                                       errorMessage.includes('phone number');
            
            return {
                success: false,
                error: isTwilioConfigError ? 
                    'Twilio is not properly configured. Contact administrator.' :
                    errorMessage,
                details: errorMessage,
                message: errorMessage
            };
        }
    }

    /**
     * Get call status
     */
    async getCallStatus(callId, tenantId) {
        try {
            const callSession = await prisma.callSession.findFirst({
                where: {
                    callSid: callId,
                    tenantId
                }
            });
            return callSession;
        } catch (error) {
            console.error('[VoiceService] Error fetching call status:', error);
            return null;
        }
    }
}

module.exports = new VoiceService();
