const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-fallback-do-not-use-in-prod';

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET is missing. Using insecure fallback for development only.');
} else if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET is weak (<32 chars). Consider rotating it.');
}


const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        req.user = decoded; // { userId, role, tenantId }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authMiddleware;
