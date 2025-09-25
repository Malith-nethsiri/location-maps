-- Migration: 006_enhance_city_routing.sql
-- Created: 2025-09-25
-- Description: Enhance city routing logic for hybrid location service

BEGIN;

-- Create find_nearest_city function if it doesn't exist
CREATE OR REPLACE FUNCTION find_nearest_city(
    target_lat DECIMAL,
    target_lng DECIMAL,
    max_distance_km INTEGER DEFAULT 500
)
RETURNS TABLE (
    city_name VARCHAR,
    country VARCHAR,
    state VARCHAR,
    district VARCHAR,
    province VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    population INTEGER,
    population_tier VARCHAR,
    timezone VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name,
        c.country,
        c.state,
        c.district,
        c.province,
        c.latitude,
        c.longitude,
        ROUND(ST_Distance(c.geom, ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography) / 1000, 2) as distance_km,
        c.population,
        c.population_tier,
        c.timezone
    FROM cities c
    WHERE ST_DWithin(
        c.geom,
        ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
        max_distance_km * 1000
    )
    ORDER BY c.geom <-> ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Update find_nearby_cities function to prioritize by distance, not population
CREATE OR REPLACE FUNCTION find_nearby_cities(
    target_lat DECIMAL,
    target_lng DECIMAL,
    max_distance_km INTEGER DEFAULT 100,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    city_name VARCHAR,
    country VARCHAR,
    state VARCHAR,
    district VARCHAR,
    province VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    population INTEGER,
    population_tier VARCHAR,
    timezone VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name,
        c.country,
        c.state,
        c.district,
        c.province,
        c.latitude,
        c.longitude,
        ROUND(ST_Distance(c.geom, ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography) / 1000, 2) as distance_km,
        c.population,
        c.population_tier,
        c.timezone
    FROM cities c
    WHERE ST_DWithin(
        c.geom,
        ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
        max_distance_km * 1000
    )
    -- ENHANCED: Priority order - nearest first, then by population tier for ties
    ORDER BY
        ST_Distance(c.geom, ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography) ASC,
        CASE c.population_tier
            WHEN 'major' THEN 1
            WHEN 'large' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'small' THEN 4
            ELSE 5
        END ASC,
        c.population DESC NULLS LAST
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance on distance-based queries
CREATE INDEX IF NOT EXISTS idx_cities_geom_gist ON cities USING GIST (geom);

-- Enhance the api_cache table with better indexing
CREATE INDEX IF NOT EXISTS idx_api_cache_created ON api_cache (created_at);

-- Add a function to get nearby POIs from cache (for fallback)
CREATE OR REPLACE FUNCTION get_nearby_pois_from_cache(
    target_lat DECIMAL,
    target_lng DECIMAL,
    max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE (
    google_place_id VARCHAR,
    name VARCHAR,
    category VARCHAR,
    subcategory VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    address VARCHAR,
    rating DECIMAL,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.google_place_id,
        p.name,
        p.category,
        p.subcategory,
        p.latitude,
        p.longitude,
        p.address,
        p.rating,
        ROUND(ST_Distance(
            ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography
        ) / 1000, 2) as distance_km
    FROM pois p
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
        max_distance_km * 1000
    )
    AND p.updated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' -- Only recent POIs
    ORDER BY distance_km ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Clean up old cache entries on a schedule
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS VOID AS $$
BEGIN
    -- Clean expired cache entries
    DELETE FROM api_cache WHERE expires_at < CURRENT_TIMESTAMP;

    -- Clean old POI data (older than 7 days)
    DELETE FROM pois WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days';

    -- Clean old user queries (older than 30 days)
    DELETE FROM user_queries WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

    RAISE NOTICE 'Cleaned up expired data';
END;
$$ LANGUAGE plpgsql;

COMMIT;