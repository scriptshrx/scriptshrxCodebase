/**
 * Tenant Calendar Service - Multi-tenant Google Calendar Integration
 * Each organization (tenant) has isolated calendar credentials
 * Enables AI to book appointments on tenant's specific Google Calendar
 */

const { google } = require('googleapis');
const prisma = require('../lib/prisma');

class TenantCalendarService {
  /**
   * Get OAuth2 client configured for a specific tenant
   * @param {string} tenantId - The tenant ID
   * @returns {google.auth.OAuth2} Configured OAuth2 client
   */
  static async getOAuth2Client(tenantId) {
    const tenantTokens = await prisma.tenantGoogleToken.findUnique({
      where: { tenantId }
    });

    if (!tenantTokens) {
      throw new Error(`No calendar credentials found for tenant ${tenantId}`);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tenantTokens.accessToken,
      refresh_token: tenantTokens.refreshToken,
      expiry_date: tenantTokens.expiresAt ? new Date(tenantTokens.expiresAt).getTime() : null
    });

    // Handle token refresh automatically
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await prisma.tenantGoogleToken.update({
          where: { tenantId },
          data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || tenantTokens.refreshToken,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            updatedAt: new Date()
          }
        });
        console.log(`[TenantCalendar] Tokens refreshed for tenant ${tenantId}`);
      }
    });

    return oauth2Client;
  }

  /**
   * Store tenant's Google Calendar OAuth tokens
   * @param {string} tenantId - The tenant ID
   * @param {object} tokens - Tokens from Google OAuth callback
   * @param {string} calendarEmail - The tenant's calendar email
   */
  static async storeTenantTokens(tenantId, tokens, calendarEmail) {
    return prisma.tenantGoogleToken.upsert({
      where: { tenantId },
      create: {
        tenantId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        updatedAt: new Date()
      }
    });

    // Update tenant with calendar email
    if (calendarEmail) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { googleCalendarEmail: calendarEmail }
      });
    }
  }

  /**
   * Get busy time slots from tenant's Google Calendar
   * Used to check availability before booking
   * @param {string} tenantId - The tenant ID
   * @param {Date} date - The date to check
   * @returns {Array<number>} Array of busy hours (0-23)
   */
  static async getTenantCalendarBusySlots(tenantId, date) {
    try {
      const oauth2Client = await this.getOAuth2Client(tenantId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          items: [{ id: 'primary' }]
        }
      });

      const busySlots = response.data.calendars.primary.busy || [];
      const busyHours = new Set();

      busySlots.forEach(slot => {
        const startHour = new Date(slot.start).getHours();
        const endHour = new Date(slot.end).getHours();
        for (let h = startHour; h < endHour; h++) {
          busyHours.add(h);
        }
      });

      console.log(`[TenantCalendar] Busy hours for tenant ${tenantId} on ${date.toDateString()}:`, Array.from(busyHours));
      return Array.from(busyHours);
    } catch (err) {
      console.error(`[TenantCalendar] Error fetching busy slots for tenant ${tenantId}:`, err.message);
      return [];
    }
  }

  /**
   * Create a Google Calendar event for a booking
   * Automatically creates Google Meet link for the event
   * @param {string} tenantId - The tenant ID
   * @param {object} booking - Booking object with date, purpose
   * @param {string} clientName - Name of the client
   * @param {string} clientPhone - Phone of the client (optional)
   * @returns {object} { eventId, meetLink }
   */
  static async createTenantCalendarEvent(tenantId, booking, clientName, clientPhone = null) {
    try {
      const oauth2Client = await this.getOAuth2Client(tenantId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const startTime = new Date(booking.date);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const event = {
        summary: `${booking.purpose || 'Appointment'} - ${clientName}`,
        description: `Booked via AI Voice Agent\nClient: ${clientName}${clientPhone ? `\nPhone: ${clientPhone}` : ''}\nBooking ID: ${booking.id}`,
        start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
        conferenceData: {
          createRequest: {
            requestId: booking.id,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      });

      console.log(`[TenantCalendar] Event created for tenant ${tenantId}:`, createdEvent.data.id);

      return {
        eventId: createdEvent.data.id,
        meetLink: createdEvent.data.hangoutLink || null
      };
    } catch (err) {
      console.error(`[TenantCalendar] Error creating event for tenant ${tenantId}:`, err.message);
      throw err;
    }
  }

  /**
   * Delete a calendar event (useful when booking is cancelled)
   * @param {string} tenantId - The tenant ID
   * @param {string} eventId - The Google Calendar event ID
   */
  static async deleteTenantCalendarEvent(tenantId, eventId) {
    try {
      const oauth2Client = await this.getOAuth2Client(tenantId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      console.log(`[TenantCalendar] Event deleted for tenant ${tenantId}:`, eventId);
      return { success: true };
    } catch (err) {
      console.error(`[TenantCalendar] Error deleting event for tenant ${tenantId}:`, err.message);
      throw err;
    }
  }

  /**
   * Check if tenant has calendar configured
   * @param {string} tenantId - The tenant ID
   * @returns {boolean}
   */
  static async hasTenantCalendar(tenantId) {
    const tokens = await prisma.tenantGoogleToken.findUnique({
      where: { tenantId }
    });
    return !!tokens;
  }

  /**
   * Disconnect tenant's Google Calendar
   * @param {string} tenantId - The tenant ID
   */
  static async disconnectTenantCalendar(tenantId) {
    await prisma.tenantGoogleToken.delete({
      where: { tenantId }
    }).catch(() => null); // Don't error if already disconnected

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { googleCalendarEmail: null }
    });

    console.log(`[TenantCalendar] Calendar disconnected for tenant ${tenantId}`);
  }

  /**
   * Get tenant's calendar email
   * @param {string} tenantId - The tenant ID
   * @returns {string|null}
   */
  static async getTenantCalendarEmail(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleCalendarEmail: true }
    });
    return tenant?.googleCalendarEmail || null;
  }
}

module.exports = TenantCalendarService;
