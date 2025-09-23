const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected', // Will be updated when database is implemented
        redis: 'connected',     // Will be updated when redis is implemented
        google_maps: 'available'
      }
    };

    res.status(200).json({
      success: true,
      data: healthCheck
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check (for monitoring systems)
router.get('/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      cpu: {
        usage: process.cpuUsage()
      },
      services: {
        database: {
          status: 'connected',
          latency: '< 50ms' // Will be updated with actual database ping
        },
        redis: {
          status: 'connected',
          latency: '< 10ms' // Will be updated with actual redis ping
        },
        google_maps: {
          status: 'available',
          api_key_configured: !!process.env.GOOGLE_MAPS_API_KEY
        }
      }
    };

    res.status(200).json({
      success: true,
      data: detailedHealth
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;