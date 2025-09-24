const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Event listeners for pool
pool.on('connect', (client) => {
  logger.info('New database client connected');
});

pool.on('error', (err, client) => {
  logger.error('Database pool error:', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    logger.info('Database connection successful');

    // Test database connection
    const result = await client.query('SELECT version()');
    logger.info(`Database connected: PostgreSQL`);

    client.release();
  } catch (err) {
    logger.error('Database connection failed:', err);
    throw err;
  }
};

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await testConnection();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error:', { text, error: error.message });
    throw error;
  }
};

// Transaction helper function
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Cleanup function
const close = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

// Graceful shutdown
process.on('SIGINT', close);
process.on('SIGTERM', close);

module.exports = {
  pool,
  query,
  withTransaction,
  initializeDatabase,
  close,

  // Database helper functions
  helpers: {
    // Escape identifiers
    escapeIdentifier: (name) => pool.escapeIdentifier(name),

    // Escape literals
    escapeLiteral: (value) => pool.escapeLiteral(value),

    // Format query with parameters
    format: (query, values) => {
      let index = 0;
      return query.replace(/\$(\d+)/g, (match, number) => {
        index = parseInt(number, 10) - 1;
        return values[index] !== undefined ? pool.escapeLiteral(values[index]) : match;
      });
    }
  }
};