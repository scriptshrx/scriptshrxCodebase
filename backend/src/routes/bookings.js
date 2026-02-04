// backend/src/routes/bookings.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, verifyTenantAccess } = require('../middleware/permissions');

const { checkSubscriptionAccess } = require('../middleware/subscription');
const { createBookingSchema, updateBookingSchema } = require('../schemas/validation');

const idempotency = require('../middleware/idempotency');
const { checkFeature } = require('../config/features');
const AppError = require('../utils/AppError');
const notificationService = require('../services/notificationService');
const { google } = require('googleapis');

// GLOBAL: Check feature enabled
router.use(checkFeature('BOOKINGS'));

/**
 * GET /api/bookings - List all bookings for the tenant
 */
router.get('/',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('bookings', 'read'),
    async (req, res) => {
        try {
            const tenantId = req.scopedTenantId;
            const { status, clientId, from, to } = req.query;

            console.log(`\x1b[1m[Bookings API] GET /api/bookings\x1b[0m`);
            console.log(`  📊 TenantId: ${tenantId}`);
            console.log(`  👤 UserId: ${req.user?.userId}`);
            console.log(`  🔍 Filters: status=${status}, clientId=${clientId}, from=${from}, to=${to}`);

            const whereClause = { tenantId };

            if (status) whereClause.status = status;
            if (clientId) whereClause.clientId = clientId;

            if (from || to) {
                whereClause.date = {};
                if (from) whereClause.date.gte = new Date(from);
                if (to) whereClause.date.lte = new Date(to);
            }

            const bookings = await prisma.booking.findMany({
                where: whereClause,
                include: {
                    client: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            callSessions: {
                                select: {
                                    id: true,
                                    callSid: true,
                                    transcript: true,
                                    summary: true,
                                    duration: true,
                                    direction: true,
                                    startedAt: true,
                                    endedAt: true,
                                    status: true
                                },
                                orderBy: { startedAt: 'desc' }
                            }
                        }
                    }
                },
                orderBy: { date: 'asc' }
            });

            console.log(`  ✅ Found ${bookings.length} booking(s)`);
            if (bookings.length === 0) {
                console.log(`\x1b[1m\x1b[33m[Bookings API] ⚠️ NO BOOKINGS FOUND\x1b[0m`);
                console.log(`  Query clause:`, JSON.stringify(whereClause, null, 2));
                
                // Debug: Check if any bookings exist for ANY tenant
                const allBookings = await prisma.booking.findMany({ take: 5 });
                console.log(`  📊 Total bookings in DB: ${allBookings.length}`);
                if (allBookings.length > 0) {
                    console.log(`  Recent bookings:`, allBookings.map(b => ({ id: b.id, tenantId: b.tenantId, clientId: b.clientId })));
                }
            } else {
                console.log(`  \x1b[1m\x1b[32m✅ RETURNING ${bookings.length} BOOKING(S) TO FRONTEND\x1b[0m`);
            }
            res.json({ success: true, bookings });
        } catch (error) {
            console.error('Error fetching bookings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch bookings'
            });
        }
    }
);

/**
 * POST /api/bookings - Create a new booking
 */
router.post('/',
    idempotency, // Enable idempotency
    authenticateToken,
    verifyTenantAccess,
    checkSubscriptionAccess,
    checkPermission('bookings', 'create'),
    async (req, res, next) => {
        try {
            console.log(`\x1b[1m[Bookings API] POST /api/bookings\x1b[0m`);
            console.log(`  📝 Creating new booking`);
            console.log(`  UserId: ${req.user?.userId}`);
            
            const tenantId = req.scopedTenantId || req.body.tenantId || req.user?.tenantId;
            
            console.log(`  TenantId: ${tenantId}`);
            console.log(`  Request body:`, JSON.stringify(req.body, null, 2));

            if (!tenantId) {
                console.error('[Bookings] Missing tenantId in request context', {
                    userId: req.user?.userId,
                    scopedTenantId: req.scopedTenantId,
                    userTenantId: req.user?.tenantId,
                    bodyTenantId: req.body.tenantId
                });
                return res.status(400).json({
                    success: false,
                    error: 'Tenant context is missing. Please select an organization or log in again.'
                });
            }

            const validatedData = createBookingSchema.parse(req.body);
            const { clientId, date, purpose, status, meetingLink: manualMeetingLink } = validatedData;

            const bookingDate = new Date(date);
            const endTime = new Date(bookingDate.getTime() + 60 * 60 * 1000);

            // TRANSACTION: Conflict Check + Create
            const booking = await prisma.$transaction(async (tx) => {
                // 1. Check Client Existence
                const client = await tx.client.findFirst({
                    where: { id: clientId, tenantId }
                });

                if (!client) {
                    throw new AppError('Client not found', 404);
                }

                // 2. Strict Conflict Check (with lock implication via serial execution in tx if isolation level supports it, 
                // but prisma $transaction ensures atomic operations at minimum)
                const conflictingBooking = await tx.booking.findFirst({
                    where: {
                        tenantId,
                        date: {
                            gte: new Date(bookingDate.getTime() - 60 * 60 * 1000 + 1),
                            lt: endTime
                        },
                        status: { not: 'Cancelled' }
                    }
                });

                if (conflictingBooking) {
                    throw new AppError('Slot is already booked', 409, 'BOOKING_CONFLICT');
                }

                // 3. Create Booking (meetingLink may be generated below)
                return await tx.booking.create({
                    data: {
                        client: { connect: { id: clientId } },
                        date: bookingDate,
                        purpose: purpose || '',
                        status: status || 'Scheduled',
                        meetingLink: manualMeetingLink || null,
                        tenant: { connect: { id: tenantId } }
                    },
                    include: {
                        client: { select: { id: true, name: true, phone: true, email: true } }
                    }
                });
            });

            // --- POST-CREATION: Google Meet & Email ---
            let meetingLink = booking.meetingLink;

            // 4. Attempt Google Meet Generation (if user is connected)
            if (!meetingLink) {
                try {
                    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

                    if (user?.googleAccessToken && user?.googleRefreshToken) {
                        const oauth2Client = new google.auth.OAuth2(
                            process.env.GOOGLE_CLIENT_ID,
                            process.env.GOOGLE_CLIENT_SECRET,
                            process.env.GOOGLE_REDIRECT_URI
                        );

                        oauth2Client.setCredentials({
                            access_token: user.googleAccessToken,
                            refresh_token: user.googleRefreshToken
                        });

                        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

                        const event = {
                            summary: `Booking: ${booking.client?.name || 'Client'}`,
                            description: purpose || 'Scheduled via ScriptishRx',
                            start: { dateTime: bookingDate.toISOString(), timeZone: 'UTC' },
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

                        meetingLink = createdEvent.data.hangoutLink;

                        // Update booking with the meeting link
                        if (meetingLink) {
                            await prisma.booking.update({
                                where: { id: booking.id },
                                data: { meetingLink }
                            });
                        }

                        console.log(`✅ Google Meet created: ${meetingLink}`);
                    }
                } catch (gcalError) {
                    console.error('Failed to create Google Meet link:', gcalError.message);
                    // Non-fatal: continue without Meet link
                }
            }

            // 5. Send Email Notification to Client
            if (booking.client?.email) {
                const emailSubject = `Booking Confirmed: ${new Date(booking.date).toLocaleString()}`;
                const emailBody = `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2>Your Appointment is Confirmed!</h2>
                        <p>Hi ${booking.client.name},</p>
                        <p>Your booking has been scheduled for:</p>
                        <p style="font-size: 18px; font-weight: bold; color: #333;">
                            ${new Date(booking.date).toLocaleString()}
                        </p>
                        ${purpose ? `<p><strong>Purpose:</strong> ${purpose}</p>` : ''}
                        ${meetingLink ? `
                            <p style="margin-top: 20px;">
                                <a href="${meetingLink}" style="display: inline-block; padding: 12px 24px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Join Meeting
                                </a>
                            </p>
                            <p style="font-size: 12px; color: #666;">Link: ${meetingLink}</p>
                        ` : ''}
                        <p style="margin-top: 30px; font-size: 12px; color: #999;">
                            This is an automated message from ScriptishRx.
                        </p>
                    </div>
                `;
                try {
                    await notificationService.sendEmail(booking.client.email, emailSubject, emailBody);
                    console.log(`📧 Booking confirmation sent to ${booking.client.email}`);
                } catch (emailError) {
                    console.error('Failed to send booking email:', emailError.message);
                }
            }

            res.status(201).json({
                success: true,
                booking: { ...booking, meetingLink },
                message: 'Booking created successfully'
            });
        } catch (error) {
            next(error); // Pass to global error handler
        }
    }
);

/**
 * PATCH /api/bookings/:id - Update a booking
 */
router.patch('/:id',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('bookings', 'update'),
    async (req, res) => {
        try {
            console.log(`\x1b[1m[Bookings API] PATCH /api/bookings/:id\x1b[0m`);
            console.log(`  ✏️ Updating booking`);
            console.log(`  UserId: ${req.user?.userId}`);
            console.log(`  Booking ID: ${req.params.id}`);
            console.log(`  Update data:`, JSON.stringify(req.body, null, 2));
            
            const tenantId = req.scopedTenantId;
            const { id } = req.params;

            // Validate input
            const validatedData = updateBookingSchema.parse(req.body);
            const { date, purpose, status } = validatedData; // Note: Date is already string/datetime validated

            // Verify booking belongs to tenant
            const existingBooking = await prisma.booking.findFirst({
                where: { id, tenantId }
            });

            if (!existingBooking) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            const updateData = {};
            if (date !== undefined) updateData.date = new Date(date);
            if (purpose !== undefined) updateData.purpose = purpose;
            if (status !== undefined) updateData.status = status;

            const booking = await prisma.booking.update({
                where: { id },
                data: updateData,
                include: {
                    client: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true
                        }
                    }
                }
            });

            res.json({
                success: true,
                booking,
                message: 'Booking updated successfully'
            });
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ success: false, error: error.errors });
            }
            console.error('Error updating booking:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update booking'
            });
        }
    }
);

/**
 * DELETE /api/bookings/:id - Delete a booking
 */
router.delete('/:id',
    authenticateToken,
    verifyTenantAccess,
    checkPermission('bookings', 'delete'),
    async (req, res) => {
        try {
            console.log(`\x1b[1m[Bookings API] DELETE /api/bookings/:id\x1b[0m`);
            console.log(`  🗑️ Deleting booking`);
            console.log(`  UserId: ${req.user?.userId}`);
            console.log(`  Booking ID: ${req.params.id}`);
            
            const tenantId = req.scopedTenantId;
            const { id } = req.params;

            // Verify booking belongs to tenant
            const booking = await prisma.booking.findFirst({
                where: { id, tenantId }
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            await prisma.booking.delete({
                where: { id }
            });

            res.json({
                success: true,
                message: 'Booking deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting booking:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete booking'
            });
        }
    }
);

module.exports = router;
