-- Migration: 001_initial_schema.sql
-- Created: 2025-09-23
-- Description: Initial database schema with PostGIS support

-- This migration creates the initial schema for the Location Intelligence Web App
-- It includes tables for locations, POIs, user queries, routes, and cities
-- with proper spatial indexing using PostGIS

BEGIN;

-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create enum types for better data validation
CREATE TYPE query_type_enum AS ENUM (
    'location_analysis',
    'poi_search',
    'navigation',
    'geocoding',
    'satellite_imagery'
);

CREATE TYPE travel_mode_enum AS ENUM (
    'DRIVE',
    'WALK',
    'BICYCLE',
    'TRANSIT'
);

CREATE TYPE poi_category_enum AS ENUM (
    'school',
    'hospital',
    'government',
    'religious',
    'store',
    'restaurant',
    'gas_station',
    'bank',
    'pharmacy',
    'police'
);

-- Create locations table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    address TEXT,
    formatted_address TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(latitude, longitude)
);

-- Create POIs table
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category poi_category_enum NOT NULL,
    subcategory VARCHAR(100),
    latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    address TEXT,
    phone_number VARCHAR(50),
    website VARCHAR(255),
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    user_ratings_total INTEGER CHECK (user_ratings_total >= 0),
    business_status VARCHAR(50),
    opening_hours JSONB,
    google_types TEXT[], -- Array of Google Place types
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user queries table
CREATE TABLE user_queries (
    id SERIAL PRIMARY KEY,
    query_type query_type_enum NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    search_radius INTEGER CHECK (search_radius > 0), -- in meters
    categories poi_category_enum[],
    response_data JSONB,
    response_time_ms INTEGER CHECK (response_time_ms >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET
);

-- Create routes table
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    origin_lat DECIMAL(10, 8) NOT NULL CHECK (origin_lat >= -90 AND origin_lat <= 90),
    origin_lng DECIMAL(11, 8) NOT NULL CHECK (origin_lng >= -180 AND origin_lng <= 180),
    destination_lat DECIMAL(10, 8) NOT NULL CHECK (destination_lat >= -90 AND destination_lat <= 90),
    destination_lng DECIMAL(11, 8) NOT NULL CHECK (destination_lng >= -180 AND destination_lng <= 180),
    travel_mode travel_mode_enum NOT NULL DEFAULT 'DRIVE',
    route_polyline TEXT, -- encoded polyline
    distance_meters INTEGER CHECK (distance_meters >= 0),
    duration_seconds INTEGER CHECK (duration_seconds >= 0),
    steps JSONB, -- turn-by-turn directions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    UNIQUE(origin_lat, origin_lng, destination_lat, destination_lng, travel_mode)
);

-- Create cities table
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    population INTEGER CHECK (population >= 0),
    is_major_city BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, country, state)
);

-- Create spatial indexes
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);
CREATE INDEX idx_locations_coords ON locations (latitude, longitude);
CREATE INDEX idx_locations_created_at ON locations (created_at);

CREATE INDEX idx_pois_geom ON pois USING GIST (geom);
CREATE INDEX idx_pois_coords ON pois (latitude, longitude);
CREATE INDEX idx_pois_category ON pois (category);
CREATE INDEX idx_pois_google_place_id ON pois (google_place_id);
CREATE INDEX idx_pois_rating ON pois (rating);
CREATE INDEX idx_pois_created_at ON pois (created_at);

CREATE INDEX idx_user_queries_geom ON user_queries USING GIST (geom);
CREATE INDEX idx_user_queries_coords ON user_queries (latitude, longitude);
CREATE INDEX idx_user_queries_type ON user_queries (query_type);
CREATE INDEX idx_user_queries_created_at ON user_queries (created_at);

CREATE INDEX idx_routes_origin ON routes (origin_lat, origin_lng);
CREATE INDEX idx_routes_destination ON routes (destination_lat, destination_lng);
CREATE INDEX idx_routes_travel_mode ON routes (travel_mode);
CREATE INDEX idx_routes_expires_at ON routes (expires_at);
CREATE INDEX idx_routes_created_at ON routes (created_at);

CREATE INDEX idx_cities_geom ON cities USING GIST (geom);
CREATE INDEX idx_cities_coords ON cities (latitude, longitude);
CREATE INDEX idx_cities_major ON cities (is_major_city);
CREATE INDEX idx_cities_country ON cities (country);
CREATE INDEX idx_cities_population ON cities (population);

-- Create triggers to automatically update geom columns
CREATE OR REPLACE FUNCTION update_geom_from_coords() RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply geom update triggers
CREATE TRIGGER trigger_locations_geom
    BEFORE INSERT OR UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_geom_from_coords();

CREATE TRIGGER trigger_pois_geom
    BEFORE INSERT OR UPDATE ON pois
    FOR EACH ROW
    EXECUTE FUNCTION update_geom_from_coords();

CREATE TRIGGER trigger_user_queries_geom
    BEFORE INSERT OR UPDATE ON user_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_geom_from_coords();

CREATE TRIGGER trigger_cities_geom
    BEFORE INSERT OR UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION update_geom_from_coords();

-- Apply updated_at triggers
CREATE TRIGGER trigger_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_pois_updated_at
    BEFORE UPDATE ON pois
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create utility functions
CREATE OR REPLACE FUNCTION find_nearest_city(
    target_lat DECIMAL,
    target_lng DECIMAL,
    max_distance_km INTEGER DEFAULT 500
)
RETURNS TABLE (
    city_name VARCHAR,
    country VARCHAR,
    state VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    population INTEGER,
    timezone VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name,
        c.country,
        c.state,
        c.latitude,
        c.longitude,
        ROUND(ST_Distance(c.geom, ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography) / 1000, 2) as distance_km,
        c.population,
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

-- Function to clean expired routes
CREATE OR REPLACE FUNCTION clean_expired_routes() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM routes WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get POIs within radius
CREATE OR REPLACE FUNCTION get_pois_within_radius(
    target_lat DECIMAL,
    target_lng DECIMAL,
    radius_meters INTEGER DEFAULT 5000,
    poi_categories poi_category_enum[] DEFAULT NULL
)
RETURNS TABLE (
    poi_id INTEGER,
    name VARCHAR,
    category poi_category_enum,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_meters DECIMAL,
    address TEXT,
    rating DECIMAL,
    user_ratings_total INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.category,
        p.latitude,
        p.longitude,
        ROUND(ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography), 2) as distance_meters,
        p.address,
        p.rating,
        p.user_ratings_total
    FROM pois p
    WHERE ST_DWithin(
        p.geom,
        ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
        radius_meters
    )
    AND (poi_categories IS NULL OR p.category = ANY(poi_categories))
    ORDER BY p.geom <-> ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)
    LIMIT 50; -- Reasonable limit to prevent large result sets
END;
$$ LANGUAGE plpgsql;

COMMIT;