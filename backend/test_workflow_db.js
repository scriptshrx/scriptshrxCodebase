const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Testing Workflow Creation (DB Level)...');

    // 1. Get Tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error('No tenant found');
    console.log(`Using Tenant: ${tenant.id}`);

    // 2. Try Create
    try {
        const wf = await prisma.workflow.create({
            data: {
                name: 'Test Workflow',
                trigger: 'new_client',
                actions: '[]',
                tenantId: tenant.id
            }
        });
        console.log('✅ Workflow created successfully via Prisma:', wf.id);

        // Cleanup
        await prisma.workflow.delete({ where: { id: wf.id } });
    } catch (e) {
        console.error('❌ Failed to create workflow via Prisma:', e);
    }
}

main()
    .finally(() => prisma.$disconnect());
