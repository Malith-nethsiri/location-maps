const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../utils/logger');
const authService = require('../services/authService');

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = extractTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authentication token provided'
            });
        }

        // Verify JWT token
        const decoded = authService.verifyToken(token);

        // Get user details from database
        const user = await getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email address before accessing this resource'
            });
        }

        // Get user profile
        const profile = await authService.getUserProfile(user.id);

        // Attach user to request
        req.user = {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            emailVerified: user.email_verified,
            profile
        };

        next();

    } catch (error) {
        logger.error('Authentication failed:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Authentication token expired'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Optional authentication (for public/semi-public routes)
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractTokenFromRequest(req);

        if (token) {
            const decoded = authService.verifyToken(token);
            const user = await getUserById(decoded.userId);

            if (user && user.email_verified) {
                const profile = await authService.getUserProfile(user.id);
                req.user = {
                    id: user.id,
                    uuid: user.uuid,
                    email: user.email,
                    emailVerified: user.email_verified,
                    profile
                };
            }
        }

        next();

    } catch (error) {
        // Fail silently for optional auth
        logger.warn('Optional authentication failed:', error);
        next();
    }
};

// Require complete profile
const requireCompleteProfile = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!req.user.profile || !req.user.profile.profile_completed) {
        return res.status(403).json({
            success: false,
            message: 'Complete your professional profile to access this feature',
            requiresProfileCompletion: true
        });
    }

    next();
};

// Rate limiting middleware
const rateLimitByUser = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    const requests = new Map();

    return (req, res, next) => {
        const userId = req.user?.id || req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!requests.has(userId)) {
            requests.set(userId, []);
        }

        const userRequests = requests.get(userId);

        // Remove old requests outside the window
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
        requests.set(userId, validRequests);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        validRequests.push(now);
        next();
    };
};

// Permission-based authorization
const authorize = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // For now, all authenticated users have basic permissions
        // This can be extended with role-based permissions later
        const userPermissions = ['read_own_reports', 'create_reports', 'edit_own_reports'];

        const hasPermission = permissions.some(permission => userPermissions.includes(permission));

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to access this resource'
            });
        }

        next();
    };
};

// Session validation middleware
const validateSession = async (req, res, next) => {
    try {
        const sessionToken = req.headers['x-session-token'];

        if (!sessionToken) {
            return next(); // Session validation is optional
        }

        const query = `
            SELECT us.*, u.email
            FROM user_sessions us
            JOIN users u ON u.id = us.user_id
            WHERE us.session_token = $1 AND us.expires_at > NOW()
        `;

        const result = await pool.query(query, [sessionToken]);

        if (result.rows.length > 0) {
            const session = result.rows[0];
            req.session = session;

            // Update session activity (optional - adds database overhead)
            // await pool.query('UPDATE user_sessions SET last_activity = NOW() WHERE id = $1', [session.id]);
        }

        next();

    } catch (error) {
        logger.error('Session validation error:', error);
        next(); // Continue without session validation
    }
};

// Helper functions
function extractTokenFromRequest(req) {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const tokenFromCookie = req.cookies?.auth_token;
    const tokenFromQuery = req.query?.token;

    return tokenFromHeader || tokenFromCookie || tokenFromQuery;
}

async function getUserById(userId) {
    const query = `
        SELECT id, uuid, email, email_verified, last_login
        FROM users
        WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
}

// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
};

// Request logging middleware
const logRequest = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const userId = req.user?.id || 'anonymous';
        const method = req.method;
        const url = req.originalUrl;
        const status = res.statusCode;
        const userAgent = req.get('User-Agent');
        const ip = req.ip || req.connection.remoteAddress;

        logger.info(`${method} ${url} - ${status} - ${duration}ms - User: ${userId} - IP: ${ip}`, {
            method,
            url,
            status,
            duration,
            userId,
            ip,
            userAgent: userAgent?.substring(0, 100) // Truncate long user agents
        });
    });

    next();
};

module.exports = {
    authenticate,
    optionalAuth,
    requireCompleteProfile,
    rateLimitByUser,
    authorize,
    validateSession,
    securityHeaders,
    logRequest
};