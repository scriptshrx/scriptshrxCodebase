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
                
                // Helper: Check if tenant has the AI configured
                const isAiConfigured = (tenant) => {
                    return tenant && 
                        tenant.aiName && 
                        tenant.aiWelcomeMessage && 
                        tenant.customSystemPrompt 
                    
                        //&&(tenant.aiConfig && Object.keys(tenant.aiConfig).length > 0);
                };

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
                    if (t && isAiConfigured(t)) {
                        console.log(`[VoiceService] ✓ Tenant found by phone number: ${t.name} (ID: ${t.id})`);
                        console.log('[VoiceService] customSystemPrompt from db:', t?.customSystemPrompt);
                        console.log('[VoiceService] Full tenant object:', JSON.stringify(t, null, 2));
                    } else if (t) {
                        console.log(`[VoiceService] ⚠ Tenant found by phone but has no AI config: ${t.name} (ID: ${t.id})`);
                        t = null; // Reset to trigger fallback
                    } else {
                        console.log(`[VoiceService] ⚠ No tenant found for phone number: ${calledNumber}`);
                    }
                }

                // Fallback: get any tenant with AI configured
                if (!t) {
                    // Fetch all tenants with AI config and find the first one that's properly configured
                    const tenants = await prisma.tenant.findMany({
                        select: {
                            id: true,
                            name: true,
                            aiName: true,
                            aiWelcomeMessage: true,
                            customSystemPrompt: true,
                            aiConfig: true,
                            timezone: true
                        },
                        take: 50 // Limit to avoid fetching thousands
                    });

                    // Find first tenant with AI configured
                    t = tenants.find(tenant => isAiConfigured(tenant)) || null;

                    if (t) {
                        console.log(`[VoiceService] ✓ Using fallback tenant with AI config: ${t.name} (ID: ${t.id})`);
                        console.log('[VoiceService] customSystemPrompt from fallback:', t?.customSystemPrompt);
                    } else {
                        console.log('[VoiceService] ✗ No tenants with AI config found in database, using hardcoded fallback');
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
                const found = await prisma.tenant.findUnique({
                    where: { id: paramTenantId },
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
                if (found) {
                    // Validate that tenant has complete AI configuration
                    const hasCompleteAiConfig = found.aiName && 
                                               found.aiWelcomeMessage && 
                                               found.customSystemPrompt && 
                                               found.aiConfig;
                    
                    if (hasCompleteAiConfig) {
                        currentTenant = found;
                        console.log(`[VoiceService] Tenant refined via params: ${currentTenant.name}`);
                    } else {
                        console.warn(`[VoiceService] ⚠️ Tenant "${found.name}" from params has incomplete AI configuration. Using original tenant.`);
                        console.warn(`  - aiName: ${found.aiName ? '✓' : '✗'}`);
                        console.warn(`  - aiWelcomeMessage: ${found.aiWelcomeMessage ? '✓' : '✗'}`);
                        console.warn(`  - customSystemPrompt: ${found.customSystemPrompt ? '✓' : '✗'}`);
                        console.warn(`  - aiConfig: ${found.aiConfig ? '✓' : '✗'}`);
                    }
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

        // 1. FORCE FRESH FETCH: Always reload tenant data from database for LATEST customSystemPrompt
        // This ensures any recent database updates are picked up immediately
        let tenant = session.tenant;
        if (tenant && tenant.id !== 'fallback') {
            try {
                console.log(`[VoiceService] 🔄 FORCE FRESH FETCH: Reloading tenant "${tenant.name}" (ID: ${tenant.id}) from database...`);
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
                    console.log('[VoiceService] Fresh tenant fetched from DB:', JSON.stringify(freshTenant, null, 2));
                    console.log(`[VoiceService] ✓ Updated customSystemPrompt (length: ${freshTenant.customSystemPrompt?.length || 0} chars)`);
                    
                    // Validate that tenant has complete AI configuration
                    const hasCompleteAiConfig = freshTenant.aiName && 
                                               freshTenant.aiWelcomeMessage && 
                                               freshTenant.customSystemPrompt && 
                                               freshTenant.aiConfig;
                    
                    if (!hasCompleteAiConfig) {
                        console.warn(`[VoiceService] ⚠️ Tenant "${freshTenant.name}" has incomplete AI configuration. Skipping.`);
                        console.warn(`  - aiName: ${freshTenant.aiName ? '✓' : '✗'}`);
                        console.warn(`  - aiWelcomeMessage: ${freshTenant.aiWelcomeMessage ? '✓' : '✗'}`);
                        console.warn(`  - customSystemPrompt: ${freshTenant.customSystemPrompt ? '✓' : '✗'}`);
                        console.warn(`  - aiConfig: ${freshTenant.aiConfig ? '✓' : '✗'}`);
                        tenant = null;
                    } else {
                        tenant = freshTenant;
                        console.log('[VoiceService] ✓✓ Tenant data REFRESHED successfully from database');
                    }
                } else {
                    console.warn(`[VoiceService] ⚠️ Fresh tenant fetch returned null`);
                }
            } catch (err) {
                console.error('[VoiceService] Error refreshing tenant data:', err.message);
                // Continue with session tenant if refresh fails
            }
        }

        // 2. Get the dynamic company name from the session tenant
        const aiName = tenant?.aiName || tenant?.name || 'our office';
        const companyName = tenant?.name || 'our office';

        let pricing = 'Pricing is available upon request.';
        if (tenant) {
            pricing = await this.getPricingContext(tenant.id);
        }

        // 3. Build the System Prompt - Use customSystemPrompt from tenant
        // PRIMARY SOURCE: customSystemPrompt field → default
        let systemPrompt;
        
        console.log('[VoiceService] Tenant customSystemPrompt value:', tenant?.customSystemPrompt);
        
        // PRIMARY SOURCE: customSystemPrompt (direct field from tenant table)
        if (tenant?.customSystemPrompt && tenant.customSystemPrompt.trim()) {
            systemPrompt = tenant.customSystemPrompt;
            console.log('\n========================================');
            console.log(`🎯 SYSTEM PROMPT SOURCE: customSystemPrompt field (PRIMARY)`);
            console.log(`📝 Prompt length: ${systemPrompt.length} characters`);
            console.log(`✓ First 200 chars: ${systemPrompt.slice(0, 200)}`);
            console.log('========================================\n');
        } else {
            // Fallback to default system prompt
            console.log('\n========================================');
            console.log(`⚠️ SYSTEM PROMPT SOURCE: DEFAULT (customSystemPrompt is null or empty)`);
            console.log('========================================\n');
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
- Once the booking is confirmed via the tools, acknowledge the booking.
- Inform the caller that a representative will follow up with further details.
- End the call politely.

TOOL USAGE - CRITICAL INSTRUCTIONS (MUST FOLLOW EXACTLY)
After collecting all required information (name, email, phone number, booking date, and service/purpose), you MUST execute this exact sequence:

STEP 1: Call bookAppointment tool with: name, phone, email, dateTime (ISO format), purpose
STEP 2: Wait for success response from bookAppointment
STEP 3: Extract the bookingId from the response
STEP 4: Call sendBookingReminder tool with: customerEmail, customerName, bookingDate (ISO format), product, bookingId
STEP 5: Wait for success response from sendBookingReminder
STEP 6: ONLY THEN say "Your booking is confirmed" and proceed to CLOSING

DO NOT end the conversation or move to CLOSING until BOTH tools have been successfully called and confirmed.
If bookAppointment fails, inform the customer and ask them to try again.
If sendBookingReminder fails, inform the customer the booking was saved but the email couldn't be sent.

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
                                email: { type: 'string', description: 'Customer email address' },
                                dateTime: { type: 'string', description: 'ISO format date string' },
                                purpose: { type: 'string' }
                            },
                            required: ['phone', 'dateTime']
                        }
                    },
                    {
                        type: 'function',
                        name: 'sendBookingReminder',
                        description: 'Sends a booking reminder email to the customer and tenant after appointment is booked.',
                        parameters: {
                            type: 'object',
                            properties: {
                                customerEmail: { type: 'string', description: 'Customer email address' },
                                customerPhone: { type: 'string', description: 'Customer phone number' },
                                customerName: { type: 'string', description: 'Customer name' },
                                bookingDate: { type: 'string', description: 'Booking date in ISO format' },
                                product: { type: 'string', description: 'Product/service booked' },
                                bookingId: { type: 'string', description: 'Booking reference ID' }
                            },
                            required: ['customerEmail', 'customerName', 'bookingDate', 'product']
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
                    
                    // Use session.tenant.id to ensure we have the correct tenant from the inbound call
                    const tenantIdForTool = session?.tenant?.id || tenant?.id;
                    
                    if (msg.name === 'bookAppointment') {
                        result = await this.handleBookAppointment(args, tenantIdForTool, session);
                        console.log(`\x1b[1m\x1b[36m[VoiceService] bookAppointment tool called successfully\x1b[0m`);
                        console.log(`\x1b[1m${result.success ? '\x1b[32m✓ RECORDED TO DB SUCCESSFULLY' : '\x1b[31m✗ FAILED TO RECORD TO DB'}\x1b[0m`);
                        console.log(`\x1b[1mTool Result:\x1b[0m`, result);
                    } else if (msg.name === 'sendBookingReminder') {
                        result = await this.handleSendBookingReminder(args, tenantIdForTool);
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
    async handleBookAppointment(args, tenantId, session) {
        console.log(`[VoiceService] Booking Request for Tenant ${tenantId}:`, args);

        const { name, phone, email, dateTime, purpose } = args;

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
                        email: email || null,
                        source: 'Voice AI'
                    }
                });
            } else if (email && !client.email) {
                // Update client email if it was just provided
                client = await prisma.client.update({
                    where: { id: client.id },
                    data: { email }
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

            // Store booking info in session for later use
            if (session) {
                session.lastBooking = {
                    id: booking.id,
                    customerEmail: client.email,
                    customerPhone: phone,
                    customerName: client.name,
                    bookingDate: booking.date,
                    product: purpose || 'General Consultation'
                };
            }

            console.log(`\x1b[1m[VoiceService] Booking confirmed: ${booking.id}\x1b[0m`);
            console.log(`\x1b[1m[VoiceService] Call session details saved to DB (bookings record):\x1b[0m`);
            console.log({
                bookingId: booking.id,
                clientId: client.id,
                clientName: client.name,
                callSessions: client.callSessions || '(see DB)'
            });
            return {
                success: true,
                message: `Appointment confirmed for ${new Date(dateTime).toLocaleString()}. Reference: ${booking.id.slice(0, 8)}`,
                bookingId: booking.id
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

    /**
     * Handle Booking Reminder Email Tool Call
     */
    async handleSendBookingReminder(args, tenantId) {
        console.log(`[VoiceService] Sending Booking Reminder for Tenant ${tenantId}:`, args);

        const { customerEmail, customerPhone, customerName, bookingDate, product, bookingId } = args;

        if (!customerEmail || !customerName || !bookingDate || !product) {
            return { success: false, message: "Missing required details for reminder email." };
        }

        try {
            // Get tenant details for email
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true }
            });

            if (!tenant) {
                return { success: false, message: "Tenant not found." };
            }

            // Get tenant email from the users table (OWNER of the tenant)
            let tenantEmail = process.env.TENANT_SUPPORT_EMAIL || process.env.ADMIN_EMAIL;
            try {
                const tenantOwner = await prisma.user.findFirst({
                    where: {
                        tenantId: tenantId,
                        role: 'OWNER'
                    },
                    select: { email: true }
                });
                if (tenantOwner?.email) {
                    tenantEmail = tenantOwner.email;
                    console.log(`\n========================================`);
                    console.log(`🎯 TENANT OWNER EMAIL FOUND: ${tenantEmail}`);
                    console.log(`========================================\n`);
                }
            } catch (err) {
                console.warn('[VoiceService] Failed to fetch tenant owner email:', err.message);
            }
            
            // Final fallback
            if (!tenantEmail) {
                tenantEmail = 'ezehmark@gmail.com';
                console.log(`\n========================================`);
                console.log(`⚠️ USING FALLBACK EMAIL: ${tenantEmail}`);
                console.log(`========================================\n`);
            }

            // Format booking date
            const formattedDate = new Date(bookingDate).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Send email to customer
            await this.sendBookingReminderEmail(
                customerEmail,
                customerName,
                formattedDate,
                product,
                bookingId,
                tenant.name,
                'customer'
            );

            // Send email to tenant
            await this.sendBookingReminderEmail(
                tenantEmail,
                tenant.name,
                formattedDate,
                product,
                bookingId,
                customerName,
                'tenant',
                customerEmail,
                customerPhone
            );

            console.log(`[VoiceService] Booking reminder emails sent successfully`);
            return {
                success: true,
                message: `Booking reminder emails sent to ${customerEmail} and ${tenantEmail}`
            };

        } catch (error) {
            console.error('Booking Reminder Email Error:', error);
            return { success: false, message: "There was an error sending the reminder email." };
        }
    }

    /**
     * Send Booking Reminder Email using Zeptomail
     */
    async sendBookingReminderEmail(email, recipientName, bookingDate, product, bookingId, otherParty, type, customerEmail, customerPhone) {
        try {
            const { SendMailClient } = require('zeptomail');
            
            const url = "https://api.zeptomail.com/v1.1/email";
            const token = process.env.ZEPTOMAIL_KEY;

            if (!token) {
                console.error('[VoiceService] ZEPTOMAIL_KEY not configured');
                return;
            }

            const client = new SendMailClient({ url, token });

            // Build email content based on type
            let subject, htmlContent;

            if (type === 'customer') {
                subject = `Booking Confirmation - ${product}`;
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #007bff;">Booking Confirmation</h2>
                        <p>Hi ${recipientName},</p>
                        <p>Your booking has been confirmed. Here are your booking details:</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
                            <p><strong>Service:</strong> ${product}</p>
                            <p><strong>Date & Time:</strong> ${bookingDate}</p>
                            <p><strong>Company:</strong> ${otherParty}</p>
                            <p><strong>Reference ID:</strong> ${bookingId}</p>
                        </div>
                        <p>A representative from <strong>${otherParty}</strong> will contact you soon with further details.</p>
                        <p>Thank you for your business!</p>
                        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">This is an automated message from ScriptishRx.</p>
                    </div>
                `;
            } else {
                subject = `New Booking Alert - ${product}`;
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">New Booking Received</h2>
                        <p>Hi ${recipientName},</p>
                        <p>You have received a new booking request from our AI system. Here are the details:</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0;">
                            <p><strong>Customer:</strong> ${otherParty}</p>
                            <p><strong>Email:</strong> ${customerEmail || 'Not provided'}</p>
                            <p><strong>Phone:</strong> ${customerPhone || 'Not provided'}</p>
                            <p><strong>Service:</strong> ${product}</p>
                            <p><strong>Date & Time:</strong> ${bookingDate}</p>
                            <p><strong>Booking Reference:</strong> ${bookingId}</p>
                        </div>
                        <p>Please follow up with the customer to confirm details and provide any additional information they may need.</p>
                        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">This is an automated message from ScriptishRx.</p>
                    </div>
                `;
            }

            await client.sendMail({
                from: {
                    address: 'support@scriptishrx.net',
                    name: 'ScriptishRx Bookings'
                },
                to: [
                    {
                        email_address: {
                            address: email,
                            name: recipientName
                        }
                    }
                ],
                subject: subject,
                htmlbody: htmlContent
            });

            console.log(`[VoiceService] Booking reminder email sent to ${email}`);
        } catch (error) {
            console.error('[VoiceService] Error sending booking reminder email:', error);
        }
    }
}

module.exports = new VoiceService();
