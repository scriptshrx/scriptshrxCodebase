/**
 * Tenant Calendar Routes - Multi-tenant Google Calendar Integration
 * Handles OAuth connection/disconnection for organizations
 */

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const TenantCalendarService = require('../services/tenantCalendarService');

/**
 * GET /api/tenant-calendar/auth-url
 * Generate Google OAuth URL for tenant
 * Returns auth URL that user should visit to authorize
 */
router.get('/auth-url', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found in token' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: tenantId, // Pass tenantId in state for callback verification
      prompt: 'consent' // Force re-consent to get refresh token
    });

    console.log(`[TenantCalendar] Auth URL generated for tenant ${tenantId}`);

    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('[TenantCalendar] Error generating auth URL:', error.message);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * GET /api/tenant-calendar/callback
 * Handle Google OAuth callback
 * Exchanges authorization code for tokens and stores them per tenant
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const tenantId = state;

    if (!code || !tenantId) {
      return res.status(400).json({ error: 'Missing code or tenant ID' });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Get user email from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store tenant's tokens (isolated per tenant)
    await TenantCalendarService.storeTenantTokens(
      tenantId,
      tokens,
      userInfo.data.email
    );

    console.log(`[TenantCalendar] Tokens stored for tenant ${tenantId} (${userInfo.data.email})`);

    // Redirect to dashboard with success message
    const successUrl = new URL(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/settings/calendar`
    );
    successUrl.searchParams.append('status', 'connected');
    successUrl.searchParams.append('email', userInfo.data.email);

    res.redirect(successUrl.toString());
  } catch (error) {
    console.error('[TenantCalendar] OAuth callback error:', error);

    // Redirect with error
    const errorUrl = new URL(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/settings/calendar`
    );
    errorUrl.searchParams.append('status', 'error');
    errorUrl.searchParams.append('message', error.message);

    res.redirect(errorUrl.toString());
  }
});

/**
 * GET /api/tenant-calendar/status
 * Check if tenant has calendar connected
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    const hasCalendar = await TenantCalendarService.hasTenantCalendar(tenantId);
    const calendarEmail = await TenantCalendarService.getTenantCalendarEmail(tenantId);

    res.json({
      success: true,
      connected: hasCalendar,
      calendarEmail: calendarEmail
    });
  } catch (error) {
    console.error('[TenantCalendar] Error checking status:', error.message);
    res.status(500).json({ error: 'Failed to check calendar status' });
  }
});

/**
 * DELETE /api/tenant-calendar/disconnect
 * Disconnect tenant's Google Calendar
 */
router.delete('/disconnect', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    await TenantCalendarService.disconnectTenantCalendar(tenantId);

    res.json({ success: true, message: 'Calendar disconnected successfully' });
  } catch (error) {
    console.error('[TenantCalendar] Error disconnecting calendar:', error.message);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

module.exports = router;
