const { z } = require('zod');

// Enums (matching manual DB strings)
// Enums (matching manual DB strings)
const RoleEnum = ['OWNER', 'ADMIN', 'SUBSCRIBER', 'MEMBER']; // Added SUBSCRIBER
const StatusEnum = ['Scheduled', 'Confirmed', 'Cancelled', 'Completed', 'Pending'];
const PlanEnum = ['Basic', 'Intermediate', 'Advanced'];

// Auth Schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2),
    companyName: z.string().optional(),
    accountType: z.enum(['INDIVIDUAL', 'ORGANIZATION']).optional().default('ORGANIZATION'),
    location: z.string().optional(),
    timezone: z.string().optional(),
    inviteToken: z.string().optional()
}).refine(data => {
    if (data.accountType === 'ORGANIZATION' && !data.companyName) {
        return false;
    }
    return true;
}, {
    message: "Company name is required for Organization accounts",
    path: ["companyName"]
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
    role: z.enum(RoleEnum)
});

// Booking Schemas
const createBookingSchema = z.object({
    clientId: z.string().uuid(),
    date: z.string().datetime(), // ISO 8601
    purpose: z.string().optional(),
    status: z.enum(StatusEnum).optional().default('Scheduled'),
    meetingLink: z.string().optional(),
});

const updateBookingSchema = z.object({
    date: z.string().datetime().optional(),
    status: z.enum(StatusEnum).optional(),
    purpose: z.string().optional(),
    meetingLink: z.string().optional(),
});

// Client Schemas
const createClientSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    notes: z.string().optional(),
});

const updateClientSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
    source: z.string().optional(),
});

module.exports = {
    registerSchema,
    loginSchema,
    createUserSchema,
    createBookingSchema,
    updateBookingSchema,
    createClientSchema,
    updateClientSchema,
    RoleEnum,
    StatusEnum,
    PlanEnum
};
