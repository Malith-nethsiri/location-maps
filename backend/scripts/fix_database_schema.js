#!/usr/bin/env node

/**
 * Emergency Database Schema Fix for Railway Deployment
 * Fixes missing columns and functions that cause deployment errors
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ No database connection string found');
  console.error('Set DATABASE_URL or POSTGRES_URL environment variable');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const schemaFixes = `
-- Emergency fix for Railway database schema issues
-- Note: PostGIS will be handled separately

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create authentication tables
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

CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    honorable VARCHAR(20) CHECK (honorable IN ('Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.')),
    full_name VARCHAR(255) NOT NULL,
    professional_title VARCHAR(255),
    qualifications TEXT[],
    professional_status VARCHAR(255),
    house_number VARCHAR(50),
    street_name VARCHAR(255),
    area_name VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    telephone VARCHAR(50),
    mobile VARCHAR(50),
    email_address VARCHAR(255),
    website VARCHAR(255),
    ivsl_registration VARCHAR(100),
    professional_body VARCHAR(255) DEFAULT 'Institute of Valuers Sri Lanka',
    license_number VARCHAR(100),
    license_expiry DATE,
    report_reference_prefix VARCHAR(50) DEFAULT 'VAL',
    signature_image TEXT,
    company_logo TEXT,
    standard_disclaimers TEXT,
    default_methodology TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

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

-- Add missing columns to cities table (without PostGIS for now)
ALTER TABLE cities ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS population_tier VARCHAR(50);

-- Add missing columns to pois table
ALTER TABLE pois ADD COLUMN IF NOT EXISTS google_types TEXT[];

-- Create api_cache table if missing
CREATE TABLE IF NOT EXISTS api_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create missing cache functions
CREATE OR REPLACE FUNCTION get_cache_data(cache_key TEXT)
RETURNS TABLE(data JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT ac.data
    FROM api_cache ac
    WHERE ac.cache_key = get_cache_data.cache_key
    AND ac.expires_at > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_cache_data(
    cache_key TEXT,
    cache_type TEXT,
    cache_data JSONB,
    ttl_hours INTEGER DEFAULT 24
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_cache (cache_key, cache_type, data, expires_at)
    VALUES (cache_key, cache_type, cache_data, CURRENT_TIMESTAMP + (ttl_hours || ' hours')::INTERVAL)
    ON CONFLICT (cache_key)
    DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for authentication tables (only if columns exist)
DO $$
BEGIN
    -- Check if users table exists and has email column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'uuid') THEN
        CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'profile_completed') THEN
        CREATE INDEX IF NOT EXISTS idx_user_profiles_completed ON user_profiles(profile_completed);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'session_token') THEN
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'expires_at') THEN
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_log' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_log' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at);
    END IF;
END $$;

-- Add missing indexes (without PostGIS spatial indexes for now)
CREATE INDEX IF NOT EXISTS idx_cities_district ON cities (district);
CREATE INDEX IF NOT EXISTS idx_cities_province ON cities (province);
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache (expires_at);

-- Add update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to authentication tables (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
`;

async function fixDatabaseSchema() {
  console.log('🔧 Starting database schema fix...');

  try {
    const client = await pool.connect();

    try {
      await client.query(schemaFixes);
      console.log('✅ Database schema fixed successfully!');
      console.log('✅ Missing columns and functions have been added');
      console.log('✅ Indexes have been created');
    } catch (error) {
      console.error('❌ Error fixing database schema:', error.message);
      console.error('Full error:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixDatabaseSchema()
    .then(() => {
      console.log('🎉 Database schema fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database schema fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixDatabaseSchema };