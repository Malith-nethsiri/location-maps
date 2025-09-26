-- Emergency fix for Railway database schema issues
-- Run this to fix the missing columns and functions

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add missing columns to cities table
ALTER TABLE cities ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS population_tier VARCHAR(50);

-- Update geom column for existing records
UPDATE cities SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;

-- Make geom column required after populating
ALTER TABLE cities ALTER COLUMN geom SET NOT NULL;

-- Add missing columns to pois table
ALTER TABLE pois ADD COLUMN IF NOT EXISTS google_types TEXT[];

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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_cities_geom ON cities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_cities_district ON cities (district);
CREATE INDEX IF NOT EXISTS idx_cities_province ON cities (province);
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache (expires_at);

-- Fix routes table for proper unique constraint
ALTER TABLE routes ADD CONSTRAINT IF NOT EXISTS routes_unique_key
UNIQUE (origin_lat, origin_lng, destination_lat, destination_lng, travel_mode);

-- Create cleanup function for expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Railway database schema fixed successfully!' as result;