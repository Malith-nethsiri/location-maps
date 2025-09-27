require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');

// Import route handlers
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/location');
const poiRoutes = require('./routes/poi');
const navigationRoutes = require('./routes/navigation');
const healthRoutes = require('./routes/health');
const reportsRoutes = require('./routes/reports');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { validateRequest } = require('./middleware/validateRequest');
const SecurityMiddleware = require('./middleware/security');
const monitoringService = require('./services/monitoringService');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment (fixes rate limiting issues)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Enhanced security middleware
app.use(SecurityMiddleware.setupSecurityHeaders());
app.use(SecurityMiddleware.setupCORS());
app.use(SecurityMiddleware.createSecurityLogger());

// Request monitoring and tracking
app.use(monitoringService.trackRequest.bind(monitoringService));

// Request sanitization
app.use(SecurityMiddleware.sanitizeRequest);

// Rate limiting with different tiers
app.use('/api/', SecurityMiddleware.createRateLimiter());
app.use('/api/reports/enhance-content', SecurityMiddleware.createAIRateLimiter());
app.use('/api/health/metrics', SecurityMiddleware.createStrictRateLimiter());
app.use('/api/health/alerts', SecurityMiddleware.createStrictRateLimiter());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving for uploaded images
app.use('/uploads', express.static('uploads'));

// Compression middleware
app.use(compression());

// Additional middleware for enhanced security
app.use('/api/reports', SecurityMiddleware.validateSriLankanBounds);

// Log monitoring metrics for audit trail
app.use((req, res, next) => {
  res.on('finish', () => {
    // Log sensitive operations for audit
    if (req.method !== 'GET' && req.user?.id) {
      monitoringService.logAudit(
        `${req.method} ${req.path}`,
        req.user.id,
        {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      );
    }
  });
  next();
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/reports', reportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Location Intelligence API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Location Intelligence API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
}

module.exports = app;