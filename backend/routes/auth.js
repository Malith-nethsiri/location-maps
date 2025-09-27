const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const authService = require('../services/authService');
const {
    authenticate,
    requireCompleteProfile,
    rateLimitByUser,
    securityHeaders,
    logRequest
} = require('../middleware/auth');
const { handleValidationErrors } = require('../services/validationService');
const { body } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Apply security headers and logging to all routes
router.use(securityHeaders);
router.use(logRequest);

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const emailRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 emails per hour
    message: {
        success: false,
        message: 'Too many email requests. Please try again in 1 hour.'
    }
});

// Validation rules for registration
const registerValidation = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .isLength({ max: 255 })
        .withMessage('Email must be less than 255 characters'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('fullName')
        .isLength({ min: 2, max: 255 })
        .withMessage('Full name must be between 2 and 255 characters')
        .trim(),
    body('professionalTitle')
        .isLength({ min: 2, max: 255 })
        .withMessage('Professional title must be between 2 and 255 characters')
        .trim()
];

// Validation rules for login
const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const loginSchema = {
    type: 'object',
    required: ['email', 'password'],
    properties: {
        email: {
            type: 'string',
            format: 'email'
        },
        password: {
            type: 'string',
            minLength: 1
        }
    },
    additionalProperties: false
};

const profileUpdateSchema = {
    type: 'object',
    required: ['fullName', 'professionalTitle'],
    properties: {
        honorable: {
            type: 'string',
            enum: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.']
        },
        fullName: {
            type: 'string',
            minLength: 2,
            maxLength: 255
        },
        professionalTitle: {
            type: 'string',
            minLength: 2,
            maxLength: 255
        },
        qualifications: {
            type: 'array',
            items: {
                type: 'string',
                maxLength: 255
            },
            maxItems: 20
        },
        professionalStatus: {
            type: 'string',
            maxLength: 255
        },
        houseNumber: {
            type: 'string',
            maxLength: 50
        },
        streetName: {
            type: 'string',
            maxLength: 255
        },
        areaName: {
            type: 'string',
            maxLength: 255
        },
        city: {
            type: 'string',
            maxLength: 100
        },
        district: {
            type: 'string',
            maxLength: 100
        },
        province: {
            type: 'string',
            maxLength: 100
        },
        postalCode: {
            type: 'string',
            maxLength: 20
        },
        telephone: {
            type: 'string',
            maxLength: 50
        },
        mobile: {
            type: 'string',
            maxLength: 50
        },
        emailAddress: {
            type: 'string',
            format: 'email',
            maxLength: 255
        },
        website: {
            type: 'string',
            format: 'uri',
            maxLength: 255
        },
        ivslRegistration: {
            type: 'string',
            maxLength: 100
        },
        professionalBody: {
            type: 'string',
            maxLength: 255
        },
        licenseNumber: {
            type: 'string',
            maxLength: 100
        },
        licenseExpiry: {
            type: 'string',
            format: 'date'
        },
        reportReferencePrefix: {
            type: 'string',
            maxLength: 50
        },
        signatureImage: {
            type: 'string'
        },
        companyLogo: {
            type: 'string'
        },
        standardDisclaimers: {
            type: 'string',
            maxLength: 5000
        },
        defaultMethodology: {
            type: 'string',
            maxLength: 5000
        }
    },
    additionalProperties: false
};

// POST /api/auth/register - User registration
router.post('/register', authRateLimit, registerValidation, handleValidationErrors, async (req, res, next) => {
    try {
        const { email, password, fullName, professionalTitle } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');

        const result = await authService.registerUser({
            email: email.toLowerCase().trim(),
            password,
            fullName: fullName.trim(),
            professionalTitle: professionalTitle.trim()
        });

        // Don't send the verification token in the response for security
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            data: {
                user: result.user
            }
        });

        // TODO: Send verification email
        logger.info(`Registration successful for ${email}. Verification token: ${result.verificationToken}`);

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/login - User login
router.post('/login', authRateLimit, loginValidation, handleValidationErrors, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');

        const result = await authService.loginUser(
            email.toLowerCase().trim(),
            password,
            ipAddress,
            userAgent
        );

        // Set HTTP-only cookie for additional security
        res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: result.user,
                token: result.token
            }
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionToken = req.headers['x-session-token'];

        // Invalidate specific session if session token provided
        if (sessionToken) {
            await authService.invalidateSession(sessionToken);
        }

        // Clear auth cookie
        res.clearCookie('auth_token');

        // Log activity
        await authService.logActivity(userId, 'user_logged_out', 'user', userId);

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user
            }
        });

    } catch (error) {
        next(error);
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticate, validateRequest(profileUpdateSchema), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profileData = req.body;

        const updatedProfile = await authService.updateUserProfile(userId, profileData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                profile: updatedProfile
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profile = await authService.getUserProfile(userId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            data: {
                profile
            }
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/verify-email - Verify email address
router.post('/verify-email', async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        const user = await authService.verifyEmail(token);

        res.json({
            success: true,
            message: 'Email verified successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', emailRateLimit, async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // TODO: Implement resend verification logic
        res.json({
            success: true,
            message: 'If the email exists, a verification link has been sent'
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', emailRateLimit, async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const result = await authService.requestPasswordReset(email.toLowerCase().trim());

        res.json({
            success: true,
            message: result.message
        });

        // TODO: Send password reset email
        if (result.resetToken) {
            logger.info(`Password reset requested for ${result.email}. Reset token: ${result.resetToken}`);
        }

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', authRateLimit, async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Reset token and new password are required'
            });
        }

        const user = await authService.resetPassword(token, newPassword);

        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.',
            data: {
                user: {
                    id: user.id,
                    email: user.email
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/change-password - Change password for authenticated user
router.post('/change-password', authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // TODO: Implement password change logic
        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/auth/report-reference - Generate next report reference
router.get('/report-reference', authenticate, requireCompleteProfile, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const customPrefix = req.query.prefix;

        const reference = await authService.generateReportReference(userId, customPrefix);

        res.json({
            success: true,
            data: {
                reference
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/auth/activity - Get user activity log
router.get('/activity', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;

        const query = `
            SELECT action, resource, resource_id, metadata, created_at
            FROM user_activity_log
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, limit, offset]);

        res.json({
            success: true,
            data: {
                activities: result.rows,
                pagination: {
                    limit,
                    offset,
                    hasMore: result.rows.length === limit
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    logger.error('Auth route error:', error);

    if (error.message === 'User already exists with this email') {
        return res.status(409).json({
            success: false,
            message: 'User already exists with this email address'
        });
    }

    if (error.message === 'Invalid email or password') {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    if (error.message.includes('Password must')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    if (error.message.includes('Account locked')) {
        return res.status(423).json({
            success: false,
            message: error.message
        });
    }

    res.status(500).json({
        success: false,
        message: 'An error occurred during authentication'
    });
});

module.exports = router;