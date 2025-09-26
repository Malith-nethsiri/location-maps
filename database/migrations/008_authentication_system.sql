-- Migration 008: User Authentication & Professional Profile System
-- Phase 12.1: Foundation for integrated valuation platform
-- Date: 2025-09-26

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User accounts table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Professional profiles table (auto-populates report headers)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Personal Information (Report Header Section)
    honorable VARCHAR(20) CHECK (honorable IN ('Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.')),
    full_name VARCHAR(255) NOT NULL,
    professional_title VARCHAR(255),
    qualifications TEXT[], -- Array of qualifications
    professional_status VARCHAR(255),

    -- Address Information (Report Header Section)
    house_number VARCHAR(50),
    street_name VARCHAR(255),
    area_name VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),

    -- Contact Information (Report Header Section)
    telephone VARCHAR(50),
    mobile VARCHAR(50),
    email_address VARCHAR(255),
    website VARCHAR(255),

    -- Professional Credentials (Report Certification Section)
    ivsl_registration VARCHAR(100),
    professional_body VARCHAR(255) DEFAULT 'Institute of Valuers Sri Lanka',
    license_number VARCHAR(100),
    license_expiry DATE,

    -- Report Settings & Preferences
    report_reference_prefix VARCHAR(50) DEFAULT 'VAL',
    signature_image TEXT, -- Base64 encoded signature
    company_logo TEXT, -- Base64 encoded logo
    standard_disclaimers TEXT,
    default_methodology TEXT,

    -- Profile Status
    profile_completed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions table for authentication management
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Report reference tracking for auto-increment
CREATE TABLE IF NOT EXISTS report_references (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    sequence_number INTEGER NOT NULL,
    reference_string VARCHAR(100) NOT NULL,
    used_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, year, sequence_number)
);

-- User activity log for security and analytics
CREATE TABLE IF NOT EXISTS user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completed ON user_profiles(profile_completed);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_report_references_user_year ON report_references(user_id, year);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate next report reference
CREATE OR REPLACE FUNCTION generate_report_reference(p_user_id INTEGER, p_prefix VARCHAR(50) DEFAULT 'VAL')
RETURNS VARCHAR(100) AS $$
DECLARE
    current_year INTEGER;
    next_sequence INTEGER;
    reference_string VARCHAR(100);
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());

    -- Get next sequence number for this user and year
    INSERT INTO report_references (user_id, year, sequence_number, reference_string)
    SELECT
        p_user_id,
        current_year,
        COALESCE(MAX(sequence_number), 0) + 1,
        p_prefix || '/' || current_year || '/' || LPAD((COALESCE(MAX(sequence_number), 0) + 1)::TEXT, 3, '0')
    FROM report_references
    WHERE user_id = p_user_id AND year = current_year
    RETURNING reference_string INTO reference_string;

    RETURN reference_string;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default Sri Lankan administrative data
INSERT INTO sri_lankan_locations (name, type, parent_id) VALUES
    ('Western Province', 'province', NULL),
    ('Central Province', 'province', NULL),
    ('Southern Province', 'province', NULL),
    ('Northern Province', 'province', NULL),
    ('Eastern Province', 'province', NULL),
    ('North Western Province', 'province', NULL),
    ('North Central Province', 'province', NULL),
    ('Uva Province', 'province', NULL),
    ('Sabaragamuwa Province', 'province', NULL)
ON CONFLICT (name, type) DO NOTHING;

-- Security: Create restricted user for application
-- This should be run separately with appropriate permissions
-- CREATE USER valuation_app WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE your_database TO valuation_app;
-- GRANT USAGE ON SCHEMA public TO valuation_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO valuation_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO valuation_app;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User authentication accounts';
COMMENT ON TABLE user_profiles IS 'Professional profiles for report generation';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE report_references IS 'Auto-incrementing report reference tracking';
COMMENT ON TABLE user_activity_log IS 'User activity log for security and analytics';

COMMENT ON FUNCTION generate_report_reference IS 'Generate unique report reference number for user';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Clean up expired user sessions';