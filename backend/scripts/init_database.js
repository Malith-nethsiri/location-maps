#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

// Complete database schema for Railway deployment
const fullSchema = `
-- ===============================================
-- Enable necessary extensions
-- ===============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ===============================================
-- Users and Authentication Tables
-- ===============================================

-- Create users table
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

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    honorable VARCHAR(20) CHECK (honorable IN ('Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.')),
    full_name VARCHAR(255) NOT NULL DEFAULT 'New User',
    professional_title VARCHAR(255),
    qualifications_list JSONB DEFAULT '[]',
    professional_status VARCHAR(255),
    house_number VARCHAR(50),
    street_name VARCHAR(255),
    area_name VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    phone_number VARCHAR(50),
    mobile_number VARCHAR(50),
    email_address VARCHAR(255),
    ivsl_registration VARCHAR(100),
    default_valuer_reference VARCHAR(50) DEFAULT 'VR',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- Sri Lankan Location Data Table
-- ===============================================

CREATE TABLE IF NOT EXISTS sri_lankan_cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_si VARCHAR(255),
    name_ta VARCHAR(255),
    district VARCHAR(100),
    province VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INTEGER,
    elevation INTEGER,
    postal_codes TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- Valuation Reports Tables
-- ===============================================

-- Main valuation reports table
CREATE TABLE IF NOT EXISTS valuation_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_reference VARCHAR(100) UNIQUE,

    -- Basic Information
    report_date DATE DEFAULT CURRENT_DATE,
    report_type VARCHAR(50) DEFAULT 'fair_value',
    valuation_purpose TEXT,
    valuation_date DATE DEFAULT CURRENT_DATE,
    instruction_source VARCHAR(255),
    client_designation VARCHAR(255),
    client_organization VARCHAR(255),
    client_address TEXT,

    -- Property Location
    coordinates GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    village_name VARCHAR(255),
    pradeshiya_sabha VARCHAR(255),
    district VARCHAR(100),
    province VARCHAR(100),

    -- Legal Details
    lot_number VARCHAR(100),
    plan_number VARCHAR(255),
    survey_date DATE,
    licensed_surveyor VARCHAR(255),
    current_owner VARCHAR(255),

    -- Property Boundaries
    north_boundary TEXT,
    east_boundary TEXT,
    south_boundary TEXT,
    west_boundary TEXT,
    total_extent VARCHAR(100),
    frontage_measurement VARCHAR(100),
    access_road_type VARCHAR(50),

    -- Land Description
    land_shape VARCHAR(50),
    topography_type VARCHAR(50),
    soil_type VARCHAR(50),
    land_use_type VARCHAR(50),
    plantation_description TEXT,
    land_features TEXT,

    -- Building Details
    building_type VARCHAR(100),
    building_age INTEGER,
    condition_grade VARCHAR(50),
    total_floor_area DECIMAL(10, 2),
    bedrooms INTEGER,
    roof_description TEXT,
    wall_description TEXT,
    floor_description TEXT,
    doors_windows TEXT,
    room_layout_description TEXT,
    building_conveniences TEXT[],

    -- Valuation
    land_rate DECIMAL(15, 2),
    building_rate DECIMAL(15, 2),
    market_value DECIMAL(15, 2),
    forced_sale_value DECIMAL(15, 2),
    insurance_value DECIMAL(15, 2),
    valuation_method VARCHAR(50) DEFAULT 'contractor_method',

    -- Report Status
    status VARCHAR(20) DEFAULT 'draft',
    completed_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Location Intelligence Tables
-- ===============================================

-- Report location context table
CREATE TABLE IF NOT EXISTS report_location_context (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,

    -- Coordinates
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    -- Administrative hierarchy
    village_name VARCHAR(255),
    pradeshiya_sabha VARCHAR(255),
    korale VARCHAR(255),
    hathpattu VARCHAR(255),
    district VARCHAR(100),
    province VARCHAR(100),
    formatted_address TEXT,

    -- Route information
    nearest_major_city VARCHAR(100),
    route_instructions TEXT,
    route_distance_km DECIMAL(8, 2),
    route_duration VARCHAR(50),
    route_quality VARCHAR(50),

    -- Map images
    satellite_image_url TEXT,
    hybrid_image_url TEXT,
    terrain_image_url TEXT,

    -- Locality data
    locality_type VARCHAR(50),
    distance_to_town_km DECIMAL(8, 2),
    nearest_town VARCHAR(100),
    development_level VARCHAR(50),
    infrastructure_description TEXT,
    nearby_facilities JSONB,

    -- Raw data storage
    raw_poi_data JSONB,
    raw_route_data JSONB,
    raw_administrative_data JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POI analysis table
CREATE TABLE IF NOT EXISTS report_poi_analysis (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    facility_name VARCHAR(255),
    facility_type VARCHAR(100),
    distance_km DECIMAL(8, 2),
    address TEXT,
    rating DECIMAL(3, 2),
    place_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Image Management Tables
-- ===============================================

-- Report images table
CREATE TABLE IF NOT EXISTS report_images (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- AI Content Generation Tables
-- ===============================================

-- Generated content tracking
CREATE TABLE IF NOT EXISTS generated_content (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    generated_text TEXT NOT NULL,
    prompt_used TEXT,
    ai_model VARCHAR(50),
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    cached BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Report Templates Table
-- ===============================================

CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_category VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- System Monitoring Tables
-- ===============================================

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User activity log table
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

-- ===============================================
-- Create Indexes
-- ===============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Report indexes
CREATE INDEX IF NOT EXISTS idx_valuation_reports_user_id ON valuation_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_valuation_reports_status ON valuation_reports(status);
CREATE INDEX IF NOT EXISTS idx_valuation_reports_district ON valuation_reports(district);
CREATE INDEX IF NOT EXISTS idx_valuation_reports_created_at ON valuation_reports(created_at);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_report_location_context_report_id ON report_location_context(report_id);
CREATE INDEX IF NOT EXISTS idx_report_poi_analysis_report_id ON report_poi_analysis(report_id);
CREATE INDEX IF NOT EXISTS idx_report_poi_analysis_category ON report_poi_analysis(category);

-- Image indexes
CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON report_images(report_id);
CREATE INDEX IF NOT EXISTS idx_report_images_category ON report_images(category);

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_generated_content_report_id ON generated_content(report_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_type ON generated_content(content_type);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at);

-- Spatial index for coordinates
CREATE INDEX IF NOT EXISTS idx_valuation_reports_coordinates ON valuation_reports USING GIST (coordinates);

-- ===============================================
-- Functions and Triggers
-- ===============================================

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
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

DROP TRIGGER IF EXISTS update_valuation_reports_updated_at ON valuation_reports;
CREATE TRIGGER update_valuation_reports_updated_at
    BEFORE UPDATE ON valuation_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- Insert Default Data
-- ===============================================

-- Insert default report templates
INSERT INTO report_templates (template_name, template_category, template_content, is_default) VALUES
('Standard Property Description', 'property_description', 'A [building_type] property situated on [total_extent] of land in [village_name], [district] District.', true),
('Standard Locality Description', 'locality_description', 'The property is located in a [development_level] area with good access to essential facilities.', true),
('Standard Route Description', 'route_description', 'The property is accessible via [access_road_type] and is approximately [distance] from the nearest town.', true)
ON CONFLICT DO NOTHING;

-- Insert some Sri Lankan cities data
INSERT INTO sri_lankan_cities (name, district, province, latitude, longitude, population) VALUES
('Colombo', 'Colombo', 'Western Province', 6.9271, 79.8612, 752993),
('Kandy', 'Kandy', 'Central Province', 7.2906, 80.6337, 125351),
('Galle', 'Galle', 'Southern Province', 6.0329, 80.2168, 99478),
('Jaffna', 'Jaffna', 'Northern Province', 9.6615, 80.0255, 88138),
('Negombo', 'Gampaha', 'Western Province', 7.2084, 79.8380, 142136),
('Anuradhapura', 'Anuradhapura', 'North Central Province', 8.3114, 80.4037, 63208),
('Polonnaruwa', 'Polonnaruwa', 'North Central Province', 7.9403, 81.0188, 15000),
('Badulla', 'Badulla', 'Uva Province', 6.9895, 81.0550, 47587),
('Ratnapura', 'Ratnapura', 'Sabaragamuwa Province', 6.6828, 80.3992, 52170),
('Kurunegala', 'Kurunegala', 'North Western Province', 7.4863, 80.3647, 99870)
ON CONFLICT DO NOTHING;
`;

async function initializeDatabase() {
  console.log('🚀 Initializing complete database schema for Railway...');

  try {
    const client = await pool.connect();

    try {
      // Execute the full schema
      await client.query(fullSchema);
      console.log('✅ Database schema initialized successfully!');

      // Test the tables were created
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      console.log('📋 Created tables:', result.rows.map(row => row.table_name).join(', '));

    } catch (error) {
      console.error('❌ Error initializing database:', error.message);
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

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error.message);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };