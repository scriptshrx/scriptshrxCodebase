// Operational Kill Switches
const features = {
    VOICE_AGENTS: process.env.FEATURE_VOICE_AGENTS !== 'false', // Default ON
    PAYMENTS: process.env.FEATURE_PAYMENTS !== 'false',         // Default ON
    BOOKINGS: process.env.FEATURE_BOOKINGS !== 'false',         // Default ON
    AI_CHAT: process.env.FEATURE_AI_CHAT !== 'false',           // Default ON
    NOTIFICATIONS: true
};

const checkFeature = (featureName) => {
    return (req, res, next) => {
        if (features[featureName] === false) {
            return res.status(503).json({
                success: false,
                error: 'Service temporarily unavailable',
                code: 'SERVICE_DISABLED',
                message: `The ${featureName} feature is currently disabled.`
            });
        }
        next();
    };
};

module.exports = { features, checkFeature };
