-- ValuerPro Database Schema
-- Complete Sri Lankan Property Valuation System
-- Railway PostgreSQL with PostGIS

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===============================================
-- User Management Tables
-- ===============================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email_address VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    honorable VARCHAR(10), -- Mr., Mrs., Dr., etc.
    mobile_number VARCHAR(20),
    professional_title VARCHAR(255), -- Chartered Valuer, etc.
    qualifications_list TEXT[], -- Array of qualifications
    professional_status VARCHAR(100), -- Independent Valuer, etc.
    ivsl_registration VARCHAR(50), -- IVSL registration number
    house_number VARCHAR(50),
    street_name VARCHAR(255),
    area_name VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    profile_completed BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Valuation Reports Tables
-- ===============================================

-- Main valuation reports table
CREATE TABLE valuation_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_reference VARCHAR(50) UNIQUE,

    -- Basic Report Info
    instruction_source VARCHAR(255) NOT NULL, -- Bank/Client name
    valuation_purpose TEXT NOT NULL,
    report_type VARCHAR(50) DEFAULT 'fair_value', -- mortgage, fair_value, insurance, investment
    client_organization VARCHAR(255),
    rics_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),

    -- Location Data (GPS)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_point GEOMETRY(POINT, 4326), -- PostGIS point

    -- Section 3: Property Identification
    village_name VARCHAR(255),
    pradeshiya_sabha VARCHAR(255),
    korale VARCHAR(255),
    hathpattu VARCHAR(255),
    district VARCHAR(100),
    province VARCHAR(100),
    lot_number VARCHAR(50),
    plan_number VARCHAR(255),
    deed_number VARCHAR(255),
    current_owner VARCHAR(255),

    -- Section 5: Boundaries
    north_boundary TEXT,
    south_boundary TEXT,
    east_boundary TEXT,
    west_boundary TEXT,
    total_extent VARCHAR(100),

    -- Section 6: Land Description
    land_shape VARCHAR(50), -- rectangular, irregular, etc.
    topography_type VARCHAR(50), -- level, sloping, etc.
    soil_type VARCHAR(50), -- red_earth, sandy, etc.
    land_use_type VARCHAR(50), -- residential, commercial, etc.
    plantation_details TEXT,

    -- Section 7: Building Details
    building_type VARCHAR(100), -- single_storied_house, etc.
    building_age INTEGER,
    condition_grade VARCHAR(50), -- excellent, good, fair, poor
    total_floor_area DECIMAL(10, 2),
    construction_details JSONB, -- Materials, structure details
    accommodation_details JSONB, -- Rooms, facilities
    building_conveniences TEXT[], -- Array of conveniences

    -- Section 12: Valuation
    land_rate DECIMAL(15, 2),
    building_value DECIMAL(15, 2),
    market_value DECIMAL(15, 2),
    valuation_date DATE DEFAULT CURRENT_DATE,
    valuation_method VARCHAR(50) DEFAULT 'contractor_method',

    -- AI Enhanced Content
    ai_enhanced_route_description TEXT,
    ai_enhanced_locality_analysis TEXT,
    ai_enhanced_market_analysis TEXT,
    ai_enhanced_building_description TEXT,

    -- Report Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, completed, archived
    completion_percentage INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index on location
CREATE INDEX idx_valuation_reports_location ON valuation_reports USING GIST (location_point);

-- Create other useful indexes
CREATE INDEX idx_valuation_reports_user_id ON valuation_reports(user_id);
CREATE INDEX idx_valuation_reports_status ON valuation_reports(status);
CREATE INDEX idx_valuation_reports_district ON valuation_reports(district);
CREATE INDEX idx_valuation_reports_created_at ON valuation_reports(created_at);

-- ===============================================
-- Location Intelligence Tables
-- ===============================================

-- Report location context table
CREATE TABLE report_location_context (
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
CREATE TABLE report_poi_analysis (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- school, hospital, government, etc.
    facility_name VARCHAR(255),
    facility_type VARCHAR(100),
    distance_km DECIMAL(8, 2),
    address TEXT,
    rating DECIMAL(3, 2),
    place_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_report_location_context_report_id ON report_location_context(report_id);
CREATE INDEX idx_report_poi_analysis_report_id ON report_poi_analysis(report_id);
CREATE INDEX idx_report_poi_analysis_category ON report_poi_analysis(category);

-- ===============================================
-- Image Management Tables
-- ===============================================

-- Report images table
CREATE TABLE report_images (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- land_views, building_exterior, etc.
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_images_report_id ON report_images(report_id);
CREATE INDEX idx_report_images_category ON report_images(category);

-- ===============================================
-- AI Content Generation Tables
-- ===============================================

-- Generated content tracking
CREATE TABLE generated_content (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- route_description, locality_analysis, etc.
    generated_text TEXT NOT NULL,
    prompt_used TEXT,
    ai_model VARCHAR(50),
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    cached BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_generated_content_report_id ON generated_content(report_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_created_at ON generated_content(created_at);

-- ===============================================
-- System Monitoring Tables
-- ===============================================

-- System health logs
CREATE TABLE system_health_logs (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50) NOT NULL, -- database, ai_service, pdf_service, etc.
    status VARCHAR(20) NOT NULL, -- healthy, warning, error
    response_time INTEGER, -- in milliseconds
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API usage logs
CREATE TABLE api_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time INTEGER, -- in milliseconds
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Error logs
CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    error_type VARCHAR(50),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_data JSONB,
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for monitoring
CREATE INDEX idx_system_health_logs_created_at ON system_health_logs(created_at);
CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);

-- ===============================================
-- Functions and Triggers
-- ===============================================

-- Function to update location_point when coordinates change
CREATE OR REPLACE FUNCTION update_location_point()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for location point updates
CREATE TRIGGER trigger_update_location_point
    BEFORE INSERT OR UPDATE ON valuation_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_location_point();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_valuation_reports_updated_at
    BEFORE UPDATE ON valuation_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate report reference
CREATE OR REPLACE FUNCTION generate_report_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_reference IS NULL THEN
        NEW.report_reference = 'VR/' || EXTRACT(YEAR FROM CURRENT_DATE) || '/' ||
                              LPAD(NEW.id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for report reference generation
CREATE TRIGGER trigger_generate_report_reference
    BEFORE INSERT ON valuation_reports
    FOR EACH ROW
    EXECUTE FUNCTION generate_report_reference();

-- ===============================================
-- Views for Analytics
-- ===============================================

-- User analytics view
CREATE VIEW user_analytics AS
SELECT
    u.id,
    u.email_address,
    up.full_name,
    up.district,
    COUNT(vr.id) as total_reports,
    COUNT(CASE WHEN vr.status = 'completed' THEN 1 END) as completed_reports,
    COUNT(CASE WHEN vr.created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as reports_this_month,
    COALESCE(SUM(gc.cost_usd), 0) as total_ai_cost,
    MAX(vr.created_at) as last_report_date
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN valuation_reports vr ON u.id = vr.user_id
LEFT JOIN generated_content gc ON vr.id = gc.report_id
GROUP BY u.id, u.email_address, up.full_name, up.district;

-- Report analytics view
CREATE VIEW report_analytics AS
SELECT
    DATE_TRUNC('month', created_at) as month,
    district,
    report_type,
    COUNT(*) as report_count,
    AVG(market_value) as avg_market_value,
    AVG(completion_percentage) as avg_completion
FROM valuation_reports
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at), district, report_type
ORDER BY month DESC;

-- ===============================================
-- Initial Data
-- ===============================================

-- Sri Lankan provinces
INSERT INTO user_profiles (user_id, full_name, district) VALUES
(0, 'System', 'Colombo') ON CONFLICT DO NOTHING;

-- Sample report types for reference
CREATE TABLE IF NOT EXISTS report_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO report_types (type_code, display_name, description) VALUES
('mortgage', 'Mortgage Valuation', 'Property valuation for mortgage lending purposes'),
('fair_value', 'Fair Value Assessment', 'Independent fair value assessment for financial reporting'),
('insurance', 'Insurance Valuation', 'Property valuation for insurance coverage'),
('investment', 'Investment Analysis', 'Property valuation for investment decision making')
ON CONFLICT (type_code) DO NOTHING;

-- ===============================================
-- Performance Optimizations
-- ===============================================

-- Partitioning for large tables (if needed in future)
-- CREATE TABLE api_usage_logs_y2024 PARTITION OF api_usage_logs
-- FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Additional indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_valuation_reports_user_status
ON valuation_reports(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_valuation_reports_district_created
ON valuation_reports(district, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_cost
ON generated_content(cost_usd) WHERE cost_usd > 0;

-- ===============================================
-- Permissions (Railway will handle user management)
-- ===============================================

-- Grant permissions to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Final optimization
ANALYZE;