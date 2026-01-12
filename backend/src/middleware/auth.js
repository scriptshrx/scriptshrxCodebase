// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    // Support both "Authorization" and "authorization" headers
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token synchronously
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const context = require('../lib/context');

    // Attach user info to request
    req.user = decoded;

    // Propagate context (ALS)
    const store = {
      userId: decoded.id || decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role
    };

    context.run(store, () => {
      next();
    });
  } catch (error) {
    // Clear, specific error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        error: 'Token not active yet',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }

    // Catch-all for any other error (e.g. secret missing)
    console.error('JWT Verification Failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Export both — keeps old code working
module.exports = {
  authenticateToken,
  authenticate: authenticateToken
};