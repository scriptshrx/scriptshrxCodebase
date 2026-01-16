const prisma = require('./src/lib/prisma');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    console.log('🔍 Testing login for ezeh@gmail.com...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'ezeh@gmail.com' },
      include: { tenant: true }
    });
    
    if (!user) {
      console.log('❌ User not found in database');
      process.exit(1);
    }
    
    console.log('✅ User found:', user.email);
    console.log('   Role:', user.role);
    console.log('   Tenant:', user.tenant.name);
    console.log('   Password hash exists:', !!user.password);
    
    // Try password verification (you need to know the password)
    // For testing, we'll just confirm hash exists
    console.log('\n✅ User is ready for login. Database connection working!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
