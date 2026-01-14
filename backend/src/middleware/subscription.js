// backend/src/middleware/subscription.js
/**
 * Subscription & Entitlements Middleware (Refactored)
 * 
 * Enforces:
 * 1. Feature Gating (Basic vs Advanced Analytics, White-labeling)
 * 2. Usage Limits (Booking caps for Startup tier)
 * 3. Trial Access
 */

const prisma = require('../lib/prisma');

const PLAN_DEF = {
    'Startup': {
        limits: { bookings: 50 },
        features: ['basic_analytics', 'voice_agent']
    },
    'Growth': {
        limits: { bookings: Infinity },
        features: ['basic_analytics', 'advanced_analytics', 'unlimited_clients', 'voice_agent']
    },
    'Enterprise': {
        limits: { bookings: Infinity },
        features: ['basic_analytics', 'advanced_analytics', 'unlimited_clients', 'white_label', 'soc2_logging', 'voice_agent']
    },
    'Trial': {
        limits: { bookings: 50 },
        features: ['basic_analytics', 'advanced_analytics', 'unlimited_clients', 'white_label', 'voice_agent']
    }
};

/**
 * Middleware: Check if tenant is entitled to a specific feature
 * Usage: checkEntitlement('white_label')
 */
const checkEntitlement = (feature) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.user?.tenantId || req.scopedTenantId;
            if (!tenantId) return res.status(401).json({ error: 'Tenant context required' });

            // 1. Fetch Tenant Subscription
            let tenant;
            try {
                tenant = await prisma.tenant.findUnique({
                    where: { id: tenantId },
                    include: { subscriptionPlan: true }
                });
            } catch (dbError) {
                console.error('[Entitlement] Database query failed:', dbError.message);
                // If it's a prepared statement error, try once more
                if (dbError.message?.includes('prepared statement')) {
                    console.log('[Entitlement] Retrying tenant lookup after prepared statement error...');
                    tenant = await prisma.tenant.findUnique({
                        where: { id: tenantId },
                        include: { subscriptionPlan: true }
                    });
                } else {
                    throw dbError;
                }
            }

            if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

            // 2. Determine Logic Source (DB Plan vs Legacy String)
            let allowedFeatures = [];

            if (tenant.subscriptionPlan) {
                allowedFeatures = tenant.subscriptionPlan.features || [];
            } else {
                const planName = tenant.plan || 'Startup';
                const def = PLAN_DEF[planName] || PLAN_DEF['Startup'];
                allowedFeatures = def.features;
            }

            // 3. Super Admin Bypass
            if (req.user.role === 'SUPER_ADMIN') allowedFeatures = ['all_access', ...allowedFeatures];

            // 4. Check Entitlement
            if (allowedFeatures.includes(feature) || allowedFeatures.includes('all_access')) {
                return next();
            }

            return res.status(403).json({
                success: false,
                error: `Upgrade required for feature: ${feature}`,
                code: 'UPGRADE_REQUIRED'
            });

        } catch (error) {
            console.error('[Entitlement] Error:', error);
            return res.status(500).json({ error: 'Entitlement check failed' });
        }
    };
};

/**
 * Middleware: Check specific usage limits (e.g., Monthly Bookings)
 */
const checkUsageLimit = (limitType) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.user?.tenantId || req.scopedTenantId;
            if (!tenantId) return res.status(401).json({ error: 'Tenant context required' });

            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                include: { subscriptionPlan: true }
            });

            // Resolve Limit
            let maxLimit = 50; // Default restrict
            const planName = tenant?.plan || 'Startup';

            if (tenant?.subscriptionPlan) {
                if (limitType === 'bookings') maxLimit = tenant.subscriptionPlan.maxBookingsPerMonth ?? Infinity;
            } else {
                const def = PLAN_DEF[planName] || PLAN_DEF['Startup'];
                if (limitType === 'bookings') maxLimit = def.limits.bookings;
            }

            if (maxLimit === Infinity) return next();

            // Count usage for current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            let usageCount = 0;
            if (limitType === 'bookings') {
                usageCount = await prisma.booking.count({
                    where: {
                        tenantId,
                        createdAt: { gte: startOfMonth }
                    }
                });
            }

            if (usageCount >= maxLimit) {
                return res.status(403).json({
                    success: false,
                    error: `Monthly booking limit reached (${maxLimit}). Upgrade to Growth for unlimited bookings.`,
                    code: 'LIMIT_EXCEEDED'
                });
            }

            next();

        } catch (error) {
            console.error('[UsageLimit] Error:', error);
            return res.status(500).json({ error: 'Usage check failed' });
        }
    };
};

const checkSubscriptionAccess = (req, res, next) => next();

/**
 * Get subscription status (for client-side display)
 * Updated to support new SubscriptionPlan model
 */
const getSubscriptionStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.json({ success: false, hasSubscription: false });

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { subscriptionPlan: true }
        });

        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const planName = tenant.subscriptionPlan?.name || tenant.plan || 'Startup';

        // Resolve limits and features
        let features = [];
        let limits = {};

        if (tenant.subscriptionPlan) {
            features = tenant.subscriptionPlan.features;
            limits = { bookings: tenant.subscriptionPlan.maxBookingsPerMonth };
        } else {
            const def = PLAN_DEF[planName] || PLAN_DEF['Startup'];
            features = def.features;
            limits = def.limits;
        }

        const status = {
            plan: planName,
            status: 'Active',
            features: features,
            limits: limits
        };

        res.json({
            success: true,
            hasSubscription: true,
            subscription: status
        });

    } catch (error) {
        console.error('[SubscriptionStatus] Error:', error);
        res.status(500).json({ success: false, error: 'Status fetch failed' });
    }
};

module.exports = {
    checkEntitlement,
    checkUsageLimit,
    checkSubscriptionAccess,
    getSubscriptionStatus,
    // Alias for backward compatibility
    checkFeature: checkEntitlement
};
