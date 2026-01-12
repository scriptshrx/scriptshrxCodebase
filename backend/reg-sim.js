const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    const email = `test_${Date.now()}@example.com`;
    const password = 'Password123!';
    const name = 'Test User';
    const companyName = 'Test Company';
    const location = 'USA';
    const timezone = 'UTC';
    const role = 'OWNER';

    console.log(`Starting registration simulation for ${email}...`);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const dbRole = await prisma.role.findUnique({ where: { name: role } });

        if (!dbRole) {
            throw new Error(`System role '${role}' not found.`);
        }

        const result = await prisma.$transaction(async (tx) => {
            console.log('Creating tenant...');
            const tenant = await tx.tenant.create({
                data: {
                    name: companyName,
                    location,
                    timezone
                },
            });
            console.log('Tenant created:', tenant.id);

            console.log('Creating user...');
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    role: role,
                    roleId: dbRole.id,
                    tenantId: tenant.id,
                },
            });
            console.log('User created:', user.id);

            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 14);

            console.log('Creating subscription...');
            await tx.subscription.create({
                data: {
                    userId: user.id,
                    plan: 'Trial',
                    status: 'Active',
                    endDate: trialEndDate
                },
            });
            console.log('Subscription created.');

            return { tenant, user };
        });

        console.log('SUCCESS: Registration simulation complete.');
    } catch (error) {
        console.error('FAILURE: Registration simulation failed!');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
