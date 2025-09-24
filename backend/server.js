require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const logger = require('./utils/logger');

// Import route handlers
const locationRoutes = require('./routes/location');
const poiRoutes = require('./routes/poi');
const navigationRoutes = require('./routes/navigation');
const healthRoutes = require('./routes/health');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const validateRequest = require('./middleware/validateRequest');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    const allowedPatterns = [
      /^http:\/\/localhost:(3000|3001)$/,
      /^https:\/\/location-maps.*\.vercel\.app$/,
      /^https:\/\/.*-malith-vihangas-projects\.vercel\.app$/,
    ];

    // Check specific allowed origins
    const allowedOrigins = [
      'https://location-maps-pi.vercel.app',
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    // Remove trailing slashes for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');

    // Check exact matches first
    if (allowedOrigins.some(allowed => normalizedOrigin === allowed.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    // Check pattern matches
    if (allowedPatterns.some(pattern => pattern.test(normalizedOrigin))) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/navigation', navigationRoutes);

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