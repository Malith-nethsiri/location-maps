const { validationResult } = require('express-validator');

const validateRequest = (schema) => {
  // If called with a schema parameter, return a middleware function
  if (schema) {
    return (req, res, next) => {
      // For now, just pass through - schema validation can be implemented later
      // This prevents the "next is not a function" error
      next();
    };
  }

  // If used as direct middleware (express-validator pattern)
  return (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }

    next();
  };
};

// Dummy schemas for compatibility with existing routes
const schemas = {
  locationAnalysis: {},
  coordinates: {},
  navigationRequest: {},
  reportCreation: {},
  reportUpdate: {}
};

module.exports = { validateRequest, schemas };