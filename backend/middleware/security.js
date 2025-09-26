const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');

class SecurityMiddleware {
  // Rate limiting configurations
  static createRateLimiter(options = {}) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
      }
    });
  }

  // Strict rate limiting for sensitive endpoints
  static createStrictRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // Limit each IP to 20 requests per 15 minutes
      message: {
        success: false,
        message: 'Too many requests for this resource, please try again later',
        errorCode: 'STRICT_RATE_LIMIT_EXCEEDED'
      }
    });
  }

  // AI enhancement rate limiting
  static createAIRateLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // Limit each IP to 50 AI requests per hour
      message: {
        success: false,
        message: 'AI enhancement quota exceeded, please try again later',
        errorCode: 'AI_RATE_LIMIT_EXCEEDED'
      }
    });
  }

  // Security headers
  static setupSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://maps.googleapis.com", "https://api.openai.com"]
        }
      },
      crossOriginEmbedderPolicy: false // Required for some mapping libraries
    });
  }

  // CORS configuration
  static setupCORS() {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://valuerpro.online',
      'https://www.valuerpro.online'
    ];

    return cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200
    });
  }

  // Request sanitization
  static sanitizeRequest(req, res, next) {
    // Remove potentially harmful characters from request body
    if (req.body) {
      req.body = SecurityMiddleware.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = SecurityMiddleware.sanitizeObject(req.query);
    }

    next();
  }

  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove script tags and potentially harmful content
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? SecurityMiddleware.sanitizeString(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = SecurityMiddleware.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  static sanitizeString(str) {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  // File upload security
  static validateFileUpload(allowedTypes = [], maxSize = 10 * 1024 * 1024) {
    return (req, res, next) => {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
          errorCode: 'NO_FILES_UPLOADED'
        });
      }

      const violations = [];

      for (const file of req.files) {
        // Check file size
        if (file.size > maxSize) {
          violations.push(`File ${file.originalname} exceeds maximum size of ${maxSize / (1024 * 1024)}MB`);
        }

        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
          violations.push(`File ${file.originalname} has invalid type. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Check for potentially malicious file names
        if (/[<>:"/\\|?*\x00-\x1F]/.test(file.originalname)) {
          violations.push(`File ${file.originalname} has invalid characters in filename`);
        }
      }

      if (violations.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'File validation failed',
          violations,
          errorCode: 'FILE_VALIDATION_FAILED'
        });
      }

      next();
    };
  }

  // API key validation
  static validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required',
        errorCode: 'MISSING_API_KEY'
      });
    }

    // Validate API key format and existence
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        errorCode: 'INVALID_API_KEY'
      });
    }

    next();
  }

  // Request logging for security monitoring
  static createSecurityLogger() {
    return morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms', {
      stream: {
        write: (message) => {
          // Log to both console and file in production
          console.log(message.trim());

          // In production, you might want to log to a file or external service
          if (process.env.NODE_ENV === 'production') {
            // Add your preferred logging service here (e.g., Winston, Bunyan)
          }
        }
      }
    });
  }

  // Session validation
  static validateSession(req, res, next) {
    // Check if session is valid and not expired
    if (req.user && req.user.sessionExpiry) {
      const now = new Date();
      const sessionExpiry = new Date(req.user.sessionExpiry);

      if (now > sessionExpiry) {
        return res.status(401).json({
          success: false,
          message: 'Session expired',
          errorCode: 'SESSION_EXPIRED'
        });
      }
    }

    next();
  }

  // Geographic bounds validation for Sri Lankan coordinates
  static validateSriLankanBounds(req, res, next) {
    const { latitude, longitude } = req.body.coordinates || req.body;

    if (latitude && longitude) {
      // Sri Lankan geographic bounds
      const SRI_LANKA_BOUNDS = {
        north: 9.8312,
        south: 5.9120,
        east: 81.8833,
        west: 79.6951
      };

      if (
        latitude < SRI_LANKA_BOUNDS.south ||
        latitude > SRI_LANKA_BOUNDS.north ||
        longitude < SRI_LANKA_BOUNDS.west ||
        longitude > SRI_LANKA_BOUNDS.east
      ) {
        return res.status(400).json({
          success: false,
          message: 'Coordinates must be within Sri Lankan territory',
          errorCode: 'INVALID_GEOGRAPHIC_BOUNDS',
          bounds: SRI_LANKA_BOUNDS
        });
      }
    }

    next();
  }
}

module.exports = SecurityMiddleware;