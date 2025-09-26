const logger = require('../utils/logger');
const monitoringService = require('../services/monitoringService');

// Custom error class for application-specific errors
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  PDF_GENERATION_ERROR: 'PDF_GENERATION_ERROR'
};

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, ErrorTypes.VALIDATION_ERROR);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.detail?.match(/(["'])(\\?.)*?\1/)?.[0] || 'unknown field';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400, ErrorTypes.DUPLICATE_ERROR);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, ErrorTypes.VALIDATION_ERROR);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401, ErrorTypes.AUTHENTICATION_ERROR);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401, ErrorTypes.AUTHENTICATION_ERROR);

const handleMulterError = (err) => {
  let message = 'File upload error';

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File too large. Maximum size is 10MB per file.';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files. Maximum 10 files allowed.';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected field name in file upload.';
      break;
    case 'LIMIT_PART_COUNT':
      message = 'Too many parts in multipart form.';
      break;
    default:
      message = err.message || 'File upload failed';
  }

  return new AppError(message, 400, ErrorTypes.FILE_UPLOAD_ERROR);
};

const handlePostgresError = (err) => {
  let message = 'Database operation failed';
  let statusCode = 500;
  let errorCode = ErrorTypes.DATABASE_ERROR;

  switch (err.code) {
    case '23505': // Unique violation
      message = 'This record already exists';
      statusCode = 409;
      errorCode = ErrorTypes.DUPLICATE_ERROR;
      break;
    case '23503': // Foreign key violation
      message = 'Referenced record does not exist';
      statusCode = 400;
      errorCode = ErrorTypes.VALIDATION_ERROR;
      break;
    case '23502': // Not null violation
      message = 'Required field is missing';
      statusCode = 400;
      errorCode = ErrorTypes.VALIDATION_ERROR;
      break;
    case '23514': // Check violation
      message = 'Data violates database constraints';
      statusCode = 400;
      errorCode = ErrorTypes.VALIDATION_ERROR;
      break;
    case '42P01': // Undefined table
      message = 'Database table not found';
      statusCode = 500;
      break;
    case '42703': // Undefined column
      message = 'Database column not found';
      statusCode = 500;
      break;
    default:
      if (err.message?.includes('duplicate key')) {
        message = 'This record already exists';
        statusCode = 409;
        errorCode = ErrorTypes.DUPLICATE_ERROR;
      }
  }

  return new AppError(message, statusCode, errorCode, {
    postgres_code: err.code,
    constraint: err.constraint,
    table: err.table,
    column: err.column
  });
};

// Send error response for development
const sendErrorDev = (err, req, res) => {
  // Log to monitoring service
  monitoringService.logError({
    ...err,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    type: err.errorCode || 'DEVELOPMENT_ERROR'
  });

  logger.error('Error in development:', {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  return res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    errorCode: err.errorCode,
    details: err.details,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
};

// Send error response for production
const sendErrorProd = (err, req, res) => {
  // Log to monitoring service with enhanced context
  monitoringService.logError({
    ...err,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    type: err.isOperational ? err.errorCode || 'OPERATIONAL_ERROR' : 'CRITICAL_ERROR'
  });

  // Log error details for internal tracking
  logger.error('Production error:', {
    message: err.message,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.id,
    isOperational: err.isOperational,
    stack: err.stack
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      details: err.details,
      timestamp: new Date().toISOString()
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);

  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again later.',
    errorCode: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);
    if (error.code && error.code.match(/^[0-9A-Z]{5}$/)) error = handlePostgresError(error);

    // Google API errors
    if (error.response && error.response.data) {
      const message = error.response.data.error_message || 'External API error';
      error = new AppError(message, error.response.status || 500, ErrorTypes.EXTERNAL_API_ERROR);
    }

    sendErrorProd(error, req, res);
  }
};

// Async error wrapper to catch errors in async functions
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
const handleNotFound = (req, res, next) => {
  const err = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
    ErrorTypes.NOT_FOUND_ERROR,
    {
      url: req.originalUrl,
      method: req.method,
      available_endpoints: [
        'GET /api/reports',
        'POST /api/reports/create-from-coordinates',
        'GET /api/reports/:id',
        'PUT /api/reports/:id/section/:section',
        'POST /api/reports/:id/images',
        'GET /api/reports/:id/preview',
        'POST /api/reports/:id/finalize'
      ]
    }
  );
  next(err);
};

// Business logic error handlers
const ValidationError = (message, field = null) => {
  return new AppError(message, 400, ErrorTypes.VALIDATION_ERROR, { field });
};

const AuthenticationError = (message = 'Authentication failed') => {
  return new AppError(message, 401, ErrorTypes.AUTHENTICATION_ERROR);
};

const AuthorizationError = (message = 'You do not have permission to perform this action') => {
  return new AppError(message, 403, ErrorTypes.AUTHORIZATION_ERROR);
};

const NotFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404, ErrorTypes.NOT_FOUND_ERROR);
};

const DuplicateError = (resource = 'Resource') => {
  return new AppError(`${resource} already exists`, 409, ErrorTypes.DUPLICATE_ERROR);
};

const ExternalAPIError = (service, message) => {
  return new AppError(
    `External service error: ${service} - ${message}`,
    502,
    ErrorTypes.EXTERNAL_API_ERROR,
    { service }
  );
};

const AIServiceError = (message) => {
  return new AppError(
    `AI service error: ${message}`,
    503,
    ErrorTypes.AI_SERVICE_ERROR
  );
};

const PDFGenerationError = (message) => {
  return new AppError(
    `PDF generation error: ${message}`,
    500,
    ErrorTypes.PDF_GENERATION_ERROR
  );
};

// Legacy export for backward compatibility
const errorHandler = globalErrorHandler;

module.exports = {
  AppError,
  ErrorTypes,
  globalErrorHandler,
  errorHandler, // Legacy compatibility
  catchAsync,
  handleNotFound,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DuplicateError,
  ExternalAPIError,
  AIServiceError,
  PDFGenerationError
};