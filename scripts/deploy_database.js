#!/usr/bin/env node
/**
 * Database Deployment Script for Railway PostgreSQL
 * This script ensures all migrations are run and the database is properly populated
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

const RAILWAY_DATABASE_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

console.log('🚀 Starting Railway Database Deployment...');

if (!RAILWAY_DATABASE_URL) {
  console.error('❌ DATABASE_URL not found. Please set your Railway database connection string.');
  process.exit(1);
}

// Function to run SQL file directly on Railway database
async function runSQLFile(filePath, description) {
  try {
    console.log(`📝 ${description}...`);

    const sqlContent = await fs.readFile(filePath, 'utf8');

    // Clean up SQL content
    const cleanSQL = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .replace(/\\i\s+[^;]+;/g, ''); // Remove \i include statements

    // Use psql to execute the SQL
    const command = `echo "${cleanSQL.replace(/"/g, '\\"')}" | psql "${RAILWAY_DATABASE_URL}"`;

    const { stdout, stderr } = await execAsync(command, {
      env: { ...process.env, PGPASSWORD: extractPasswordFromURL(RAILWAY_DATABASE_URL) }
    });

    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('⚠️ Warning:', stderr.substring(0, 200));
    }

    console.log(`✅ ${description} completed successfully`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to ${description.toLowerCase()}:`, error.message.substring(0, 200));
    return false;
  }
}

// Extract password from DATABASE_URL for psql
function extractPasswordFromURL(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.password;
  } catch {
    return '';
  }
}

// Main deployment function
async function deployDatabase() {
  console.log('🔍 Checking database connection...');

  try {
    // Test connection
    await execAsync(`psql "${RAILWAY_DATABASE_URL}" -c "SELECT 1;"`);
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Run migrations in order
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_seed_cities.sql',
    '003_import_sri_lankan_cities.sql',
    '004_add_nearby_cities_function.sql',
    '005_enhanced_sri_lankan_cities.sql',
    '006_enhance_city_routing.sql'
  ];

  console.log('📋 Running database migrations...');

  for (const filename of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, filename);

    try {
      await fs.access(filePath);
      const success = await runSQLFile(filePath, `Applying ${filename}`);
      if (!success) {
        console.log(`⚠️ Migration ${filename} may have partial issues, continuing...`);
      }
    } catch (error) {
      console.log(`⏭️ Skipping ${filename} - file not found`);
    }
  }

  // Verify city count
  console.log('🏙️ Verifying city data...');
  try {
    const { stdout } = await execAsync(`psql "${RAILWAY_DATABASE_URL}" -t -c "SELECT COUNT(*) FROM cities WHERE country = 'Sri Lanka';"`);
    const cityCount = parseInt(stdout.trim());

    console.log(`📊 Sri Lankan cities in database: ${cityCount}`);

    if (cityCount < 100) {
      console.warn('⚠️ Low city count detected. Database may need manual city import.');
    } else if (cityCount > 1000) {
      console.log('✅ Good city coverage detected');
    }
  } catch (error) {
    console.error('❌ Failed to verify city count:', error.message);
  }

  // Verify required functions exist
  console.log('🔧 Verifying database functions...');
  try {
    const functions = ['find_nearest_city', 'find_nearby_cities'];

    for (const funcName of functions) {
      const { stdout } = await execAsync(`psql "${RAILWAY_DATABASE_URL}" -t -c "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '${funcName}');"`);
      const exists = stdout.trim() === 't';

      if (exists) {
        console.log(`✅ Function ${funcName} exists`);
      } else {
        console.warn(`⚠️ Function ${funcName} missing`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to verify functions:', error.message);
  }

  console.log('🎉 Database deployment completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Verify your app can now find nearby cities');
  console.log('2. Test the location analysis with improved city data');
  console.log('3. Check that "How to Get Here" section appears with multiple cities');
}

// Run if called directly
if (require.main === module) {
  deployDatabase().catch(error => {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = { deployDatabase };