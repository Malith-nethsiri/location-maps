const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    next();
  };
};

// Common validation schemas
const schemas = {
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }),

  locationAnalysis: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(100).max(50000).default(5000), // 100m to 50km
    includeCategories: Joi.array().items(
      Joi.string().valid(
        'school',
        'hospital',
        'government',
        'religious',
        'store',
        'restaurant',
        'gas_station',
        'bank',
        'pharmacy',
        'police'
      )
    ).default(['school', 'hospital', 'government', 'religious', 'store'])
  }),

  navigationRequest: Joi.object({
    origin: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    destination: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    travelMode: Joi.string().valid('DRIVE', 'WALK', 'BICYCLE', 'TRANSIT').default('DRIVE'),
    units: Joi.string().valid('metric', 'imperial').default('metric')
  })
};

module.exports = { validateRequest, schemas };