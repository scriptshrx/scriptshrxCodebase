/**
 * Scheduled Jobs - Automated Notification Engine
 * 
 * This module handles:
 * - Booking reminders (24h and 48h before)
 * - Trial expiry warnings (3 days before)
 * 
 * Run via: require('./scripts/scheduledJobs') in app.js
 */

const cron = require('node-cron');
const prisma = require('../src/lib/prisma');
const notificationService = require('../src/services/notificationService');

// ============================================================
// BOOKING REMINDERS - Runs daily at midnight
// ============================================================
const runBookingReminders = async () => {
    console.log('⏰ [CRON] Running booking reminders...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    try {
        // Find bookings between 24-48 hours from now
        const upcomingBookings = await prisma.booking.findMany({
            where: {
                date: {
                    gte: in24Hours,
                    lte: in48Hours
                },
                status: 'Scheduled'
            },
            include: {
                client: true,
                tenant: true
            }
        });

        console.log(`📅 Found ${upcomingBookings.length} bookings to remind`);

        for (const booking of upcomingBookings) {
            if (!booking.client?.email) continue;

            const hoursUntil = Math.round((new Date(booking.date).getTime() - now.getTime()) / (1000 * 60 * 60));
            const timeLabel = hoursUntil <= 24 ? 'Tomorrow' : 'in 2 Days';

            await notificationService.sendTemplatedEmail(
                booking.client.email,
                'BOOKING_REMINDER',
                {
                    clientName: booking.client.name,
                    date: booking.date,
                    timeLabel,
                    meetingLink: booking.meetingLink,
                    purpose: booking.purpose
                }
            );

            console.log(`  ✅ Reminder sent to ${booking.client.email} (${timeLabel})`);
        }
    } catch (error) {
        console.error('❌ [CRON] Booking reminder error:', error.message);
    }
};

// ============================================================
// TRIAL EXPIRY WARNINGS - Runs daily at 9 AM
// ============================================================
const runTrialExpiryWarnings = async () => {
    console.log('⏰ [CRON] Running trial expiry warnings...');

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Set to start/end of day for accurate comparison
    const startOfDay = new Date(threeDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(threeDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        // Find subscriptions expiring in exactly 3 days
        const expiringSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'trial',
                endDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                user: true
            }
        });

        console.log(`⚠️ Found ${expiringSubscriptions.length} trials expiring in 3 days`);

        for (const sub of expiringSubscriptions) {
            if (!sub.user?.email) continue;

            await notificationService.sendTemplatedEmail(
                sub.user.email,
                'TRIAL_EXPIRY_WARNING',
                {
                    name: sub.user.name || 'there',
                    daysLeft: 3,
                    upgradeUrl: 'https://scriptishrx.net/dashboard/settings?tab=billing'
                }
            );

            // Also create in-app notification
            await notificationService.createNotification(
                sub.user.id,
                'Trial Expiring Soon',
                'Your free trial expires in 3 days. Upgrade now to keep your access!',
                'warning',
                '/dashboard/settings?tab=billing'
            );

            console.log(`  ✅ Trial warning sent to ${sub.user.email}`);
        }
    } catch (error) {
        console.error('❌ [CRON] Trial expiry warning error:', error.message);
    }
};

// ============================================================
// INITIALIZE CRON JOBS
// ============================================================
const initializeScheduledJobs = () => {
    console.log('📅 Initializing scheduled jobs...');

    // Booking Reminders: Every day at midnight (00:00)
    cron.schedule('0 0 * * *', () => {
        runBookingReminders();
    }, {
        timezone: 'UTC'
    });

    // Trial Expiry Warnings: Every day at 9 AM
    cron.schedule('0 9 * * *', () => {
        runTrialExpiryWarnings();
    }, {
        timezone: 'UTC'
    });

    console.log('✅ Scheduled jobs initialized:');
    console.log('   - Booking reminders: Daily at 00:00 UTC');
    console.log('   - Trial expiry warnings: Daily at 09:00 UTC');
};

// Export for manual testing
module.exports = {
    initializeScheduledJobs,
    runBookingReminders,
    runTrialExpiryWarnings
};
