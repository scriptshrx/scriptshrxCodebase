const ragService = require('./backend/services/ragService');

async function debug() {
    console.log("--- Debugging Location Query ---");
    const query = "Where is the office";
    console.log(`Query: "${query}"`);
    const response = await ragService.query(query);
    console.log("Response:", response);

    // Check which keyword it might be matching
    const lowerMsg = query.toLowerCase();
    console.log("\nMatching against FAQs:");
    // We need to access faqs, but it's not exported directly. 
    // I'll just rely on the output for now, or I could modify ragService to export it for testing if needed.
    // For now, let's just see what it returns.
}

debug();
