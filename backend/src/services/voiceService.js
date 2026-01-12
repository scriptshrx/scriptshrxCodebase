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
const prisma = require('../lib/prisma');
const socketService = require('./socketService');

// Twilio G711 μ-law = 20ms = 320 bytes
const CHUNK_SIZE = 320;
const SILENCE_BYTE = 0xff;

class VoiceService {
    constructor() {
        this.sessions = new Map();
    }

    getGreeting(companyName, timezone = 'UTC') {
        const hour = parseInt(new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: timezone || 'UTC'
        }).format(new Date()));

        let greeting = 'Hello';

        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';

        return `${greeting}, welcome to ${companyName}. How may I help you today?`;
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
            console.error('Pricing load skipped:', err.message);
            return 'Pricing details can be provided on request.';
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

                let t = await prisma.tenant.findFirst({
                    where: calledNumber ? { phoneNumber: calledNumber } : {}
                });

                if (!t) t = await prisma.tenant.findFirst() || { id: 'fallback', name: 'Our Business' };
                console.log(`[VoiceService] Tenant identified: ${t.name}`);
                return t;
            } catch (err) {
                console.error('Tenant lookup error:', err);
                return { id: 'fallback', name: 'Fallback Business' };
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
            };

            this.sessions.set(ws, session);
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

        // 1. Get the dynamic company name from the session tenant
        const tenant = session.tenant;
        // CRITICAL FIX: Ensure 'name' is prioritized if 'companyName' doesn't exist in DB
        const companyName = tenant?.name || tenant?.companyName || 'our office';

        let pricing = 'Pricing is available upon request.';
        if (tenant) {
            pricing = await this.getPricingContext(tenant.id);
        }

        // 2. Build the System Prompt using the dynamic business name
        const systemPrompt = `
    You are a professional AI voice assistant for ${companyName}.
    Your goal is to assist callers with questions and booking.
    
    **Mission:**
    - Provide friendly, accurate, and timely assistance.
    - Ensure every booking is recorded correctly in the database.
    - Respect the caller’s time and privacy.
    
    Pricing Information:
    ${pricing}
    
    Instructions:
    - Be concise and human-like.
    - You have access to a tool to book appointments.
    - If you are unsure of an answer, offer to take a message for the manager.
    `;

        console.log('[VoiceService] Initiating OpenAI WebSocket connection');
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
            setTimeout(() => {
                if (openAiWs.readyState === WebSocket.OPEN) {
                    const personalizedGreeting = this.getGreeting(companyName, tenant?.timezone);
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
                        this.saveMessage(session, 'assistant', transcript);
                    }
                }

                // User Transcript
                if (msg.type === 'conversation.item.input_audio_transcription.completed') {
                    const transcript = msg.transcript;
                    console.log(`[VoiceService] User Transcript: "${transcript}"`);
                    if (session.tenant) {
                        this.saveMessage(session, 'user', transcript);
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
            await prisma.message.create({
                data: {
                    sessionId: session.streamSid, // Using streamSid as session key
                    role: role, // 'user' or 'assistant'
                    content: content,
                    tenantId: session.tenant.id,
                    source: 'voice'
                }
            });
        } catch (error) {
            console.error('[VoiceService] Failed to save message:', error);
        }
    }
}

module.exports = new VoiceService();
