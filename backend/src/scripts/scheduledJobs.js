const cron = require('node-cron');
const prisma = require('../lib/prisma');
const notificationService = require('../services/notificationService');
const lifecycleService = require('../services/lifecycleService');
const { addDays, startOfDay, endOfDay } = require('date-fns');

/**
 * Initialize Scheduled Jobs
 */
function initializeScheduledJobs() {
    console.log('📅 Initializing scheduled jobs...');

    // 1. TRIAL EXPIRY WARNINGS
    // Run daily at 09:00 UTC
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Running daily trial expiry check...');
        await lifecycleService.runDailyJob();
    });

    // 2. BOOKING REMINDERS (Example)
    // Run daily at 08:00 UTC
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Running daily booking reminders...');
        try {
            const tomorrow = addDays(new Date(), 1);
            const bookings = await prisma.booking.findMany({
                where: {
                    date: {
                        gte: startOfDay(tomorrow),
                        lte: endOfDay(tomorrow)
                    },
                    status: 'Scheduled'
                },
                include: { client: true, tenant: true }
            });

            for (const booking of bookings) {
                if (booking.client && booking.client.phone) {
                    await notificationService.sendSMS(
                        booking.client.phone,
                        `Reminder: You have an appointment tomorrow at ${booking.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with ${booking.tenant.name}.`,
                        booking.tenantId
                    );
                }
            }
            console.log(`✓ Sent ${bookings.length} booking reminders.`);
        } catch (error) {
            console.error('Error sending booking reminders:', error);
        }
    });

    console.log('✅ Scheduled jobs initialized:');
    console.log('   - Booking reminders: Daily at 08:00 UTC');
    console.log('   - Trial expiry warnings: Daily at 09:00 UTC');
}

module.exports = { initializeScheduledJobs };
