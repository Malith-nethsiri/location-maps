#!/usr/bin/env node

/**
 * PostGIS Setup Script for Railway PostgreSQL
 * Run this separately when PostGIS extension becomes available
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ No database connection string found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const postgisSchema = `
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to cities table
ALTER TABLE cities ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);

-- Update geometry column for existing records
UPDATE cities SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

-- Add spatial indexes
CREATE INDEX IF NOT EXISTS idx_cities_geom ON cities USING GIST (geom);

-- Add geometry column to pois table if needed
ALTER TABLE pois ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);

-- Update geometry for POIs
UPDATE pois SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

-- Add spatial index for POIs
CREATE INDEX IF NOT EXISTS idx_pois_geom ON pois USING GIST (geom);
`;

async function setupPostGIS() {
  console.log('🗺️ Setting up PostGIS extension...');

  try {
    const client = await pool.connect();

    try {
      await client.query(postgisSchema);
      console.log('✅ PostGIS setup completed successfully!');
      console.log('✅ Geometry columns and spatial indexes created');
    } catch (error) {
      console.error('❌ PostGIS setup failed:', error.message);
      if (error.message.includes('extension "postgis" is not available')) {
        console.log('💡 PostGIS extension is not available on this PostgreSQL instance');
        console.log('💡 Contact Railway support or use a PostGIS-enabled database');
      }
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

if (require.main === module) {
  setupPostGIS()
    .then(() => {
      console.log('🎉 PostGIS setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 PostGIS setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupPostGIS };