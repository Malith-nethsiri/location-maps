-- Location Intelligence Web App Database Schema
-- Standard PostgreSQL (without PostGIS)

-- Create database tables for location intelligence app

-- Table for storing analyzed locations (cache)
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    formatted_address TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing Points of Interest
CREATE TABLE IF NOT EXISTS pois (
    id SERIAL PRIMARY KEY,
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    phone_number VARCHAR(50),
    website VARCHAR(255),
    rating DECIMAL(2, 1),
    user_ratings_total INTEGER,
    business_status VARCHAR(50),
    opening_hours JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing user queries (for analytics and caching)
CREATE TABLE IF NOT EXISTS user_queries (
    id SERIAL PRIMARY KEY,
    query_type VARCHAR(50) NOT NULL, -- 'location_analysis', 'poi_search', 'navigation', etc.
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    search_radius INTEGER, -- in meters
    categories JSONB,
    response_data JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET
);

-- Table for storing navigation routes (cache)
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    origin_lat DECIMAL(10, 8) NOT NULL,
    origin_lng DECIMAL(11, 8) NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    travel_mode VARCHAR(20) NOT NULL DEFAULT 'DRIVE',
    route_polyline TEXT, -- encoded polyline
    distance_meters INTEGER,
    duration_seconds INTEGER,
    steps JSONB, -- turn-by-turn directions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Table for storing cities (for nearest city queries)
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    population INTEGER,
    is_major_city BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (using standard B-tree indexes)
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pois_coords ON pois (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pois_category ON pois (category);
CREATE INDEX IF NOT EXISTS idx_pois_google_place_id ON pois (google_place_id);
CREATE INDEX IF NOT EXISTS idx_user_queries_coords ON user_queries (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_queries_type ON user_queries (query_type);
CREATE INDEX IF NOT EXISTS idx_user_queries_created_at ON user_queries (created_at);
CREATE INDEX IF NOT EXISTS idx_routes_origin ON routes (origin_lat, origin_lng);
CREATE INDEX IF NOT EXISTS idx_routes_destination ON routes (destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_routes_travel_mode ON routes (travel_mode);
CREATE INDEX IF NOT EXISTS idx_routes_expires_at ON routes (expires_at);
CREATE INDEX IF NOT EXISTS idx_cities_coords ON cities (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_cities_major ON cities (is_major_city);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities (country);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_pois_updated_at
    BEFORE UPDATE ON pois
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some major cities for nearest city functionality
INSERT INTO cities (name, country, state, latitude, longitude, population, is_major_city, timezone) VALUES
('New York', 'United States', 'New York', 40.7128, -74.0060, 8336817, true, 'America/New_York'),
('Los Angeles', 'United States', 'California', 34.0522, -118.2437, 3979576, true, 'America/Los_Angeles'),
('Chicago', 'United States', 'Illinois', 41.8781, -87.6298, 2693976, true, 'America/Chicago'),
('Houston', 'United States', 'Texas', 29.7604, -95.3698, 2320268, true, 'America/Chicago'),
('Phoenix', 'United States', 'Arizona', 33.4484, -112.0740, 1680992, true, 'America/Phoenix'),
('Philadelphia', 'United States', 'Pennsylvania', 39.9526, -75.1652, 1584064, true, 'America/New_York'),
('San Antonio', 'United States', 'Texas', 29.4241, -98.4936, 1547253, true, 'America/Chicago'),
('San Diego', 'United States', 'California', 32.7157, -117.1611, 1423851, true, 'America/Los_Angeles'),
('Dallas', 'United States', 'Texas', 32.7767, -96.7970, 1343573, true, 'America/Chicago'),
('San Jose', 'United States', 'California', 37.3382, -121.8863, 1021795, true, 'America/Los_Angeles'),
('Toronto', 'Canada', 'Ontario', 43.6532, -79.3832, 2930000, true, 'America/Toronto'),
('Montreal', 'Canada', 'Quebec', 45.5017, -73.5673, 1704694, true, 'America/Toronto'),
('Vancouver', 'Canada', 'British Columbia', 49.2827, -123.1207, 631486, true, 'America/Vancouver'),
('London', 'United Kingdom', 'England', 51.5074, -0.1278, 9648110, true, 'Europe/London'),
('Berlin', 'Germany', 'Berlin', 52.5200, 13.4050, 3669491, true, 'Europe/Berlin'),
('Paris', 'France', 'Île-de-France', 48.8566, 2.3522, 2165423, true, 'Europe/Paris'),
('Madrid', 'Spain', 'Madrid', 40.4168, -3.7038, 3223334, true, 'Europe/Madrid'),
('Rome', 'Italy', 'Lazio', 41.9028, 12.4964, 2872800, true, 'Europe/Rome'),
('Tokyo', 'Japan', 'Tokyo', 35.6762, 139.6503, 13929286, true, 'Asia/Tokyo'),
('Seoul', 'South Korea', 'Seoul', 37.5665, 126.9780, 9733509, true, 'Asia/Seoul'),
('Sydney', 'Australia', 'New South Wales', -33.8688, 151.2093, 5312163, true, 'Australia/Sydney'),
('Melbourne', 'Australia', 'Victoria', -37.8136, 144.9631, 5078193, true, 'Australia/Melbourne')
ON CONFLICT DO NOTHING;

-- Create function to find nearest city using Haversine formula
CREATE OR REPLACE FUNCTION find_nearest_city(target_lat DECIMAL, target_lng DECIMAL, max_distance_km INTEGER DEFAULT 500)
RETURNS TABLE (
    city_name VARCHAR,
    country VARCHAR,
    state VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    population INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name,
        c.country,
        c.state,
        c.latitude,
        c.longitude,
        ROUND(
            CAST(
                6371 * acos(
                    cos(radians(target_lat)) *
                    cos(radians(c.latitude)) *
                    cos(radians(c.longitude) - radians(target_lng)) +
                    sin(radians(target_lat)) *
                    sin(radians(c.latitude))
                ) AS DECIMAL
            ), 2
        ) as distance_km,
        c.population
    FROM cities c
    WHERE (
        6371 * acos(
            cos(radians(target_lat)) *
            cos(radians(c.latitude)) *
            cos(radians(c.longitude) - radians(target_lng)) +
            sin(radians(target_lat)) *
            sin(radians(c.latitude))
        )
    ) <= max_distance_km
    ORDER BY (
        6371 * acos(
            cos(radians(target_lat)) *
            cos(radians(c.latitude)) *
            cos(radians(c.longitude) - radians(target_lng)) +
            sin(radians(target_lat)) *
            sin(radians(c.latitude))
        )
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;