const prisma = require('./src/lib/prisma');

async function checkRoles() {
  try {
    console.log('Checking for OWNER and SUBSCRIBER roles...');
    
    const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
    const subscriberRole = await prisma.role.findUnique({ where: { name: 'SUBSCRIBER' } });
    const allRoles = await prisma.role.findMany();
    
    console.log('All roles in DB:', allRoles);
    console.log('OWNER role:', ownerRole);
    console.log('SUBSCRIBER role:', subscriberRole);
    
    if (!ownerRole) console.warn('⚠️ OWNER role missing!');
    if (!subscriberRole) console.warn('⚠️ SUBSCRIBER role missing!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
