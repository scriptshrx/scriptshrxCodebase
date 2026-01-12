const prisma = require('../lib/prisma');
const notificationService = require('./notificationService');
const workflowService = require('./workflowService');
const eventBus = require('../lib/eventBus');

class BookingService {
    async getBookings(tenantId) {
        return prisma.booking.findMany({
            where: { tenantId },
            orderBy: { date: 'asc' },
            include: { client: true }
        });
    }

    async createBooking(tenantId, data) {
        const { clientId, date, purpose, status } = data;
        const requestedDate = new Date(date);

        const conflict = await prisma.booking.findFirst({
            where: {
                tenantId,
                date: requestedDate,
                status: { not: 'Cancelled' }
            }
        });

        if (conflict) {
            throw new Error('CONFLICT: This time slot is already booked.');
        }

        const booking = await prisma.booking.create({
            data: {
                clientId,
                tenantId,
                date: requestedDate,
                purpose,
                status: status || 'Scheduled'
            },
            include: { client: true, tenant: true }
        });



        if (booking.client) {
            // Emit Event instead of direct calls
            eventBus.emit('booking:created', {
                tenantId,
                client: booking.client,
                tenant: booking.tenant,
                booking,
                date: booking.date,
                status: booking.status
            });
        }

        try {
            const tenantUsers = await prisma.user.findMany({
                where: { tenantId }
            });

            for (const user of tenantUsers) {
                await notificationService.createNotification(
                    user.id,
                    'New Booking',
                    `New appointment with ${booking.client.name} on ${booking.date.toLocaleDateString()}`,
                    'booking'
                );
            }
        } catch (err) {
            console.error('Failed to notify tenant users:', err);
        }

        // Logic handled by subscriber now
        // await workflowService.trigger('booking:created', ...);

        return booking;
    }

    async updateBooking(tenantId, id, data) {
        const existingBooking = await prisma.booking.findFirst({
            where: { id, tenantId },
            include: { client: true, tenant: true }
        });
        if (!existingBooking) throw new Error('NOT_FOUND: Booking not found');

        const { date, purpose, status } = data;

        if (date && new Date(date).getTime() !== new Date(existingBooking.date).getTime()) {
            const requestedDate = new Date(date);
            const conflict = await prisma.booking.findFirst({
                where: {
                    tenantId,
                    date: requestedDate,
                    status: { not: 'Cancelled' },
                    id: { not: id }
                }
            });

            if (conflict) {
                throw new Error('CONFLICT: This time slot is already booked.');
            }
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                purpose,
                status
            },
            include: { client: true, tenant: true }
        });

        if (status && status !== existingBooking.status && updatedBooking.client) {
            await notificationService.sendEmail(
                updatedBooking.client.email,
                `Booking Update - ${updatedBooking.tenant.name}`,
                `<p>Hi ${updatedBooking.client.name},</p><p>Your appointment status has changed to: <strong>${updatedBooking.status}</strong>.</p>`
            );

            if (updatedBooking.client.phone) {
                await notificationService.sendSMS(
                    updatedBooking.client.phone,
                    `[${updatedBooking.tenant.name}] Booking status updated: ${updatedBooking.status}.`,
                    tenantId
                );
            }
        }

        return updatedBooking;
    }

    async deleteBooking(tenantId, id) {
        const booking = await prisma.booking.findFirst({ where: { id, tenantId } });
        if (!booking) throw new Error('NOT_FOUND: Booking not found');

        return prisma.booking.delete({ where: { id } });
    }
}

module.exports = new BookingService();
