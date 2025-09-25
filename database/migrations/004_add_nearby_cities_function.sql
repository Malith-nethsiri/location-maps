-- Migration: 004_add_nearby_cities_function.sql
-- Created: 2025-09-25
-- Description: Add missing find_nearby_cities function and optimize cities table for cost reduction

BEGIN;

-- Add missing columns for cost optimization plan
ALTER TABLE cities ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS population_tier VARCHAR(20) DEFAULT 'small';

-- Update population_tier based on population
UPDATE cities SET population_tier =
    CASE
        WHEN population >= 500000 THEN 'major'
        WHEN population >= 100000 THEN 'large'
        WHEN population >= 50000 THEN 'medium'
        WHEN population >= 10000 THEN 'small'
        ELSE 'village'
    END
WHERE population IS NOT NULL;

-- Create the missing find_nearby_cities function
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
    ORDER BY c.geom <-> ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_cities_district ON cities (district);
CREATE INDEX IF NOT EXISTS idx_cities_province ON cities (province);
CREATE INDEX IF NOT EXISTS idx_cities_population_tier ON cities (population_tier);

-- Add caching tables for cost optimization
CREATE TABLE IF NOT EXISTS api_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- 'static_map', 'poi_data', 'routes'
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_type ON api_cache (cache_type);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache (expires_at);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached data
CREATE OR REPLACE FUNCTION get_cache_data(cache_key_param VARCHAR)
RETURNS JSONB AS $$
DECLARE
    cache_data JSONB;
BEGIN
    SELECT data INTO cache_data
    FROM api_cache
    WHERE cache_key = cache_key_param
    AND expires_at > CURRENT_TIMESTAMP;

    RETURN cache_data;
END;
$$ LANGUAGE plpgsql;

-- Function to set cached data
CREATE OR REPLACE FUNCTION set_cache_data(
    cache_key_param VARCHAR,
    cache_type_param VARCHAR,
    data_param JSONB,
    ttl_hours INTEGER DEFAULT 24
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_cache (cache_key, cache_type, data, expires_at)
    VALUES (
        cache_key_param,
        cache_type_param,
        data_param,
        CURRENT_TIMESTAMP + (ttl_hours || ' hours')::INTERVAL
    )
    ON CONFLICT (cache_key) DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        created_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

COMMIT;