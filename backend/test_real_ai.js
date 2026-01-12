
const fetch = require('node-fetch'); // Assuming node-fetch implies fetch is available or I'll use built-in if Node 18+

async function testAI() {
    console.log("🤖 Testing Real AI Response...");

    // Query that triggers multiple contexts (Airport + Pricing) + General chat
    // "How do I get there from O'Hare and how much is the lounge? I'm feeling stressed."
    // This requires:
    // 1. CTA Service (O'Hare directions)
    // 2. RAG Service (Lounge Pricing)
    // 3. LLM (Empathy for 'stressed', synthesis)

    const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: "How do I get there from O'Hare and how much is the lounge? I'm feeling stressed.",
            tenantId: 'test-tenant',
            sessionId: 'test-session'
        })
    });

    const data = await response.json();
    console.log("\nUser Query: 'How do I get there from O'Hare and how much is the lounge? I'm feeling stressed.'");
    console.log("\n---------------------------------------------------");
    console.log("AI Response:\n", data.content);
    console.log("---------------------------------------------------\n");

    if (data.role === 'assistant' && data.content.length > 50) {
        console.log("✅ SUCCESS: AI returned a substantive response.");
    } else {
        console.log("❌ FAILURE: Response might be empty or mocked.", data);
    }
}

testAI().catch(console.error);
