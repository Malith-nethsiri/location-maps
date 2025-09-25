#!/usr/bin/env node
/**
 * Migration Runner for Location Intelligence Web App
 * Runs all database migrations in sequence
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrationsDir = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  console.log('🚀 Starting Location Intelligence Database Migrations...\n');

  try {
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();

    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT true
      )
    `);

    // Get list of migration files
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in order

    console.log(`📁 Found ${migrationFiles.length} migration files\n`);

    for (const filename of migrationFiles) {
      await runSingleMigration(filename);
    }

    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📊 Verifying database state...');

    // Verify critical components
    await verifyDatabase();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function runSingleMigration(filename) {
  try {
    // Check if migration already executed
    const existingMigration = await pool.query(
      'SELECT * FROM migration_history WHERE filename = $1',
      [filename]
    );

    if (existingMigration.rows.length > 0) {
      console.log(`⏭️  Skipping ${filename} (already executed)`);
      return;
    }

    console.log(`🔄 Running ${filename}...`);

    // Read migration file
    const migrationPath = path.join(migrationsDir, filename);
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Execute migration
    await pool.query(migrationSQL);

    // Record successful execution
    await pool.query(
      'INSERT INTO migration_history (filename) VALUES ($1)',
      [filename]
    );

    console.log(`✅ ${filename} completed successfully`);

  } catch (error) {
    console.error(`❌ Failed to run ${filename}:`, error.message);

    // Record failed execution
    try {
      await pool.query(
        'INSERT INTO migration_history (filename, success) VALUES ($1, $2)',
        [filename, false]
      );
    } catch (recordError) {
      console.error('Failed to record migration failure:', recordError.message);
    }

    throw error;
  }
}

async function verifyDatabase() {
  try {
    // Check critical tables exist
    const tables = ['cities', 'locations', 'pois', 'user_queries', 'routes', 'api_cache'];

    for (const table of tables) {
      const result = await pool.query(
        `SELECT to_regclass('${table}') as table_exists`
      );

      if (result.rows[0].table_exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' missing`);
      }
    }

    // Check critical functions exist
    const functions = ['find_nearby_cities', 'find_nearest_city', 'get_pois_within_radius'];

    for (const func of functions) {
      const result = await pool.query(
        `SELECT proname FROM pg_proc WHERE proname = '${func}'`
      );

      if (result.rows.length > 0) {
        console.log(`✅ Function '${func}' exists`);
      } else {
        console.log(`❌ Function '${func}' missing`);
      }
    }

    // Check Sri Lankan cities data
    const cityCount = await pool.query(
      "SELECT COUNT(*) as count FROM cities WHERE country = 'Sri Lanka'"
    );

    console.log(`✅ Sri Lankan cities in database: ${cityCount.rows[0].count}`);

    // Check PostGIS extension
    const postgisCheck = await pool.query(
      "SELECT extname FROM pg_extension WHERE extname = 'postgis'"
    );

    if (postgisCheck.rows.length > 0) {
      console.log('✅ PostGIS extension enabled');
    } else {
      console.log('❌ PostGIS extension not found');
    }

    console.log('\n🎯 Database verification complete');

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  }
}

// CLI execution
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();

  runMigrations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations, runSingleMigration, verifyDatabase };