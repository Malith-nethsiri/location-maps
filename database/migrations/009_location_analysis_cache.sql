-- Migration 009: Location Analysis Cache for Report Integration
-- Phase 12.3: Location Intelligence Integration
-- Date: 2025-09-26

-- Location analysis cache table for performance optimization
CREATE TABLE IF NOT EXISTS location_analysis_cache (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Ensure unique coordinates with spatial indexing
    UNIQUE(latitude, longitude)
);

-- Sri Lankan administrative hierarchy reference table
CREATE TABLE IF NOT EXISTS sri_lankan_administrative_hierarchy (
    id SERIAL PRIMARY KEY,
    level_type VARCHAR(50) NOT NULL, -- province, district, division, village
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES sri_lankan_administrative_hierarchy(id),
    coordinates POINT, -- Center coordinates for the administrative area
    bounds POLYGON, -- Boundary polygon if available

    UNIQUE(level_type, name, parent_id)
);

-- Report location context table (links reports to location analysis)
CREATE TABLE IF NOT EXISTS report_location_context (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_analysis_id INTEGER REFERENCES location_analysis_cache(id),

    -- Section 3.1 data (auto-populated from location)
    village_name VARCHAR(255),
    pradeshiya_sabha VARCHAR(255),
    korale VARCHAR(255),
    hathpattu VARCHAR(255),
    district VARCHAR(255),
    province VARCHAR(255),
    formatted_address TEXT,

    -- Section 4.1 route data (for AI enhancement)
    nearest_major_city VARCHAR(100),
    route_instructions TEXT,
    route_distance_km DECIMAL(8, 2),
    route_duration VARCHAR(50),
    route_quality VARCHAR(100),

    -- Section 4.2 location maps
    satellite_image_url TEXT,
    hybrid_image_url TEXT,
    terrain_image_url TEXT,

    -- Section 8.0 locality data
    locality_type VARCHAR(100),
    distance_to_town_km DECIMAL(8, 2),
    nearest_town VARCHAR(100),
    development_level VARCHAR(100),
    infrastructure_description TEXT,
    nearby_facilities TEXT[],

    -- Raw data for AI processing
    raw_poi_data JSONB,
    raw_route_data JSONB,
    raw_administrative_data JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- One location context per report
    UNIQUE(report_id)
);

-- POI analysis results for reports
CREATE TABLE IF NOT EXISTS report_poi_analysis (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES valuation_reports(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- educational, medical, financial, etc.
    facility_name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100),
    distance_km DECIMAL(8, 2),
    address VARCHAR(500),
    rating DECIMAL(3, 2),
    place_id VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_cache_coords ON location_analysis_cache(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_location_cache_created ON location_analysis_cache(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_hierarchy_type ON sri_lankan_administrative_hierarchy(level_type);
CREATE INDEX IF NOT EXISTS idx_admin_hierarchy_parent ON sri_lankan_administrative_hierarchy(parent_id);

CREATE INDEX IF NOT EXISTS idx_report_location_report_id ON report_location_context(report_id);
CREATE INDEX IF NOT EXISTS idx_report_location_coords ON report_location_context(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_poi_analysis_report_id ON report_poi_analysis(report_id);
CREATE INDEX IF NOT EXISTS idx_poi_analysis_category ON report_poi_analysis(category);

-- Spatial indexes if PostGIS is enabled
-- CREATE INDEX IF NOT EXISTS idx_admin_coordinates ON sri_lankan_administrative_hierarchy USING GIST(coordinates);
-- CREATE INDEX IF NOT EXISTS idx_admin_bounds ON sri_lankan_administrative_hierarchy USING GIST(bounds);

-- Update trigger for report_location_context
CREATE OR REPLACE FUNCTION update_report_location_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_report_location_context_updated_at ON report_location_context;
CREATE TRIGGER update_report_location_context_updated_at
    BEFORE UPDATE ON report_location_context
    FOR EACH ROW
    EXECUTE FUNCTION update_report_location_context_timestamp();

-- Function to get nearby administrative areas
CREATE OR REPLACE FUNCTION get_nearby_administrative_areas(
    search_lat DECIMAL(10, 8),
    search_lng DECIMAL(11, 8),
    search_radius_km INTEGER DEFAULT 50
)
RETURNS TABLE(
    level_type VARCHAR(50),
    name VARCHAR(255),
    distance_km DECIMAL(8, 2)
) AS $$
BEGIN
    -- This is a simplified version - would be enhanced with actual spatial calculations
    RETURN QUERY
    SELECT
        sah.level_type,
        sah.name,
        0.0 as distance_km  -- Placeholder - would calculate actual distance
    FROM sri_lankan_administrative_hierarchy sah
    WHERE sah.level_type IN ('province', 'district')
    ORDER BY sah.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to cache location analysis with cleanup
CREATE OR REPLACE FUNCTION cache_location_analysis(
    analysis_lat DECIMAL(10, 8),
    analysis_lng DECIMAL(11, 8),
    analysis_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
    cache_id INTEGER;
BEGIN
    -- Insert or update cache entry
    INSERT INTO location_analysis_cache (latitude, longitude, analysis_data)
    VALUES (analysis_lat, analysis_lng, analysis_data)
    ON CONFLICT (latitude, longitude)
    DO UPDATE SET
        analysis_data = EXCLUDED.analysis_data,
        created_at = NOW()
    RETURNING id INTO cache_id;

    -- Cleanup old cache entries (older than 7 days)
    DELETE FROM location_analysis_cache
    WHERE created_at < NOW() - INTERVAL '7 days';

    RETURN cache_id;
END;
$$ LANGUAGE plpgsql;

-- Insert initial Sri Lankan administrative data
INSERT INTO sri_lankan_administrative_hierarchy (level_type, name, parent_id) VALUES
    -- Provinces
    ('province', 'Western Province', NULL),
    ('province', 'Central Province', NULL),
    ('province', 'Southern Province', NULL),
    ('province', 'Northern Province', NULL),
    ('province', 'Eastern Province', NULL),
    ('province', 'North Western Province', NULL),
    ('province', 'North Central Province', NULL),
    ('province', 'Uva Province', NULL),
    ('province', 'Sabaragamuwa Province', NULL)
ON CONFLICT (level_type, name, parent_id) DO NOTHING;

-- Insert major districts
WITH provinces AS (
    SELECT id, name FROM sri_lankan_administrative_hierarchy WHERE level_type = 'province'
)
INSERT INTO sri_lankan_administrative_hierarchy (level_type, name, parent_id)
SELECT 'district', district_name, p.id
FROM provinces p
CROSS JOIN (VALUES
    ('Western Province', 'Colombo'),
    ('Western Province', 'Gampaha'),
    ('Western Province', 'Kalutara'),
    ('Central Province', 'Kandy'),
    ('Central Province', 'Matale'),
    ('Central Province', 'Nuwara Eliya'),
    ('Southern Province', 'Galle'),
    ('Southern Province', 'Matara'),
    ('Southern Province', 'Hambantota'),
    ('Northern Province', 'Jaffna'),
    ('Northern Province', 'Kilinochchi'),
    ('Northern Province', 'Mannar'),
    ('Northern Province', 'Mullaitivu'),
    ('Northern Province', 'Vavuniya'),
    ('Eastern Province', 'Batticaloa'),
    ('Eastern Province', 'Ampara'),
    ('Eastern Province', 'Trincomalee'),
    ('North Western Province', 'Kurunegala'),
    ('North Western Province', 'Puttalam'),
    ('North Central Province', 'Anuradhapura'),
    ('North Central Province', 'Polonnaruwa'),
    ('Uva Province', 'Badulla'),
    ('Uva Province', 'Monaragala'),
    ('Sabaragamuwa Province', 'Ratnapura'),
    ('Sabaragamuwa Province', 'Kegalle')
) AS districts(province_name, district_name)
WHERE p.name = districts.province_name
ON CONFLICT (level_type, name, parent_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE location_analysis_cache IS 'Cache for location intelligence analysis to improve performance';
COMMENT ON TABLE sri_lankan_administrative_hierarchy IS 'Complete Sri Lankan administrative hierarchy for address resolution';
COMMENT ON TABLE report_location_context IS 'Links valuation reports to location intelligence data';
COMMENT ON TABLE report_poi_analysis IS 'Detailed POI analysis results for each report';

COMMENT ON FUNCTION cache_location_analysis IS 'Cache location analysis data with automatic cleanup';
COMMENT ON FUNCTION get_nearby_administrative_areas IS 'Find nearby administrative areas for address resolution';