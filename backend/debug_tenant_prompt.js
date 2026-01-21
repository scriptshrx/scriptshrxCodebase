/**
 * Debug Script: Check Tenant customSystemPrompt in Database
 */

const prismaDefault = require('./src/lib/prisma');
const prisma = prismaDefault.concurrent || prismaDefault;

async function debugTenant() {
    console.log('\n=== TENANT CUSTOMSYSTEMPROMPT DEBUG ===\n');

    try {
        // Get all tenants with their custom system prompts
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                customSystemPrompt: true,
                aiConfig: true,
                aiName: true,
                aiWelcomeMessage: true,
                updatedAt: true
            }
        });

        if (tenants.length === 0) {
            console.log('❌ No tenants found in database!');
            return;
        }

        console.log(`Found ${tenants.length} tenant(s):\n`);

        tenants.forEach((tenant, index) => {
            console.log(`\n--- Tenant ${index + 1} ---`);
            console.log(`ID: ${tenant.id}`);
            console.log(`Name: ${tenant.name}`);
            console.log(`Phone: ${tenant.phoneNumber || 'NOT SET'}`);
            console.log(`AI Name: ${tenant.aiName}`);
            console.log(`Welcome Message: ${tenant.aiWelcomeMessage || 'NOT SET'}`);
            console.log(`Custom System Prompt:`);
            if (tenant.customSystemPrompt) {
                console.log(`  ✓ SET (${tenant.customSystemPrompt.length} chars)`);
                console.log(`  Preview: ${tenant.customSystemPrompt.substring(0, 100)}...`);
            } else {
                console.log(`  ❌ NULL or EMPTY`);
            }
            console.log(`AI Config: ${tenant.aiConfig ? 'SET' : 'NOT SET'}`);
            console.log(`Last Updated: ${tenant.updatedAt}`);
        });

        console.log('\n=== RECOMMENDATIONS ===\n');
        
        const tenantsWithoutPrompt = tenants.filter(t => !t.customSystemPrompt);
        if (tenantsWithoutPrompt.length > 0) {
            console.log(`⚠️  ${tenantsWithoutPrompt.length} tenant(s) have no custom system prompt set.`);
            console.log('   Make sure you upload the custom prompt from the frontend.');
        }

        const tenantsWithoutPhone = tenants.filter(t => !t.phoneNumber);
        if (tenantsWithoutPhone.length > 0) {
            console.log(`⚠️  ${tenantsWithoutPhone.length} tenant(s) have no phone number set.`);
            console.log('   Inbound calls may not be matched correctly.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

debugTenant();
