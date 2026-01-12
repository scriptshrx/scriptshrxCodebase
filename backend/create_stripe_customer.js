const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load from root .env
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

const USER_ID = 'afd14aa9-27db-4e14-b5af-83e31414739b'; // test@scriptishrx.com

async function main() {
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY is missing');
        return;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: USER_ID },
            include: { subscription: true }
        });

        if (!user) {
            console.error('User not found');
            return;
        }

        console.log(`Creating Stripe customer for ${user.email}...`);

        const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: {
                userId: user.id,
                tenantId: user.tenantId
            }
        });

        console.log(`Created Customer: ${customer.id}`);

        await prisma.subscription.update({
            where: { userId: USER_ID },
            data: { stripeId: customer.id }
        });

        console.log('Database updated with Stripe Customer ID.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
