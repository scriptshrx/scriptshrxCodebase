const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/lib/prisma');
const notificationService = require('../src/services/notificationService');

async function checkTrialExpiry() {
    console.log(`[${new Date().toISOString()}] Starting trial expiry check...`);

    const now = new Date();
    // Target: 3 days from now
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 3);

    // Define the start and end of that target day to match endDate accurately
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Checking for trials ending between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    try {
        const expiringSubscriptions = await prisma.subscription.findMany({
            where: {
                plan: 'Trial',
                status: 'Active',
                endDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                user: true
            }
        });

        console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in 3 days.`);

        for (const sub of expiringSubscriptions) {
            if (sub.user && sub.user.email) {
                // Check if we already sent an email (Optional refinement: Check Notification table)
                // For now, relying on the daily CRON schedule + date window for basic idempotency

                console.log(`Sending notification to ${sub.user.email} (User ID: ${sub.userId})...`);

                try {
                    // 1. Send Email
                    const upgradeLink = `${process.env.FRONTEND_URL || 'https://scriptishrx.net'}/dashboard/settings/subscription`;
                    await notificationService.sendEmail(
                        sub.user.email,
                        'Your ScriptishRx Free Trial Ends Soon!',
                        `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2>Your Free Trial Ends in 3 Days</h2>
                            <p>Hi ${sub.user.name || 'there'},</p>
                            <p>We hope you're enjoying ScriptishRx. This is a friendly reminder that your 14-day free trial will expire on <strong>${sub.endDate.toDateString()}</strong>.</p>
                            <p>To avoid any interruption to your service and keep access to all our premium features, please upgrade your plan.</p>
                            <br/>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${upgradeLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Upgrade My Plan</a>
                            </div>
                            <p>If you have any questions, feel free to reply to this email.</p>
                        </div>
                        `
                    );

                    // 2. In-App Notification
                    await notificationService.createNotification(
                        sub.userId,
                        'Trial Expiring Soon',
                        'Your free trial ends in 3 days. Upgrade now to keep access.',
                        'warning',
                        '/dashboard/settings/subscription'
                    );

                    console.log(`✓ Notification sent to ${sub.user.email}`);
                } catch (sendError) {
                    console.error(`Failed to notify ${sub.user.email}:`, sendError);
                }
            }
        }
    } catch (error) {
        console.error('Error checking trial expiry:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Execute logic
checkTrialExpiry()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
