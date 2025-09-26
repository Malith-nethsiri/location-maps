-- Migration 007: Valuation Reports System Schema
-- Creates all tables needed for the valuation report system
-- Based on report-structure.md requirements

-- ===============================================
-- User Profiles Table (Auto-fill user data)
-- ===============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,

    -- Personal Information (Document Header)
    honorable VARCHAR(20), -- Mr./Ms./Dr./Prof.
    full_name VARCHAR(255) NOT NULL,
    professional_title VARCHAR(255), -- Chartered Valuation Surveyor
    qualifications_list TEXT[], -- Array of qualifications
    professional_status VARCHAR(255), -- MRICS, FRICS, etc.

    -- Contact Information
    house_number VARCHAR(50),
    street_name VARCHAR(255),
    area_name VARCHAR(255),
    city VARCHAR(255),
    district VARCHAR(255),
    phone_number VARCHAR(20),
    mobile_number VARCHAR(20),
    email_address VARCHAR(255),

    -- Professional Details
    ivsl_registration VARCHAR(100), -- IVSL Reg. No
    default_valuer_reference VARCHAR(100), -- My Ref format

    -- Preferences and Defaults
    preferences JSONB DEFAULT '{}', -- Store default rates, disclaimers, etc.

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Valuation Reports Main Table
-- ===============================================
CREATE TABLE IF NOT EXISTS valuation_reports (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,

    -- Report Metadata
    report_reference VARCHAR(100),
    report_date DATE DEFAULT CURRENT_DATE,
    valuation_date DATE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, in_progress, completed, finalized
    report_type VARCHAR(100), -- mortgage, fair_value, insurance, etc.

    -- Client Information (Section 1.0 PREAMBLE)
    instruction_source VARCHAR(255),
    client_designation VARCHAR(255),
    client_organization VARCHAR(255),
    client_address TEXT,
    instruction_method VARCHAR(255), -- letter, email, phone
    instruction_date DATE,
    valuation_purpose TEXT,
    inspection_date DATE,
    persons_present TEXT,

    -- Property Identification (Section 3.0)
    -- Location Details
    village_name VARCHAR(255),
    pradeshiya_sabha VARCHAR(255),
    korale VARCHAR(255),
    hathpattu VARCHAR(255),
    district VARCHAR(255),
    province VARCHAR(255),
    coordinates POINT, -- PostGIS point for lat/lng
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Legal Description
    lot_number VARCHAR(100),
    plan_number VARCHAR(255),
    survey_date DATE,
    licensed_surveyor VARCHAR(255),
    approving_authority VARCHAR(255),
    approval_date DATE,

    -- Ownership
    deed_number VARCHAR(255),
    deed_date DATE,
    notary_public VARCHAR(255),
    current_owner TEXT,

    -- Land Details
    land_name VARCHAR(255),
    acres INTEGER DEFAULT 0,
    roods INTEGER DEFAULT 0,
    perches INTEGER DEFAULT 0,
    hectares DECIMAL(10, 4),

    -- Access and Route (Section 4.0) - AI Enhanced
    route_description TEXT,
    access_certification TEXT,

    -- Boundaries (Section 5.0)
    north_boundary TEXT,
    east_boundary TEXT,
    south_boundary TEXT,
    west_boundary TEXT,

    -- Land Description (Section 6.0) - AI Enhanced
    land_shape VARCHAR(100), -- rectangular, irregular, etc.
    topography_type VARCHAR(100), -- level, sloping, etc.
    land_use_type VARCHAR(100), -- residential, commercial, agricultural
    frontage_measurement VARCHAR(100),
    access_road_type VARCHAR(100), -- motorable road, gravel road
    boundary_direction VARCHAR(50), -- north, south, east, west

    -- Soil & Environment
    soil_type VARCHAR(255),
    suitable_use TEXT,
    water_table_depth VARCHAR(100),
    flood_status VARCHAR(255),

    -- Plantation
    plantation_description TEXT,
    plantation_details TEXT,

    -- Building Description (Section 7.0) - AI Enhanced
    building_type VARCHAR(255),
    condition_grade VARCHAR(100), -- excellent, good, fair, poor
    building_age INTEGER,
    roof_description TEXT,
    wall_description TEXT,
    floor_description TEXT,
    doors_windows_description TEXT,
    room_layout_description TEXT,
    total_floor_area INTEGER, -- square feet
    conveniences_list TEXT[],

    -- Locality Description (Section 8.0) - AI Enhanced
    locality_type VARCHAR(255),
    distance_to_town VARCHAR(100),
    nearest_town VARCHAR(255),
    development_level VARCHAR(255),
    infrastructure_description TEXT,
    nearby_facilities_list TEXT[],
    market_demand_analysis TEXT,

    -- Planning Regulations (Section 9.0)
    local_authority VARCHAR(255),
    street_line_status TEXT,
    regulatory_compliance_status TEXT,

    -- Evidence of Value (Section 10.0) - AI Enhanced
    market_evidence_analysis TEXT,
    min_rate DECIMAL(12, 2),
    max_rate DECIMAL(12, 2),
    rate_factors TEXT,

    -- Valuation (Section 11.0 & 12.0)
    methodology_explanation TEXT,
    approach_justification TEXT,
    valuation_factors TEXT,
    adopted_rate DECIMAL(12, 2),

    -- Contractor's Method Calculations
    land_extent VARCHAR(100),
    land_rate DECIMAL(12, 2),
    land_value DECIMAL(15, 2),
    floor_area INTEGER,
    building_rate DECIMAL(12, 2),
    depreciation_rate DECIMAL(5, 2),
    building_value DECIMAL(15, 2),
    additional_components TEXT,
    total_market_value DECIMAL(15, 2),

    -- Final Values
    market_value DECIMAL(15, 2),
    market_value_words TEXT,
    forced_sale_value DECIMAL(15, 2),
    forced_sale_value_words TEXT,
    insurance_value DECIMAL(15, 2),
    insurance_value_words TEXT,
    final_value DECIMAL(15, 2),

    -- Certification (Section 13.0)
    standard_disclaimers TEXT,

    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Add foreign key constraint
    CONSTRAINT fk_user_profile
        FOREIGN KEY (user_id)
        REFERENCES user_profiles(user_id)
        ON DELETE CASCADE
);

-- ===============================================
-- Report Images Table
-- ===============================================
CREATE TABLE IF NOT EXISTS report_images (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL, -- land_views, building_exterior, boundaries, etc.
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    caption TEXT,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_report_images
        FOREIGN KEY (report_id)
        REFERENCES valuation_reports(id)
        ON DELETE CASCADE
);

-- ===============================================
-- AI Generated Content Cache (Cost Optimization)
-- ===============================================
CREATE TABLE IF NOT EXISTS generated_content (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(100) NOT NULL, -- route_description, property_description, etc.
    input_hash VARCHAR(64) NOT NULL, -- MD5 hash of input parameters
    input_data JSONB, -- Store original input for reference
    generated_text TEXT NOT NULL,
    reuse_count INTEGER DEFAULT 1,
    ai_model VARCHAR(100), -- gpt-4, gpt-3.5-turbo
    tokens_used INTEGER,
    cost_usd DECIMAL(8, 4),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint to prevent duplicate content
    UNIQUE(content_type, input_hash)
);

-- ===============================================
-- Sri Lankan Administrative Data Enhancement
-- ===============================================
-- Extend existing cities table for valuation context
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sri_lankan_cities' AND column_name = 'pradeshiya_sabha') THEN
        ALTER TABLE sri_lankan_cities ADD COLUMN pradeshiya_sabha VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sri_lankan_cities' AND column_name = 'korale') THEN
        ALTER TABLE sri_lankan_cities ADD COLUMN korale VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sri_lankan_cities' AND column_name = 'hathpattu') THEN
        ALTER TABLE sri_lankan_cities ADD COLUMN hathpattu VARCHAR(255);
    END IF;
END $$;

-- ===============================================
-- Valuation Templates (Standard Text Library)
-- ===============================================
CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_category VARCHAR(100) NOT NULL, -- fair_value_definition, methodology, disclaimers
    template_content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    user_id VARCHAR(255), -- NULL for system templates

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Indexes for Performance
-- ===============================================

-- User profiles index
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Valuation reports indexes
CREATE INDEX IF NOT EXISTS idx_valuation_reports_user_id ON valuation_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_valuation_reports_status ON valuation_reports(status);
CREATE INDEX IF NOT EXISTS idx_valuation_reports_created_at ON valuation_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_valuation_reports_coordinates ON valuation_reports USING GIST(coordinates);

-- Report images indexes
CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON report_images(report_id);
CREATE INDEX IF NOT EXISTS idx_report_images_category ON report_images(category);

-- Generated content indexes
CREATE INDEX IF NOT EXISTS idx_generated_content_type_hash ON generated_content(content_type, input_hash);
CREATE INDEX IF NOT EXISTS idx_generated_content_reuse_count ON generated_content(reuse_count DESC);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(template_category);
CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON report_templates(user_id);

-- ===============================================
-- Insert Default Templates
-- ===============================================

-- Fair Value Definitions (SLFRS 13)
INSERT INTO report_templates (template_name, template_category, template_content, is_default) VALUES
('SLFRS 13 Fair Value', 'fair_value_definition',
'Fair value is the price that would be received to sell an asset or paid to transfer a liability in an orderly transaction between market participants at the measurement date under current market conditions.',
true),

('RICS Market Value', 'market_value_definition',
'Market Value is the estimated amount for which an asset or liability should exchange on the valuation date between a willing buyer and a willing seller in an arm''s length transaction, after proper marketing and where the parties had each acted knowledgeably, prudently and without compulsion.',
true),

('Standard Methodology', 'methodology_explanation',
'The valuation has been carried out using the Contractor''s Method (Cost Approach), which determines value by calculating the current replacement cost of improvements, less depreciation, plus land value.',
true),

('Standard Disclaimer', 'standard_disclaimers',
'This valuation is based on the information provided and our inspection of the property. The valuation is subject to the assumptions and limiting conditions contained herein and is valid only for the stated purpose and date.',
true);

-- RICS Years (for dropdown)
INSERT INTO report_templates (template_name, template_category, template_content, is_default) VALUES
('RICS 2025', 'rics_year', '2025', true),
('RICS 2024', 'rics_year', '2024', false);

-- Building Types (Sri Lankan context)
INSERT INTO report_templates (template_name, template_category, template_content, is_default) VALUES
('Single Storied House', 'building_type', 'Single storied residential building', true),
('Two Storied House', 'building_type', 'Two storied residential building', false),
('Annex Building', 'building_type', 'Single storied annex building', false),
('Commercial Building', 'building_type', 'Commercial type building', false);

-- Condition Grades
INSERT INTO report_templates (template_name, template_category, template_content, is_default) VALUES
('Excellent Condition', 'condition_grade', 'excellent', false),
('Good Condition', 'condition_grade', 'good', true),
('Fair Condition', 'condition_grade', 'fair', false),
('Poor Condition', 'condition_grade', 'poor', false);

-- ===============================================
-- Functions for Report Management
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_valuation_reports_updated_at ON valuation_reports;
CREATE TRIGGER update_valuation_reports_updated_at
    BEFORE UPDATE ON valuation_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate land extent in hectares
CREATE OR REPLACE FUNCTION calculate_hectares(acres INTEGER, roods INTEGER, perches INTEGER)
RETURNS DECIMAL(10, 4) AS $$
BEGIN
    -- Convert to hectares: 1 acre = 0.4047 hectares, 1 rood = 40 perches, 1 acre = 160 perches
    RETURN ROUND(((acres * 160 + roods * 40 + perches) * 0.4047 / 160)::DECIMAL, 4);
END;
$$ LANGUAGE plpgsql;

-- Function to generate report reference number
CREATE OR REPLACE FUNCTION generate_report_reference(user_ref VARCHAR, report_date DATE)
RETURNS VARCHAR AS $$
BEGIN
    RETURN user_ref || '/' || EXTRACT(YEAR FROM report_date) || '/' ||
           LPAD((SELECT COUNT(*) + 1 FROM valuation_reports WHERE user_id = user_ref
                 AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM report_date))::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- Grant Permissions
-- ===============================================
-- These will be set up based on your existing user permissions

COMMENT ON TABLE user_profiles IS 'Stores valuer professional information for auto-filling reports';
COMMENT ON TABLE valuation_reports IS 'Main table storing all valuation report data based on report-structure.md';
COMMENT ON TABLE report_images IS 'Stores property images organized by category for report inclusion';
COMMENT ON TABLE generated_content IS 'Caches AI-generated content to reduce OpenAI API costs through reuse';
COMMENT ON TABLE report_templates IS 'Stores standard text templates and dropdown options for report fields';