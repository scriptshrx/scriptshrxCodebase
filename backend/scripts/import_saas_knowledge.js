const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data extracted from the provided "SaaS / CRM" Landing Page text
const saasDataFaqs = [
    {
        question: "What is ScriptishRx?",
        answer: "ScriptishRx is the #1 AI-powered business concierge platform for modern enterprises. It streamlines operations by combining booking, CRM, and client management into one place using AI agents."
    },
    {
        question: "What is the three-step process to get started?",
        answer: "1. Sign Up: Create your business profile instantly. 2. Setup Workflow: Customize your AI agents and automation rules. 3. Scale Business: Let AI handle operations while you focus on growth."
    },
    {
        question: "What analytics features are available?",
        answer: "Our platform offers insightful business metrics at a glance, allowing you to track client growth, revenue, and satisfaction in real-time. It includes custom visualizations and exportable PDF/CSV reports."
    },
    {
        question: "How do notifications work?",
        answer: "Smart notifications ensure you never miss a client opportunity. We offer instant push alerts with urgency filters and customizable channels."
    },
    {
        question: "What security measures are in place?",
        answer: "Your security is our priority. We offer Enterprise Security that is SOC2 Type II compliant with encrypted data storage."
    },
    {
        question: "How can I contact ScriptishRx?",
        answer: "You can email us at info@scriptishrx.com or visit our office at 111 N Wabash Ave Suite 1711, Chicago, Illinois 60602."
    },
    {
        question: "Who trusts ScriptishRx?",
        answer: "We are trusted by verified business leaders and partner with companies like TechFlow, GlobalScale, NexusCorp, InnovateX, and Vertex Solutions."
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

        // 2. Merge new SaaS Data FAQs
        // We filter out duplicates based on question text
        const newFaqsUnique = saasDataFaqs.filter(newFaq =>
            !currentFaqs.some(existing => existing.question === newFaq.question)
        );

        if (newFaqsUnique.length === 0) {
            console.log(`   - No new FAQs to add.`);
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

        console.log(`   + Added ${newFaqsUnique.length} new FAQs from SaaS Landing Page data`);
    }

    console.log("\n✅ AI Knowledge Base updated with SaaS Landing Page Data.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
