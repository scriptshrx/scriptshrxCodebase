const nodemailer = require('nodemailer');
const twilio = require('twilio');
const prisma = require('../lib/prisma');
const socketService = require('./socketService');

const EMAIL_TEMPLATES = {
    'WELCOME_EMAIL': (data) => ({
        subject: 'Welcome to ScriptishRX!',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Welcome, ${data.name}!</h2>
                <p>We're excited to have you on board. Your account has been successfully created.</p>
                <p><a href="${data.dashboardUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
                <br />
                <p>Best regards,<br/>The ScriptishRx Team</p>
            </div>
        `
    }),
    'MEETING_MINUTES': (data) => ({
        subject: `Meeting Minutes - ${data.tenantName}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Meeting Minutes</h2>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <hr />
                <h3>Summary</h3>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                    ${data.content}
                </div>
                <br />
                <p>Best regards,<br/>${data.tenantName}</p>
            </div>
        `
    }),
    'BOOKING_CONFIRMATION': (data) => ({
        subject: `Booking Confirmation - ${data.tenantName}`,
        html: `<p>Hi ${data.clientName},</p><p>Your appointment on <strong>${data.date}</strong> is confirmed.</p>`
    }),
    'TRIAL_ENDING': (data) => ({
        subject: 'Your Trial is Ending Soon',
        html: `<p>Hi ${data.userName},</p><p>Your trial ends in ${data.daysLeft} days. Upgrade now to keep access.</p>`
    })
};

class NotificationService {
    constructor() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: false
                },
                connectionTimeout: 3000,  // 3 second timeout
                socketTimeout: 3000       // 3 second timeout
            });

            console.log('✅ Nodemailer configured for', process.env.SMTP_HOST);

            // Verify connection asynchronously without blocking - set a timeout to prevent hanging
            setImmediate(() => {
                const verifyTimeout = setTimeout(() => {
                    console.warn('⚠️ SMTP verification timeout (3s)');
                }, 3000);

                this.transporter.verify(function (error, success) {
                    clearTimeout(verifyTimeout);
                    if (error) {
                        console.error('❌ SMTP Connection Error:', error.message);
                    } else {
                        console.log('✅ SMTP Server is ready to take our messages');
                    }
                });
            });
        } else {
            const msg = 'SMTP Environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing.';
            if (process.env.NODE_ENV === 'production') {
                console.error('🔴 FATAL: NotificationService - ' + msg);
            } else {
                console.warn('⚠️ NotificationService:', msg, 'Emails will be mocked.');
            }
        }
    }

        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.smsProvider = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        } else {
            console.warn('⚠️ NotificationService: Twilio not configured.');
        }
    }

    async createNotification(userId, title, message, type = 'info', link = null) {
        try {
            const notification = await prisma.notification.create({
                data: { userId, title, message, type, link }
            });
            socketService.sendToUser(userId, 'notification:new', notification);
            return notification;
        } catch (error) {
            console.error('[NotificationService] Failed to create notification:', error.message);
        }
    }

    async sendTemplatedEmail(to, templateType, data) {
        if (!to) return;

        const template = EMAIL_TEMPLATES[templateType];
        if (!template) {
            console.error(`[NotificationService] Unknown template: ${templateType}`);
            return;
        }

        const { subject, html } = template(data);
        return this.sendEmail(to, subject, html);
    }

    async sendEmail(to, subject, html) {
        if (!to) return;

        const senderEmail = process.env.EMAIL_FROM || 'noreply@scriptishrx.com';
        const senderName = process.env.EMAIL_FROM_NAME || 'ScriptishRx';

        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: `"${senderName}" <${senderEmail}>`, // sender address
                    to: to, // list of receivers
                    subject: subject, // Subject line
                    html: html, // html body
                });
                console.log(`📧 Email sent to ${to} | Subject: ${subject} | MessageId: ${info.messageId}`);
                return info;
            } catch (error) {
                console.error(`❌ [Nodemailer] Email failed (${to}):`, error.message);
            }
        } else {
            console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        }
    }

    async sendSMS(to, body, tenantId = null) {
        if (!to) return;

        try {
            if (tenantId) {
                const twilioService = require('./twilioService');
                await twilioService.sendSms(tenantId, to, body);
            } else if (this.smsProvider && this.twilioPhone) {
                await this.smsProvider.messages.create({
                    body,
                    from: this.twilioPhone,
                    to
                });
                console.log(`📱 SMS sent to ${to}`);
            } else {
                console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
            }
        } catch (error) {
            console.error(`❌ SMS Failed (${to}):`, error.message);
        }
    }
}

module.exports = new NotificationService();
