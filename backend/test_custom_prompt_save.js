/**
 * Test Script: Verify customSystemPrompt Save & Retrieval
 * Tests the full flow from API call to database retrieval
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000'; // Change to your API URL
const TOKEN = 'YOUR_AUTH_TOKEN'; // Get this from login

async function testCustomPromptFlow() {
    console.log('\n=== CUSTOM SYSTEM PROMPT FLOW TEST ===\n');

    try {
        // Step 1: Get current organization info
        console.log('Step 1: Fetching current organization info...');
        let res = await fetch(`${API_URL}/api/organization/info`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        let data = await res.json();
        console.log(`Current customSystemPrompt:`, data.organization?.customSystemPrompt || 'NULL');
        console.log(`Current aiConfig.systemPrompt:`, data.organization?.aiConfig?.systemPrompt || 'NULL');

        // Step 2: Save a custom prompt
        const testPrompt = 'TEST PROMPT: ' + new Date().toISOString() + ' - This is a test prompt to verify saving functionality.';
        console.log('\nStep 2: Saving custom prompt...');
        console.log(`Prompt to save (${testPrompt.length} chars): ${testPrompt.substring(0, 50)}...`);
        
        res = await fetch(`${API_URL}/api/organization/info`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({
                customSystemPrompt: testPrompt,
                aiConfig: {
                    aiName: 'Test AI',
                    welcomeMessage: 'Test Welcome',
                    systemPrompt: testPrompt,
                    model: 'gpt-4'
                }
            })
        });
        data = await res.json();
        console.log(`Response status: ${res.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));

        // Step 3: Immediately re-fetch to verify
        console.log('\nStep 3: Verifying save by fetching organization info...');
        res = await fetch(`${API_URL}/api/organization/info`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        data = await res.json();
        console.log(`Saved customSystemPrompt:`, data.organization?.customSystemPrompt || 'NULL');
        console.log(`Saved aiConfig.systemPrompt:`, data.organization?.aiConfig?.systemPrompt || 'NULL');

        // Verify the prompt matches
        if (data.organization?.customSystemPrompt === testPrompt) {
            console.log('\n✅ SUCCESS: customSystemPrompt was saved and retrieved correctly!');
        } else if (data.organization?.aiConfig?.systemPrompt === testPrompt) {
            console.log('\n⚠️  PARTIAL: customSystemPrompt is null, but aiConfig.systemPrompt has the value');
        } else {
            console.log('\n❌ FAILED: Prompt was not saved or retrieved correctly');
            console.log('Expected:', testPrompt.substring(0, 50));
            console.log('Got:', (data.organization?.customSystemPrompt || data.organization?.aiConfig?.systemPrompt || 'NOTHING').substring(0, 50));
        }

    } catch (error) {
        console.error('Test Error:', error.message);
    }
}

testCustomPromptFlow();
