const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const monitoringService = require('../services/monitoringService');
const SecurityMiddleware = require('../middleware/security');
const { Pool } = require('pg');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = monitoringService.getHealthStatus();

    // Test database connection
    let dbStatus = 'unknown';
    let dbLatency = null;
    try {
      const start = Date.now();
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
      await pool.query('SELECT 1');
      dbLatency = Date.now() - start;
      await pool.end();
      dbStatus = 'healthy';
    } catch (dbError) {
      dbStatus = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Test AI service availability
    let aiStatus = 'unknown';
    try {
      const aiService = require('../services/aiService');
      aiStatus = aiService.isAvailable() ? 'available' : 'unavailable';
    } catch (aiError) {
      aiStatus = 'error';
    }

    const healthCheck = {
      ...health,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbStatus,
        ai: aiStatus,
        monitoring: 'active',
        google_maps: !!process.env.GOOGLE_MAPS_API_KEY ? 'available' : 'not_configured'
      },
      latency: {
        database: dbLatency ? `${dbLatency}ms` : 'unknown'
      }
    };

    res.status(health.status === 'healthy' ? 200 : 503).json({
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
    const health = monitoringService.getHealthStatus();
    const metrics = monitoringService.getMetrics();

    // Test database connection with detailed timing
    let dbStatus = 'unknown';
    let dbLatency = null;
    let dbVersion = null;
    try {
      const start = Date.now();
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
      const result = await pool.query('SELECT version() as version');
      dbLatency = Date.now() - start;
      dbVersion = result.rows[0]?.version?.split(' ')[1] || 'unknown';
      await pool.end();
      dbStatus = 'healthy';
    } catch (dbError) {
      dbStatus = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Test AI service with connection test
    let aiStatus = 'unknown';
    let aiModel = null;
    try {
      const aiService = require('../services/aiService');
      if (aiService.isAvailable()) {
        const testResult = await aiService.testConnection();
        aiStatus = testResult.success ? 'healthy' : 'error';
        aiModel = testResult.model || 'unknown';
      } else {
        aiStatus = 'unavailable';
      }
    } catch (aiError) {
      aiStatus = 'error';
    }

    const detailedHealth = {
      ...health,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      },
      cpu: {
        usage: process.cpuUsage(),
        platform: process.platform,
        architecture: process.arch
      },
      services: {
        database: {
          status: dbStatus,
          latency: dbLatency ? `${dbLatency}ms` : 'unknown',
          version: dbVersion
        },
        ai: {
          status: aiStatus,
          model: aiModel,
          configured: !!process.env.OPENAI_API_KEY
        },
        google_maps: {
          status: !!process.env.GOOGLE_MAPS_API_KEY ? 'available' : 'not_configured',
          api_key_configured: !!process.env.GOOGLE_MAPS_API_KEY
        },
        monitoring: {
          status: 'active',
          alerts: metrics.alerts.length,
          performance: metrics.performance
        }
      }
    };

    res.status(health.status === 'healthy' ? 200 : 503).json({
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

// Metrics endpoint (protected)
router.get('/metrics', SecurityMiddleware.validateApiKey, (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics',
      error: error.message
    });
  }
});

// Alerts endpoint (protected)
router.get('/alerts', SecurityMiddleware.validateApiKey, (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const unacknowledgedAlerts = metrics.alerts || [];

    res.json({
      success: true,
      data: {
        alerts: unacknowledgedAlerts,
        count: unacknowledgedAlerts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts',
      error: error.message
    });
  }
});

// Acknowledge alert endpoint (protected)
router.post('/alerts/:alertId/acknowledge', SecurityMiddleware.validateApiKey, (req, res) => {
  try {
    const { alertId } = req.params;
    monitoringService.acknowledgeAlert(parseInt(alertId));

    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message
    });
  }
});

// Generate daily report endpoint (protected)
router.post('/reports/daily', SecurityMiddleware.validateApiKey, async (req, res) => {
  try {
    const report = await monitoringService.generateDailyReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report',
      error: error.message
    });
  }
});

// API usage statistics
router.get('/stats', SecurityMiddleware.validateApiKey, (req, res) => {
  try {
    const { performance, ai, pdf } = monitoringService.getMetrics();

    res.json({
      success: true,
      data: {
        requests: {
          total: performance.totalRequests,
          errors: performance.totalErrors,
          errorRate: performance.errorRate,
          avgResponseTime: performance.avgResponseTime
        },
        ai: {
          requests: ai.totalRequests,
          totalCost: ai.totalCost,
          avgCostPerRequest: ai.totalRequests > 0 ? (ai.totalCost / ai.totalRequests).toFixed(4) : 0
        },
        pdf: {
          generations: pdf.totalGenerations
        },
        period: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API statistics',
      error: error.message
    });
  }
});

module.exports = router;