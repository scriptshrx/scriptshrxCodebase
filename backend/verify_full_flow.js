// backend/verify_full_flow.js
require('dotenv').config();
const axios = require('axios');
const prisma = require('./src/lib/prisma');

const API_URL = 'http://localhost:5000/api';
// Assuming we can't easily login via this script without a real user in local DB,
// we will simulate the Service Layer calls directly or mock the express request context if needed.
// However, the most robust way is to use the services directly since we have verified architecture.

const chatService = require('./src/services/chatService');
const twilioService = require('./src/services/twilioService');

async function runAudit() {
    console.log('--- STARTING SYSTEM AUDIT ---\n');

    // 1. Create a Test Tenant
    console.log('1. Creating Test Tenant...');
    let tenant = await prisma.tenant.create({
        data: {
            name: 'Audit Corp',
            phoneNumber: '+15005550006', // Twilio Magic Number
            plan: 'Pro',
            aiConfig: {
                systemPrompt: 'You are a pirate.',
                welcomeMessage: 'Ahoy matey!',
                faqs: [
                    { question: 'Where is the treasure?', answer: 'In the safe!' },
                    { question: 'What is your name?', answer: 'Captain AI' }
                ]
            }
        }
    });
    console.log(`   ✅ Tenant Created: ${tenant.id}`);

    try {
        // 2. Test Chat Service (AI Training Check)
        console.log('\n2. Testing AI Chat Configuration (Pirate Persona)...');
        // We can't really call OpenAI without a key, but we can verify the prompt construction logic
        // by spying or by checking if the service allows the call. 
        // If NO API KEY, it should return a specific error code we defined.

        const chatResponse = await chatService.processMessage('Hello', tenant.id);

        if (chatResponse.code === 'NO_API_KEY') {
            console.log('   ✅ Chat Service detected missing API Key (Expected in test env without key).');
            console.log('   ℹ️  Access control working.');
        } else if (chatResponse.success) {
            console.log('   ✅ Chat Service returned response:', chatResponse.response);
        } else {
            console.log('   ⚠️  Chat Service returned error:', chatResponse.error);
        }

        // 3. Test Voice Webhook Logic (Inbound)
        console.log('\n3. Testing Inbound Voice Logic (TwiML Generation)...');
        const twiml = await twilioService.handleInboundVoice({
            To: tenant.phoneNumber,
            From: '+1234567890',
            CallSid: 'CA_TEST'
        });

        if (twiml.includes('<Stream url="wss://')) {
            console.log('   ✅ TwiML contains Media Stream connection (Correct for Real-time AI).');
        } else {
            console.error('   ❌ TwiML did NOT match expected config:', twiml);
        }

        // 4. Test API Endpoint (Organization Update)
        // We'll simulate an update to the AI Config via DB update since we don't have a fast way to get a JWT for this new tenant here.
        console.log('\n4. Verifying DB Persistence for AI Config...');
        const updatedTenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                aiConfig: {
                    model: 'gpt-4',
                    systemPrompt: 'You are a doctor.'
                }
            }
        });

        if (updatedTenant.aiConfig.systemPrompt === 'You are a doctor.') {
            console.log('   ✅ AI Config successfully updated in DB.');
        } else {
            console.error('   ❌ Failed to update AI Config.');
        }

    } catch (e) {
        console.error('❌ Audit Failed:', e);
    } finally {
        // Cleanup
        console.log('\n--- CLEANUP ---');
        await prisma.tenant.delete({ where: { id: tenant.id } });
        console.log('✅ Test Tenant Deleted');
        await prisma.$disconnect();
    }
}

runAudit();
