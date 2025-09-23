#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { query, initializeDatabase, close } = require('../config/database');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'database', 'migrations');

// Migration tracking table
const createMigrationsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(createTableQuery);
    logger.info('Migrations table created or already exists');
  } catch (error) {
    logger.error('Failed to create migrations table:', error);
    throw error;
  }
};

// Get list of applied migrations
const getAppliedMigrations = async () => {
  try {
    const result = await query('SELECT filename FROM migrations ORDER BY filename');
    return result.rows.map(row => row.filename);
  } catch (error) {
    logger.error('Failed to get applied migrations:', error);
    return [];
  }
};

// Get list of migration files
const getMigrationFiles = async () => {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order
  } catch (error) {
    logger.error('Failed to read migrations directory:', error);
    throw error;
  }
};

// Apply a single migration
const applyMigration = async (filename) => {
  const filePath = path.join(MIGRATIONS_DIR, filename);

  try {
    logger.info(`Applying migration: ${filename}`);

    // Read migration file
    const migrationSQL = await fs.readFile(filePath, 'utf8');

    // Execute migration
    await query(migrationSQL);

    // Record migration as applied
    await query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      [filename]
    );

    logger.info(`Migration applied successfully: ${filename}`);
  } catch (error) {
    logger.error(`Failed to apply migration ${filename}:`, error);
    throw error;
  }
};

// Run pending migrations
const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');

    // Initialize database connection
    await initializeDatabase();

    // Create migrations table if it doesn't exist
    await createMigrationsTable();

    // Get applied migrations and available migration files
    const [appliedMigrations, migrationFiles] = await Promise.all([
      getAppliedMigrations(),
      getMigrationFiles()
    ]);

    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations found');
      return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migrations`);

    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }

    logger.info('All migrations completed successfully');

  } catch (error) {
    logger.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await close();
  }
};

// Rollback last migration (for development use)
const rollbackLastMigration = async () => {
  try {
    logger.info('Rolling back last migration...');

    await initializeDatabase();

    // Get the last applied migration
    const result = await query(
      'SELECT filename FROM migrations ORDER BY applied_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].filename;

    // Remove from migrations table
    await query('DELETE FROM migrations WHERE filename = $1', [lastMigration]);

    logger.warn(`Rolled back migration: ${lastMigration}`);
    logger.warn('Note: This only removes the migration record. You may need to manually undo schema changes.');

  } catch (error) {
    logger.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await close();
  }
};

// Show migration status
const showMigrationStatus = async () => {
  try {
    await initializeDatabase();
    await createMigrationsTable();

    const [appliedMigrations, migrationFiles] = await Promise.all([
      getAppliedMigrations(),
      getMigrationFiles()
    ]);

    console.log('\n=== Migration Status ===');

    for (const file of migrationFiles) {
      const status = appliedMigrations.includes(file) ? '✅ Applied' : '⏳ Pending';
      console.log(`${status}: ${file}`);
    }

    const pendingCount = migrationFiles.filter(file => !appliedMigrations.includes(file)).length;
    console.log(`\nTotal migrations: ${migrationFiles.length}`);
    console.log(`Applied: ${appliedMigrations.length}`);
    console.log(`Pending: ${pendingCount}`);

  } catch (error) {
    logger.error('Failed to show migration status:', error);
    process.exit(1);
  } finally {
    await close();
  }
};

// Command line interface
const main = async () => {
  const command = process.argv[2];

  switch (command) {
    case 'up':
    case undefined:
      await runMigrations();
      break;

    case 'down':
      await rollbackLastMigration();
      break;

    case 'status':
      await showMigrationStatus();
      break;

    default:
      console.log('Usage: node migrate.js [up|down|status]');
      console.log('  up     - Apply pending migrations (default)');
      console.log('  down   - Rollback last migration');
      console.log('  status - Show migration status');
      process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigrations,
  rollbackLastMigration,
  showMigrationStatus
};