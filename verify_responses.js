const ragService = require('./backend/services/ragService');
const guideService = require('./backend/services/guideService');
const ctaService = require('./backend/services/ctaService');

async function verify() {
    console.log("--- Testing RAG Service ---");
    console.log("Q: What services do you offer?");
    console.log(await ragService.query("What services do you offer?"));
    console.log("\nQ: What do you do at ScriptishRx?");
    console.log(await ragService.query("What do you do at ScriptishRx?"));
    console.log("\nQ: Do you offer trainings?");
    console.log(await ragService.query("Do you offer trainings?"));
    console.log("\nQ: Wellness tips");
    console.log(await ragService.query("Wellness tips"));
    console.log("\nQ: Future programs");
    console.log(await ragService.query("Future programs"));
    console.log("\nQ: Where is ScriptishRx office?");
    console.log(await ragService.query("Where is ScriptishRx office?"));
    console.log("\nQ: How do I book an appointment?");
    console.log(await ragService.query("How do I book an appointment?"));

    console.log("\n--- Testing Guide Service ---");
    console.log("Q: top sights in Chicago");
    console.log(guideService.getRecommendation("top sights in Chicago"));

    console.log("\n--- Testing CTA Service ---");
    console.log("Q: directions from O'Hare");
    console.log(ctaService.getDirections("directions from O'Hare"));
    console.log("\nQ: directions from Midway");
    console.log(ctaService.getDirections("directions from Midway"));

    console.log("\n--- Debugging Specific User Query ---");
    console.log("Q: Where is the office");
    console.log(await ragService.query("Where is the office"));
}

verify();
