// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    // Support both "Authorization" and "authorization" headers
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    console.log(`\x1b[1m[Auth Middleware]\x1b[0m Request to ${req.method} ${req.path}`);
    console.log(`  Authorization header present: ${authHeader ? '✓ YES' : '✗ NO'}`);
    if (authHeader) {
      console.log(`  Authorization header value (first 50 chars): ${authHeader.substring(0, 50)}...`);
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`  \x1b[1m\x1b[31m❌ REJECTED: No valid Bearer token\x1b[0m`);
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log(`  Token extracted (first 20 chars): ${token.substring(0, 20)}...`);

    // Verify token synchronously
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    console.log(`  ✅ Token verified successfully`);
    console.log(`  Decoded user ID: ${decoded.id || decoded.sub}`);
    console.log(`  Decoded tenant ID: ${decoded.tenantId}`);
    console.log(`  Decoded role: ${decoded.role}`);

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
      console.log(`  \x1b[1m\x1b[31m❌ REJECTED: Token expired\x1b[0m`);
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      console.log(`  \x1b[1m\x1b[31m❌ REJECTED: Invalid token - ${error.message}\x1b[0m`);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'NotBeforeError') {
      console.log(`  \x1b[1m\x1b[31m❌ REJECTED: Token not active yet\x1b[0m`);
      return res.status(401).json({
        success: false,
        error: 'Token not active yet',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }

    // Catch-all for any other error (e.g. secret missing)
    console.log(`  \x1b[1m\x1b[31m❌ REJECTED: ${error.name} - ${error.message}\x1b[0m`);
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