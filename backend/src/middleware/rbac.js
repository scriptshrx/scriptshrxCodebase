const AppError = require('../utils/AppError');

/**
 * Middleware to enforce Role-Based Access Control
 * @param {string[]} allowedRoles - Array of allowed roles e.g. ['SUPER_ADMIN', 'ADMIN']
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }

        const userRole = req.user.role || 'MEMBER'; // Default to MEMBER if missing

        if (!allowedRoles.includes(userRole)) {
            return next(new AppError('Access Denied: Insufficient Privileges', 403));
        }

        next();
    };
};

module.exports = requireRole;
