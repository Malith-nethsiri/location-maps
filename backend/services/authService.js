const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.jwtExpiry = process.env.JWT_EXPIRY || '7d';
        this.saltRounds = 12;
        this.maxLoginAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
    }

    // User Registration
    async registerUser(userData) {
        const { email, password, fullName, professionalTitle } = userData;

        try {
            // Check if user already exists
            const existingUser = await this.findUserByEmail(email);
            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Validate password strength
            this.validatePassword(password);

            // Hash password
            const passwordHash = await bcrypt.hash(password, this.saltRounds);

            // Generate email verification token
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');

            // Insert user
            const dbQuery = `
                INSERT INTO users (email, password_hash, email_verification_token)
                VALUES ($1, $2, $3)
                RETURNING id, uuid, email, created_at
            `;

            const result = await query(dbQuery, [email, passwordHash, emailVerificationToken]);
            const user = result.rows[0];

            // Create basic profile
            await this.createBasicProfile(user.id, { fullName, professionalTitle });

            // Log registration
            await this.logActivity(user.id, 'user_registered', 'user', user.id);

            logger.info(`New user registered: ${email}`);

            return {
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    email: user.email,
                    emailVerified: false
                },
                verificationToken: emailVerificationToken
            };

        } catch (error) {
            logger.error('User registration failed:', error);
            throw error;
        }
    }

    // User Login
    async loginUser(email, password, ipAddress, userAgent) {
        try {
            const user = await this.findUserByEmail(email);

            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Check if account is locked
            if (user.account_locked_until && new Date() < user.account_locked_until) {
                const lockTimeRemaining = Math.ceil((user.account_locked_until - new Date()) / 60000);
                throw new Error(`Account locked. Try again in ${lockTimeRemaining} minutes`);
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                await this.handleFailedLogin(user.id);
                throw new Error('Invalid email or password');
            }

            // Reset login attempts on successful login
            await this.resetLoginAttempts(user.id);

            // Update last login
            await this.updateLastLogin(user.id);

            // Get user profile
            const profile = await this.getUserProfile(user.id);

            // Generate JWT token
            const token = this.generateJWT({
                userId: user.id,
                uuid: user.uuid,
                email: user.email
            });

            // Create session
            const sessionToken = await this.createSession(user.id, ipAddress, userAgent);

            // Log login
            await this.logActivity(user.id, 'user_logged_in', 'user', user.id, { ipAddress, userAgent });

            logger.info(`User logged in: ${email}`);

            return {
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    email: user.email,
                    emailVerified: user.email_verified,
                    profile
                },
                token,
                sessionToken
            };

        } catch (error) {
            logger.error('User login failed:', error);
            throw error;
        }
    }

    // Create Basic Profile
    async createBasicProfile(userId, profileData) {
        const { fullName, professionalTitle } = profileData;

        const dbQuery = `
            INSERT INTO user_profiles (
                user_id,
                full_name,
                professional_title,
                email_address,
                profile_completed
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;

        const result = await query(dbQuery, [
            userId,
            fullName,
            professionalTitle,
            null, // Will be updated when profile is completed
            false
        ]);

        return result.rows[0];
    }

    // Get User Profile
    async getUserProfile(userId) {
        const dbQuery = `
            SELECT
                up.*,
                u.email,
                u.email_verified
            FROM user_profiles up
            JOIN users u ON u.id = up.user_id
            WHERE up.user_id = $1
        `;

        const result = await query(dbQuery, [userId]);
        return result.rows[0] || null;
    }

    // Update User Profile
    async updateUserProfile(userId, profileData) {
        try {
            const {
                honorable,
                fullName,
                professionalTitle,
                qualifications,
                professionalStatus,
                houseNumber,
                streetName,
                areaName,
                city,
                district,
                province,
                postalCode,
                telephone,
                mobile,
                emailAddress,
                website,
                ivslRegistration,
                professionalBody,
                licenseNumber,
                licenseExpiry,
                reportReferencePrefix,
                signatureImage,
                companyLogo,
                standardDisclaimers,
                defaultMethodology
            } = profileData;

            // Check if profile exists
            const existingProfile = await this.getUserProfile(userId);

            if (!existingProfile) {
                throw new Error('User profile not found');
            }

            const dbQuery = `
                UPDATE user_profiles SET
                    honorable = $2,
                    full_name = $3,
                    professional_title = $4,
                    qualifications = $5,
                    professional_status = $6,
                    house_number = $7,
                    street_name = $8,
                    area_name = $9,
                    city = $10,
                    district = $11,
                    province = $12,
                    postal_code = $13,
                    telephone = $14,
                    mobile = $15,
                    email_address = $16,
                    website = $17,
                    ivsl_registration = $18,
                    professional_body = $19,
                    license_number = $20,
                    license_expiry = $21,
                    report_reference_prefix = $22,
                    signature_image = $23,
                    company_logo = $24,
                    standard_disclaimers = $25,
                    default_methodology = $26,
                    profile_completed = $27,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING *
            `;

            // Determine if profile is complete
            const isComplete = this.isProfileComplete(profileData);

            const result = await query(dbQuery, [
                userId,
                honorable,
                fullName,
                professionalTitle,
                qualifications,
                professionalStatus,
                houseNumber,
                streetName,
                areaName,
                city,
                district,
                province,
                postalCode,
                telephone,
                mobile,
                emailAddress,
                website,
                ivslRegistration,
                professionalBody,
                licenseNumber,
                licenseExpiry,
                reportReferencePrefix || 'VAL',
                signatureImage,
                companyLogo,
                standardDisclaimers,
                defaultMethodology,
                isComplete
            ]);

            // Log profile update
            await this.logActivity(userId, 'profile_updated', 'user_profile', existingProfile.id);

            logger.info(`User profile updated: userId=${userId}`);

            return result.rows[0];

        } catch (error) {
            logger.error('Profile update failed:', error);
            throw error;
        }
    }

    // Generate Next Report Reference
    async generateReportReference(userId, customPrefix = null) {
        try {
            // Get user's default prefix if not provided
            let prefix = customPrefix;
            if (!prefix) {
                const profile = await this.getUserProfile(userId);
                prefix = profile?.report_reference_prefix || 'VAL';
            }

            const dbQuery = `SELECT generate_report_reference($1, $2) as reference`;
            const result = await query(dbQuery, [userId, prefix]);

            return result.rows[0].reference;

        } catch (error) {
            logger.error('Report reference generation failed:', error);
            throw error;
        }
    }

    // Verify JWT Token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Email Verification
    async verifyEmail(token) {
        try {
            const dbQuery = `
                UPDATE users
                SET email_verified = true, email_verification_token = NULL
                WHERE email_verification_token = $1
                RETURNING id, email
            `;

            const result = await query(dbQuery, [token]);

            if (result.rows.length === 0) {
                throw new Error('Invalid verification token');
            }

            const user = result.rows[0];
            await this.logActivity(user.id, 'email_verified', 'user', user.id);

            logger.info(`Email verified for user: ${user.email}`);

            return user;

        } catch (error) {
            logger.error('Email verification failed:', error);
            throw error;
        }
    }

    // Password Reset Request
    async requestPasswordReset(email) {
        try {
            const user = await this.findUserByEmail(email);
            if (!user) {
                // Don't reveal if email exists
                return { message: 'If email exists, reset link has been sent' };
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpires = new Date(Date.now() + 3600000); // 1 hour

            const dbQuery = `
                UPDATE users
                SET password_reset_token = $1, password_reset_expires = $2
                WHERE id = $3
            `;

            await query(dbQuery, [resetToken, resetExpires, user.id]);

            // Log password reset request
            await this.logActivity(user.id, 'password_reset_requested', 'user', user.id);

            return { resetToken, email: user.email };

        } catch (error) {
            logger.error('Password reset request failed:', error);
            throw error;
        }
    }

    // Password Reset
    async resetPassword(token, newPassword) {
        try {
            this.validatePassword(newPassword);

            const dbQuery = `
                SELECT id, email FROM users
                WHERE password_reset_token = $1
                AND password_reset_expires > NOW()
            `;

            const result = await query(dbQuery, [token]);

            if (result.rows.length === 0) {
                throw new Error('Invalid or expired reset token');
            }

            const user = result.rows[0];
            const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

            const updateQuery = `
                UPDATE users
                SET password_hash = $1,
                    password_reset_token = NULL,
                    password_reset_expires = NULL,
                    login_attempts = 0,
                    account_locked_until = NULL
                WHERE id = $2
            `;

            await query(updateQuery, [passwordHash, user.id]);

            // Invalidate all sessions
            await this.invalidateAllUserSessions(user.id);

            // Log password reset
            await this.logActivity(user.id, 'password_reset_completed', 'user', user.id);

            logger.info(`Password reset completed for user: ${user.email}`);

            return user;

        } catch (error) {
            logger.error('Password reset failed:', error);
            throw error;
        }
    }

    // Helper Methods
    async findUserByEmail(email) {
        const dbQuery = `
            SELECT * FROM users WHERE email = $1
        `;
        const result = await query(dbQuery, [email.toLowerCase()]);
        return result.rows[0] || null;
    }

    validatePassword(password) {
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        }
    }

    generateJWT(payload) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
    }

    async createSession(userId, ipAddress, userAgent) {
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const dbQuery = `
            INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING session_token
        `;

        const result = await query(dbQuery, [userId, sessionToken, ipAddress, userAgent, expiresAt]);
        return result.rows[0].session_token;
    }

    async handleFailedLogin(userId) {
        const dbQuery = `
            UPDATE users
            SET login_attempts = login_attempts + 1,
                account_locked_until = CASE
                    WHEN login_attempts + 1 >= $2 THEN NOW() + INTERVAL '${this.lockoutTime} milliseconds'
                    ELSE account_locked_until
                END
            WHERE id = $1
        `;

        await query(dbQuery, [userId, this.maxLoginAttempts]);
    }

    async resetLoginAttempts(userId) {
        const dbQuery = `
            UPDATE users
            SET login_attempts = 0, account_locked_until = NULL
            WHERE id = $1
        `;

        await query(dbQuery, [userId]);
    }

    async updateLastLogin(userId) {
        const dbQuery = `UPDATE users SET last_login = NOW() WHERE id = $1`;
        await query(dbQuery, [userId]);
    }

    async logActivity(userId, action, resource, resourceId, metadata = {}) {
        const dbQuery = `
            INSERT INTO user_activity_log (user_id, action, resource, resource_id, metadata)
            VALUES ($1, $2, $3, $4, $5)
        `;

        await query(dbQuery, [userId, action, resource, resourceId, JSON.stringify(metadata)]);
    }

    async invalidateAllUserSessions(userId) {
        const dbQuery = `DELETE FROM user_sessions WHERE user_id = $1`;
        await query(dbQuery, [userId]);
    }

    isProfileComplete(profileData) {
        const requiredFields = [
            'fullName',
            'professionalTitle',
            'houseNumber',
            'streetName',
            'city',
            'district',
            'telephone',
            'mobile',
            'emailAddress'
        ];

        return requiredFields.every(field =>
            profileData[field] && profileData[field].toString().trim().length > 0
        );
    }
}

module.exports = new AuthService();