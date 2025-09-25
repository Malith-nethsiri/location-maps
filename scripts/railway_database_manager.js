#!/usr/bin/env node
/**
 * Railway Database Manager
 * Comprehensive database management via Railway CLI
 *
 * Usage:
 *   railway run node scripts/railway_database_manager.js populate
 *   railway run node scripts/railway_database_manager.js verify
 *   railway run node scripts/railway_database_manager.js migrate
 *   railway run node scripts/railway_database_manager.js status
 */

const { populateCitiesDirectly } = require('./populate_cities_direct');
const { verifyDatabase } = require('./verify_database');

const COMMANDS = {
  populate: 'Populate database with 45+ Sri Lankan cities',
  verify: 'Verify database population and functions',
  migrate: 'Run all pending database migrations',
  status: 'Show database status and statistics',
  help: 'Show available commands'
};

async function showStatus() {
  console.log('🚂 Railway Database Manager - Status Check');
  console.log('==========================================');

  try {
    const { query, initializeDatabase } = require('../backend/config/database');
    await initializeDatabase();

    // Show database connection info
    console.log('📊 Database Connection: ✅ Connected');

    // Show environment info
    console.log('🌍 Environment Info:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Railway Project: ${process.env.RAILWAY_PROJECT_NAME || 'Unknown'}`);
    console.log(`   Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'Unknown'}`);

    // Show table statistics
    console.log('\n📋 Table Statistics:');

    const tables = ['cities', 'pois', 'user_queries', 'api_cache', 'migrations'];
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table}: ${count.toLocaleString()} records`);
      } catch (error) {
        console.log(`   ${table}: ❌ Table not found or error`);
      }
    }

    // Show Sri Lankan cities specifically
    try {
      const sriLankanResult = await query("SELECT COUNT(*) as count FROM cities WHERE country = 'Sri Lanka'");
      const sriLankanCount = parseInt(sriLankanResult.rows[0].count);
      console.log(`\n🇱🇰 Sri Lankan Cities: ${sriLankanCount}`);

      if (sriLankanCount >= 40) {
        console.log('   Status: ✅ Excellent coverage');
      } else if (sriLankanCount >= 20) {
        console.log('   Status: ⚠️ Good coverage');
      } else if (sriLankanCount >= 10) {
        console.log('   Status: ⚠️ Limited coverage');
      } else {
        console.log('   Status: ❌ Insufficient coverage - run populate command');
      }
    } catch (error) {
      console.log('\n🇱🇰 Sri Lankan Cities: ❌ Could not check');
    }

    // Show function availability
    console.log('\n🔧 Database Functions:');
    const functions = ['find_nearest_city', 'find_nearby_cities', 'get_cache_data', 'set_cache_data'];

    for (const func of functions) {
      try {
        const result = await query(`SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '${func}') as exists`);
        const exists = result.rows[0].exists;
        console.log(`   ${func}: ${exists ? '✅ Available' : '❌ Missing'}`);
      } catch (error) {
        console.log(`   ${func}: ❌ Error checking`);
      }
    }

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  }
}

async function runMigrations() {
  console.log('🚂 Railway Database Manager - Running Migrations');
  console.log('=================================================');

  try {
    const { runMigrations } = require('../backend/scripts/migrate');
    await runMigrations();
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log('🚂 Railway Database Manager');
  console.log('===========================\n');

  console.log('Usage:');
  console.log('  railway run node scripts/railway_database_manager.js <command>\n');

  console.log('Available Commands:');
  Object.entries(COMMANDS).forEach(([command, description]) => {
    console.log(`  ${command.padEnd(10)} - ${description}`);
  });

  console.log('\nNPM Script Shortcuts:');
  console.log('  npm run db:populate  - Populate database');
  console.log('  npm run db:verify    - Verify database');
  console.log('  npm run db:status    - Show status');
  console.log('  npm run db:migrate   - Run migrations');

  console.log('\nExample:');
  console.log('  railway run node scripts/railway_database_manager.js populate');
  console.log('  npm run db:populate');
}

async function main() {
  const command = process.argv[2];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  if (!COMMANDS[command]) {
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run with "help" to see available commands');
    process.exit(1);
  }

  console.log(`🚂 Railway Database Manager - ${command.toUpperCase()}`);
  console.log('='.repeat(50));

  try {
    switch (command) {
      case 'populate':
        await populateCitiesDirectly();
        break;

      case 'verify':
        await verifyDatabase();
        break;

      case 'migrate':
        await runMigrations();
        break;

      case 'status':
        await showStatus();
        break;

      default:
        console.error(`Command "${command}" not implemented`);
        process.exit(1);
    }

    console.log('\n✅ Operation completed successfully!');

  } catch (error) {
    console.error(`❌ Operation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  showStatus,
  runMigrations,
  showHelp
};