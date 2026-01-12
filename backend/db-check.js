const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking database roles...');
    try {
        const roles = await prisma.role.findMany();
        console.log('Roles found:', roles);
        if (roles.length === 0) {
            console.log('WARNING: No roles found in the database! Registration will definitely fail.');
        } else {
            console.log('Roles check complete.');
        }
    } catch (error) {
        console.error('Error checking roles:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
