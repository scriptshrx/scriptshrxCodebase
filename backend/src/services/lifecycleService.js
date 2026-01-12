// backend/src/services/lifecycleService.js
/**
 * Lifecycle Automation Engine
 * - Daily scan for trial subscriptions ending in 3 days → send reminder email via Instantly (fallback to Mailjet)
 * - Uses node-cron for scheduling (runs in the same process as the backend server)
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const notificationService = require('./notificationService');
const { addDays, isSameDay } = require('date-fns');

// Helper: find subscriptions that are in trial and ending in exactly 3 days
async function findExpiringTrials() {
    const targetDate = addDays(new Date(), 3);
    const subs = await prisma.subscription.findMany({
        where: {
            status: 'Active',
            plan: 'Trial',
            endDate: {
                not: null,
                gte: targetDate,
                lt: addDays(targetDate, 1)
            }
        },
        include: { user: true }
    });
    return subs.filter(s => isSameDay(s.endDate, targetDate));
}

async function sendTrialEndingEmail(user, daysLeft) {
    const templateData = {
        userName: user.name || user.email,
        daysLeft,
        // You can extend with more dynamic data as needed
    };
    // Prefer Instantly (handled inside NotificationService)
    await notificationService.sendTemplatedEmail(
        user.email,
        'TRIAL_ENDING',
        templateData
    );
}

async function runDailyJob() {
    try {
        const expiring = await findExpiringTrials();
        for (const sub of expiring) {
            await sendTrialEndingEmail(sub.user, 3);
        }
        console.log(`[Lifecycle] Processed ${expiring.length} trial‑ending notifications`);
    } catch (err) {
        console.error('[Lifecycle] Error processing trial reminders:', err);
    }
}

// Schedule: every day at 00:15 UTC (adjust as needed)
cron.schedule('15 0 * * *', () => {
    console.log('[Lifecycle] Running daily trial‑ending job');
    runDailyJob();
});

module.exports = { runDailyJob };
