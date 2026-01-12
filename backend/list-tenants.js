// list-tenants.js – quick script to print all tenant IDs and names
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
    console.log('Tenants in DB:');
    tenants.forEach(t => console.log(`${t.id} – ${t.name}`));
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
