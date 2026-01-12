const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google/callback`
);

router.get('/events', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !user.googleAccessToken) {
            return res.status(401).json({ error: 'Google Calendar not connected', connected: false });
        }

        oauth2Client.setCredentials({
            access_token: user.googleAccessToken,
            refresh_token: user.googleRefreshToken,
            expiry_date: Number(user.googleTokenExpiry)
        });

        // Event listener for token refresh
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                const updateData = {
                    googleAccessToken: tokens.access_token,
                    googleTokenExpiry: tokens.expiry_date
                };
                if (tokens.refresh_token) {
                    updateData.googleRefreshToken = tokens.refresh_token;
                }
                await prisma.user.update({
                    where: { id: userId },
                    data: updateData
                });
                console.log('Google Tokens refreshed for user', userId);
            }
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        res.json({
            success: true,
            connected: true,
            events: response.data.items.map(event => ({
                id: event.id,
                summary: event.summary,
                start: event.start,
                end: event.end,
                htmlLink: event.htmlLink
            }))
        });

    } catch (error) {
        console.error('Calendar Fetch Error:', error);

        // Handle "Invalid Credentials" specifically
        if (error.message && (error.message.includes('invalid_grant') || error.code === 401)) {
            return res.status(401).json({
                error: 'Invalid Google Credentials',
                connected: false
            });
        }
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

module.exports = router;
