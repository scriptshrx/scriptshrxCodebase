// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const prismaDefault = require('../lib/prisma');
// Use concurrent client for auth routes to avoid prepared statement conflicts
const prisma = prismaDefault.concurrent || prismaDefault;
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

//Include tenantId in BOTH access & refresh token
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

const htmlPath = path.join(process.cwd(),'src','routes','welcomeMail.html');
const welcomeMailTemplate = fs.readFileSync(htmlPath, 'utf8');

//when using zeptomail
const url = "https://api.zeptomail.com/v1.1/email";
const token = process.env.ZEPTOMAIL_KEY;

let client = new SendMailClient({url, token});
// Register — supports both new organization creation and invite-based join
router.post('/register', registerLimiter, async (req, res) => {
    console.log('DATABASE_URL used is:', process.env.DATABASE_URL);
    console.log('DIRECT_URL used is:', process.env.DIRECT_URL);
    console.log('Registering as', req.body);
    try {
        let validated, email, password, name, companyName, phone, country, timezone, inviteToken, hashedPassword;
        
        try{
            validated = registerSchema.parse(req.body);
            ({ email, password, name, companyName, location, timezone, phone, country, inviteToken = undefined } = validated);

            // If no password, provided for invite registration, generate a temporary one
            if (inviteToken && !password) {
                const crypto = require('crypto');
                password = crypto.randomBytes(16).toString('hex');
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) return res.status(400).json({ error: 'User already exists' });

            hashedPassword = await bcrypt.hash(password, 10);
        } catch(err){
            console.log('Validation error is:', err);
            return res.status(400).json({ error: err.errors ? err.errors : err.message });
        }

        // INVITE-BASED REGISTRATION (Join existing organization)
        if (inviteToken) {
            const invite = await prisma.invite.findUnique({
                where: { token: inviteToken },
                include: { tenant: true }
            });

            if (!invite) {
                return res.status(400).json({ error: 'Invalid invite token' });
            }

            if (new Date() > invite.expiresAt) {
                return res.status(400).json({ error: 'Invite has expired' });
            }

            // Only validate email match if invite has a real email (not a temp invite)
            if (!invite.email.includes('@temp.local') && invite.email !== email) {
                return res.status(400).json({ error: 'Email does not match invite' });
            }

            // Create user in existing organization
            const user = await prisma.$transaction(async (prisma) => {
                const newUser = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name,
                        phoneNumber: phone,
                        country,
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
        console.log('[Register] Standard registration - accountType:', accountType, 'role:', role);

        // For individuals, companyName is optional - use fallback
        const tenantName = validated.companyName || `${name}'s Workspace`;

        // Fetch DB Role
        console.log('[Register] Looking up role:', role);
        const dbRole = await prisma.role.findUnique({ where: { name: role } });
        if (!dbRole) {
            throw new Error(`System role '${role}' not found. Please contact support or run seed.`);
        }
        console.log('[Register] Found role:', dbRole.id);

        console.log('[Register] Creating tenant and user in transaction...');
        const result = await prisma.$transaction(async (prisma) => {
            console.log('[Register] Creating tenant:', tenantName);
            const tenant = await prisma.tenant.create({
                data: {
                    name: tenantName,
                    location,
                    timezone,
                    plan: 'Trial' // Start on Trial plan for full access
                },
            });
            console.log('[Register] Tenant created:', tenant.id);
            
            console.log('[Register] Creating user with roleId:', dbRole.id);
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

        try {
              let welcomeMail = welcomeMailTemplate.replace('name', name);
            //welcomeMail = welcomeMail.replace('/dashboard', `${frontendUrl}/dashboard`);
            console.log('The email html is being sent with dashboard URL: https://scriptishrx.net/dashboard');

            const response = await client.sendMail({
                from: {
                    address: 'support@scriptishrx.net',
                    name: "Scriptishrx"
                },
                to: [
                    {
                        "email_address": {
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
        } catch (emailError) {
            console.error('Welcome email failed:', emailError.message);
        }
            console.log('[Register] User created:', user.id);
            
            // 14-Day Free Trial Logic
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 14);
            console.log('[Register] Creating subscription - status: active, endDate:', trialEndDate);

            await prisma.subscription.create({
                data: {
                    userId: user.id,
                    plan: 'Trial',
                    status: 'active',
                    endDate: trialEndDate
                },
            });
            console.log('[Register] Subscription created');
            return { tenant, user };
        });

        const { user, tenant } = result;
        console.log('[Register] Transaction completed, generating tokens...');
        const { accessToken, refreshToken } = generateTokens(user);

        res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

        //Sending welcome email upon successful registration
        console.log('[Register] Attempting to send welcome email to:', email);
        try {
            /*
            
            await transporter.sendMail({
                from: `"janechinyere919" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Welcome to ScriptishRX!',
                html: welcomeMail
            });
            console.log('Welcome email sent to:', email);*/
            //const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://scriptishrx.net';
            let welcomeMail = welcomeMailTemplate.replace('name', name);
            //welcomeMail = welcomeMail.replace('/dashboard', `${frontendUrl}/dashboard`);
            console.log('The email html is being sent with dashboard URL: https://scriptishrx.net/dashboard');

            const response = await client.sendMail({
                from: {
                    address: 'support@scriptishrx.net',
                    name: "Scriptishrx"
                },
                to: [
                    {
                        "email_address": {
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
        } catch (emailError) {
            console.error('Welcome email failed:', emailError.message);
        }
        
        console.log('[Register] Sending success response...');
        res.status(201).json({
            token: accessToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: tenant.id },
            tenant: { id: tenant.id, name: tenant.name }
        });
        console.log('[Register] Registration completed successfully for:', email);
    } catch (error) {
        if (error.name === 'ZodError') {
            console.error('Zod validation error:', error.errors);
            return res.status(400).json({ error: error.issues || error.errors });
        }
        console.error('Registration error:', error.message, error.stack);
        res.status(500).json({ error: `Registration failed: ${error.message}` });
    }
});

// Login — NOW WORKS WITH TWILIO
router.post('/login', authLimiter, async (req, res, next) => {
    const startTime = Date.now();
    
    // Ensure response is sent even if something goes wrong
    const sendResponse = (status, body) => {
        if (!res.headersSent) {
            const duration = Date.now() - startTime;
            console.log(`[Login] Response sent in ${duration}ms with status ${status}`);
            res.status(status).json(body);
        }
    };

    try {
        console.log('[Login] ====== LOGIN ROUTE STARTED ======');
        console.log('[Login] Timestamp:', new Date().toISOString());
        console.log('[Login] DATABASE_URL:', process.env.DATABASE_URL ? '***SET***' : '***NOT SET***');
        console.log('[Login] DIRECT_URL:', process.env.DIRECT_URL ? '***SET***' : '***NOT SET***');
        console.log('[Login] NODE_ENV:', process.env.NODE_ENV);
        console.log('[Login] Request body received:', req.body ? 'YES' : 'NO');
        console.log('[Login] Request headers:', JSON.stringify(req.headers));
        
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            console.error('[Login] Validation failed:', result.error.errors[0].message);
            return sendResponse(400, { error: result.error.errors[0].message });
        }

        const { email, password } = result.data;
        console.log(`[Login] User: ${email} logging in`);
        
        console.log(`[Login] Starting database query for user: ${email}`);
        const queryStartTime = Date.now();
        
        const user = await prisma.user.findUnique({
            where: { email },
            include: { tenant: true }
        });
        
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[Login] Database query completed in ${queryDuration}ms`);

        if (!user) {
            console.warn(`[Login] User not found: ${email} (query took ${queryDuration}ms)`);
            // Timing attack mitigation: Perform a dummy comparison to simulate work
            await bcrypt.compare(password, '$2b$10$abcdefghijklmnopqrstuv');
            return sendResponse(401, { error: 'Invalid credentials' });
        }

        console.log(`[Login] User found: ${user.id}, comparing passwords (query took ${queryDuration}ms)`);
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.warn(`[Login] Invalid password for user: ${email}`);
            return sendResponse(401, { error: 'Invalid credentials' });
        }

        console.log(`[Login] Password valid, generating tokens for user: ${email}`);
        const { accessToken, refreshToken } = generateTokens(user);

        res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

        console.log(`[Login] Login successful for user: ${email}`);
        return sendResponse(200, {
            success: true,
            token: accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId
            }
        });
    } catch (error) {
        console.error('[Login] ====== ERROR CAUGHT ======');
        console.error('[Login] Error message:', error.message);
        console.error('[Login] Error name:', error.name);
        console.error('[Login] Error code:', error.code);
        console.error('[Login] Full stack:', error.stack);
        console.error('[Login] Error details:', JSON.stringify(error, null, 2));
        return sendResponse(500, { error: 'Login failed', details: error.message });
    }
});

// Refresh & Logout
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token || req.body.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token provided' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        
        // Get user
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { tenant: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new tokens
        const tokens = generateTokens(user);
        res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTIONS);

        res.json({
            token: tokens.accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId
            }
        });
    } catch (error) {
        console.error('[Refresh] Error:', error.message);
        res.status(401).json({ error: 'Token refresh failed' });
    }
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

/**
 * POST /api/auth/forgot-password - Request password reset
 * Sends a password reset email with a unique token
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email address is required'
            });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // For security, don't reveal if email exists
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent'
            });
        }

        // Generate reset token (32-character hex string)
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(16).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save token to database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry
            }
        });

        // Build reset link
        const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://scriptishrx.net';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        // Send email ASYNCHRONOUSLY so we don't block the response
        // This prevents timeout issues with the database connection
        (async () => {
            try {
                const resetMailTemplate = fs.readFileSync(
                    path.join(process.cwd(), 'src', 'routes', 'resetPasswordMail.html'),
                    'utf8'
                );

                let resetMail = resetMailTemplate
                    .replace('name', user.name || user.email)
                    .replace(/resetLink/g, resetLink);

                const response = await client.sendMail({
                    from: {
                        address: 'support@scriptishrx.net',
                        name: 'ScriptishRx'
                    },
                    to: [
                        {
                            email_address: {
                                address: email,
                                name: user.name || email
                            }
                        }
                    ],
                    bcc: [{ email_address: { address: 'support@scriptishrx.net' } }],
                    subject: 'Password Reset Request - ScriptishRx',
                    htmlbody: resetMail
                });

                console.log('Password reset email sent successfully to:', email);
            } catch (emailError) {
                console.error('Failed to send password reset email:', emailError.message);
            }
        })();

        // Return success immediately - email will be sent in background
        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process password reset request'
        });
    }
});

/**
 * POST /api/auth/reset-password - Reset password with token
 * Validates token and updates password
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Reset token and new password are required'
            });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        // Find user by reset token
        const user = await prisma.user.findUnique({
            where: { resetToken: token }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        // Check token expiry
        if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
            return res.status(400).json({
                success: false,
                error: 'Reset token has expired. Please request a new one'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        console.log('Password reset successfully for user:', user.email);

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});

/**
 * GET /api/auth/verify-reset-token/:token - Verify if reset token is valid
 */
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                valid: false,
                error: 'Token is required'
            });
        }

        const user = await prisma.user.findUnique({
            where: { resetToken: token }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                valid: false,
                error: 'Invalid reset token'
            });
        }

        if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
            return res.status(400).json({
                success: false,
                valid: false,
                error: 'Reset token has expired'
            });
        }

        return res.status(200).json({
            success: true,
            valid: true,
            email: user.email,
            message: 'Token is valid'
        });
    } catch (error) {
        console.error('Verify reset token error:', error);
        res.status(500).json({
            success: false,
            valid: false,
            error: 'Failed to verify token'
        });
    }
});

module.exports = router;