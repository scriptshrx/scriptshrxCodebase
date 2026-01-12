const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data extracted from scriptishrx.com (Travel Wellness Platform)
// We treat this as "Additional Knowledge" alongside the SaaS Voice Agent info.
const webDataFaqs = [
    {
        question: "What is the ScriptishRx Wellness Guide?",
        answer: "ScriptishRx's Wellness Guide is an AI-powered travel and wellness platform designed to be your concierge personal assistant. It provides historical insights, wellness tips, and real-time travel advisories for over 106 global destinations."
    },
    {
        question: "What features does the Travel Wellness platform offer?",
        answer: "The platform features specialized AI guidance for travelers at airports, hotels, and destinations. It offers personalized health insights, lifestyle guidance, and helps wellness businesses manage their operations with a dedicated dashboard."
    },
    {
        question: "What subscription tiers are available for the Wellness App?",
        answer: "For the Wellness App, we offer three tiers: Basic (Essential features), Intermediate (Advanced tools), and Advanced (Full platform access including business management tools)."
    },
    {
        question: "Who is ScriptishRx for?",
        answer: "ScriptishRx serves specialized products for two main groups: 1) Wellness Businesses looking for AI-powered operational tools and 2) Individual Travelers seeking a personalized wellness companion and travel guide."
    }
];

async function main() {
    console.log("Fetching tenants...");
    const tenants = await prisma.tenant.findMany();

    for (const tenant of tenants) {
        console.log(`Processing ${tenant.name}...`);

        // 1. Get current config
        const currentConfig = tenant.aiConfig || {};
        let currentFaqs = currentConfig.faqs || [];

        // 2. Merge new Web Data FAQs
        // We filter out duplicates based on question text to prevent redundancy if run multiple times
        const newFaqsUnique = webDataFaqs.filter(newFaq =>
            !currentFaqs.some(existing => existing.question === newFaq.question)
        );

        if (newFaqsUnique.length === 0) {
            console.log(`   - No new FAQs to add via web import.`);
            continue;
        }

        const updatedFaqs = [...currentFaqs, ...newFaqsUnique];

        // 3. Save back to DB
        const newConfig = {
            ...currentConfig,
            faqs: updatedFaqs
        };

        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { aiConfig: newConfig }
        });

        console.log(`   + Added ${newFaqsUnique.length} new FAQs from scriptishrx.com`);
    }

    console.log("\n✅ AI Knowledge Base updated with Website Data.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
