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
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add missing columns to cities table
ALTER TABLE cities ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS population_tier VARCHAR(50);

-- Update geom column for existing records
UPDATE cities SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;

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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_cities_geom ON cities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_cities_district ON cities (district);
CREATE INDEX IF NOT EXISTS idx_cities_province ON cities (province);
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache (expires_at);
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