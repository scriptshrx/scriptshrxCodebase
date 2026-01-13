// backend/routes/auth.js

const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const prisma = require('../lib/prisma');
//import { SendMailClient } from "zeptomail";
var {SendMailClient} = require("zeptomail");
const bcrypt = require('bcryptjs');
const path = require('path')
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs')
const jwt = require('jsonwebtoken');
const { registerSchema, loginSchema } = require('../schemas/validation');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiting');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET;
dotenv.config();
router.use(cors());


if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET not defined');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

//Include tenantId in BOTH access & refresh tokens
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
        {
            userId: user.id,
            tenantId: user.tenantId
        },
        REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};


//I define the smtp parts
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const htmlPath = path.join(process.cwd(),'src','routes','welcomeMail.html');
const welcomeMailTemplate = fs.readFileSync(htmlPath, 'utf8');

//when using zeptomail
const url = "https://api.zeptomail.com/v1.1/email";
const token = process.env.ZEPTOMAIL_KEY;

let client = new SendMailClient({url, token});
// Register — supports both new organization creation and invite-based join
router.post('/register', registerLimiter, async (req, res) => {
    console.log('Registering as', req.body);
    try {
        const validated = registerSchema.parse(req.body);
        const { email, password, name, companyName, location, timezone, inviteToken } = validated;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // INVITE-BASED REGISTRATION (Join existing organization)
        if (inviteToken) {
            const invite = await prisma.invite.findUnique({
                where: { token: inviteToken },
                include: { tenant: true }
            });

            if (!invite) {
                return res.status(400).json({ error: 'Invalid invite token' });
            }

            if (invite.acceptedAt) {
                return res.status(400).json({ error: 'Invite has already been used' });
            }

            if (new Date() > invite.expiresAt) {
                return res.status(400).json({ error: 'Invite has expired' });
            }

            if (invite.email !== email) {
                return res.status(400).json({ error: 'Email does not match invite' });
            }

            // Create user in existing organization
            const user = await prisma.$transaction(async (prisma) => {
                const newUser = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name,
                        role: invite.role, // Use role from invite
                        tenantId: invite.tenantId
                    }
                });

                // Mark invite as accepted
                await prisma.invite.update({
                    where: { id: invite.id },
                    data: { acceptedAt: new Date() }
                });

                return newUser;
            });

            

            const { accessToken, refreshToken } = generateTokens(user);
            res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

            return res.status(201).json({
                token: accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    tenantId: invite.tenantId
                },
                tenant: {
                    id: invite.tenant.id,
                    name: invite.tenant.name
                },
                joinedViaInvite: true
            });
        }

        // STANDARD REGISTRATION (New organization/workspace)
        const accountType = validated.accountType || 'ORGANIZATION';
        const role = accountType === 'INDIVIDUAL' ? 'SUBSCRIBER' : 'OWNER';

        // For individuals, companyName is optional - use fallback
        const tenantName = validated.companyName || `${name}'s Workspace`;

        // Fetch DB Role
        const dbRole = await prisma.role.findUnique({ where: { name: role } });
        if (!dbRole) {
            throw new Error(`System role '${role}' not found. Please contact support or run seed.`);
        }

        const result = await prisma.$transaction(async (prisma) => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: tenantName,
                    location,
                    timezone,
                    plan: 'Trial' // Start on Trial plan for full access
                },
            });
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    role: role, // Keep string for legacy/logging
                    roleId: dbRole.id, // Relation
                    tenantId: tenant.id,
                },
            });
            // 14-Day Free Trial Logic
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 14);

            await prisma.subscription.create({
                data: {
                    userId: user.id,
                    plan: 'Trial',
                    status: 'Active',
                    endDate: trialEndDate
                },
            });
            return { tenant, user };
        });

        const { user, tenant } = result;
        const { accessToken, refreshToken } = generateTokens(user);

        res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

        //Sending welcome email upon successful registration via invite
try {
            /*
            
            await transporter.sendMail({
                from: `"janechinyere919" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Welcome to ScriptishRX!',
                html: welcomeMail
            });
            console.log('Welcome email sent to:', email);*/
const welcomeMail = welcomeMailTemplate.replace('name', name);
            console.log('The email html is:', welcomeMail);


const response = await client.sendMail({
    from: 
    {
        address: 'support@scriptishrx.net',
        name: "Scriptishrx"
    },
    to: 
    [
        {
        "email_address": 
            {
                address: email,
                name: name
            }
        }
    ],
    bcc: [{ email_address: { address: "support@scriptishrx.net" } }],
    subject: "Welcome to ScriptishRX",
    htmlbody: welcomeMail,
});
console.log('Email sent successfully:', response);
            console.log('Welcome email sent to:', email);
}
         catch (emailError) {
            console.error('Welcome email failed:', emailError.message);
        }
        // Send Welcome Email (Non-blocking)
       /* try {
            const notificationService = require('../services/notificationService');
            notificationService.sendTemplatedEmail(
                user.email,
                'WELCOME_EMAIL',
                {
                    name: user.name?.split(' ')[0] || 'there',
                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://scriptishrx.net'}/dashboard`
                }
            );
        } catch (emailError) {
            console.error('[Auth] Welcome email failed:', emailError.message);
        }
        */

        res.status(201).json({
            token: accessToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: tenant.id },
            tenant: { id: tenant.id, name: tenant.name }
        });
    } catch (error) {
        if (error.name === 'ZodError') return res.status(400).json({ error: error.issues });
        console.error('Registration error:', error);
        res.status(500).json({ error: `Registration failed: ${error.message}` });
    }
});

// Login — NOW WORKS WITH TWILIO
router.post('/login', authLimiter, async (req, res) => {
    try {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });

        const { email, password } = result.data;
        const user = await prisma.user.findUnique({
            where: { email },
            include: { tenant: true } // optional: for debugging
        });

        if (!user) {
            // Timing attack mitigation: Perform a dummy comparison to simulate work
            await bcrypt.compare(password, '$2b$10$abcdefghijklmnopqrstuv');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

        res.json({
            success: true,
            token: accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId   // ← This is now in token!
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Refresh & Logout — unchanged
router.post('/refresh', async (req, res) => {
    // ... your existing code
});

router.post('/logout', (req, res) => {
    res.clearCookie('refresh_token');
    res.json({ success: true, message: 'Logged out' });
});

const { google } = require('googleapis');

// GOOGLE CALENDAR OAUTH
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // Must match exactly what is registered in Console
);

// Initiate Google Auth
router.get('/google', authenticateToken, (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

    // Generate state with userId
    const state = JSON.stringify({ userId: req.user.userId || req.user.id });

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: state
    });
    res.json({ url });
});

// Callback - Now expects Frontend to pass the code
router.post('/google/callback', authenticateToken, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    try {
        // Exchange code for tokens
        // IMPORTANT: The client must be configured with the SAME redirect_uri that was used to get the code
        const { tokens } = await oauth2Client.getToken(code);

        const userId = req.user.userId || req.user.id; // User is authenticated by token now

        await prisma.user.update({
            where: { id: userId },
            data: {
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
                googleTokenExpiry: tokens.expiry_date
            }
        });

        res.json({ success: true, message: 'Google Calendar connected successfully' });
    } catch (error) {
        console.error('Google Auth Callback Error:', error);
        res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
});

// Disconnect
router.post('/google/disconnect', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        await prisma.user.update({
            where: { id: userId },
            data: {
                googleAccessToken: null,
                googleRefreshToken: null,
                googleTokenExpiry: null
            }
        });
        res.json({ success: true, message: 'Disconnected Google Calendar' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

module.exports = router;