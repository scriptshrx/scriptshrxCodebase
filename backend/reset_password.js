const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    try {
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.update({
            where: { email: 'test@scriptishrx.com' },
            data: { password: hashedPassword },
        });

        console.log('Password reset successfully for:', user.email);
        console.log('New hash start:', hashedPassword.substring(0, 10));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
