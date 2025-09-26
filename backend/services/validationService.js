const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

class ValidationService {
  // ===============================================
  // Core Validation Methods
  // ===============================================

  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));

      logger.warn('Validation errors:', { errors: errorMessages, path: req.path });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
    }
    next();
  }

  // ===============================================
  // GPS Coordinates Validation
  // ===============================================

  static validateCoordinates() {
    return [
      body('coordinates.latitude')
        .isFloat({ min: 5.5, max: 10.0 })
        .withMessage('Latitude must be between 5.5 and 10.0 (Sri Lanka bounds)'),
      body('coordinates.longitude')
        .isFloat({ min: 79.0, max: 82.0 })
        .withMessage('Longitude must be between 79.0 and 82.0 (Sri Lanka bounds)'),
    ];
  }

  static validateSeparateCoordinates() {
    return [
      body('latitude')
        .isFloat({ min: 5.5, max: 10.0 })
        .withMessage('Latitude must be between 5.5 and 10.0 (Sri Lanka bounds)'),
      body('longitude')
        .isFloat({ min: 79.0, max: 82.0 })
        .withMessage('Longitude must be between 79.0 and 82.0 (Sri Lanka bounds)'),
    ];
  }

  // ===============================================
  // User Profile Validation
  // ===============================================

  static validateUserProfile() {
    return [
      body('full_name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/)
        .withMessage('Full name can only contain letters, spaces, and periods'),

      body('email_address')
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),

      body('phone_number')
        .optional()
        .matches(/^(\+94|0)[1-9]\d{8}$/)
        .withMessage('Phone number must be a valid Sri Lankan number'),

      body('mobile_number')
        .matches(/^(\+94|0)7[0-9]\d{7}$/)
        .withMessage('Mobile number must be a valid Sri Lankan mobile number'),

      body('professional_title')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Professional title must be between 2 and 100 characters'),

      body('ivsl_registration')
        .optional()
        .matches(/^[A-Z0-9\/\-]+$/)
        .withMessage('IVSL registration must be in valid format'),

      body('qualifications_list')
        .isArray({ min: 1 })
        .withMessage('At least one qualification is required'),

      body('qualifications_list.*')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Each qualification must be between 1 and 50 characters'),
    ];
  }

  // ===============================================
  // Report Creation Validation
  // ===============================================

  static validateCreateReport() {
    return [
      body('user_id')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),

      body('instruction_source')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Instruction source must be between 2 and 200 characters'),

      body('valuation_purpose')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Valuation purpose must be between 10 and 500 characters'),

      body('report_type')
        .optional()
        .isIn(['mortgage', 'fair_value', 'insurance', 'investment'])
        .withMessage('Report type must be one of: mortgage, fair_value, insurance, investment'),

      body('client_organization')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Client organization must not exceed 200 characters'),
    ];
  }

  // ===============================================
  // Property Details Validation
  // ===============================================

  static validatePropertyDetails() {
    return [
      body('village_name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Village name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s\-']+$/)
        .withMessage('Village name can only contain letters, spaces, hyphens, and apostrophes'),

      body('district')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('District must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s\-']+$/)
        .withMessage('District can only contain letters, spaces, hyphens, and apostrophes'),

      body('province')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Province must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s\-']+$/)
        .withMessage('Province can only contain letters, spaces, hyphens, and apostrophes'),

      body('lot_number')
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage('Lot number must be between 1 and 20 characters')
        .matches(/^[A-Za-z0-9\-\/]+$/)
        .withMessage('Lot number can only contain letters, numbers, hyphens, and slashes'),

      body('plan_number')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Plan number must be between 1 and 100 characters'),

      body('current_owner')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Current owner must not exceed 200 characters'),
    ];
  }

  // ===============================================
  // Boundaries Validation
  // ===============================================

  static validateBoundaries() {
    return [
      body('north_boundary')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('North boundary must be between 3 and 200 characters'),

      body('south_boundary')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('South boundary must be between 3 and 200 characters'),

      body('east_boundary')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('East boundary must be between 3 and 200 characters'),

      body('west_boundary')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('West boundary must be between 3 and 200 characters'),

      body('total_extent')
        .trim()
        .matches(/^\d+(\.\d+)?\s*(perch|perches|acre|acres|hectare|hectares)$/i)
        .withMessage('Total extent must be in format "35.5 perches" or similar'),

      body('frontage_measurement')
        .optional()
        .trim()
        .matches(/^\d+(\.\d+)?\s*(feet|ft|meters|m)$/i)
        .withMessage('Frontage must be in format "60 feet" or "18.3 meters"'),

      body('access_road_type')
        .optional()
        .isIn(['motorable_road', 'gravel_road', 'cart_track', 'footpath'])
        .withMessage('Access road type must be valid option'),
    ];
  }

  // ===============================================
  // Land Description Validation
  // ===============================================

  static validateLandDescription() {
    return [
      body('land_shape')
        .isIn(['rectangular', 'square', 'irregular', 'triangular', 'L_shaped'])
        .withMessage('Land shape must be valid option'),

      body('topography_type')
        .isIn(['fairly_level', 'gently_sloping', 'moderately_sloping', 'steeply_sloping', 'undulating', 'terraced'])
        .withMessage('Topography type must be valid option'),

      body('soil_type')
        .isIn(['red_earth', 'clay', 'sandy', 'laterite', 'alluvial', 'rocky'])
        .withMessage('Soil type must be valid option'),

      body('land_use_type')
        .isIn(['residential', 'commercial', 'agricultural', 'industrial', 'mixed_residential', 'plantation'])
        .withMessage('Land use type must be valid option'),

      body('plantation_description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Plantation description must not exceed 1000 characters'),

      body('land_features')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Land features must not exceed 1000 characters'),
    ];
  }

  // ===============================================
  // Building Details Validation
  // ===============================================

  static validateBuildingDetails() {
    return [
      body('building_type')
        .optional()
        .isIn(['single_storied_house', 'two_storied_house', 'apartment', 'commercial_building', 'industrial_building', 'warehouse', 'mixed_use'])
        .withMessage('Building type must be valid option'),

      body('building_age')
        .optional()
        .isInt({ min: 0, max: 200 })
        .withMessage('Building age must be between 0 and 200 years'),

      body('condition_grade')
        .optional()
        .isIn(['excellent', 'very_good', 'good', 'fair', 'poor', 'dilapidated'])
        .withMessage('Condition grade must be valid option'),

      body('total_floor_area')
        .optional()
        .isFloat({ min: 1, max: 50000 })
        .withMessage('Total floor area must be between 1 and 50,000 sq ft'),

      body('bedrooms')
        .optional()
        .isInt({ min: 0, max: 20 })
        .withMessage('Number of bedrooms must be between 0 and 20'),

      body('roof_description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Roof description must not exceed 200 characters'),

      body('wall_description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Wall description must not exceed 200 characters'),

      body('floor_description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Floor description must not exceed 200 characters'),

      body('doors_windows')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Doors & windows description must not exceed 200 characters'),

      body('room_layout_description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Room layout description must not exceed 1000 characters'),

      body('building_conveniences')
        .optional()
        .isArray()
        .withMessage('Building conveniences must be an array'),

      body('building_conveniences.*')
        .isIn(['Electricity', 'Water Supply', 'Telephone', 'Internet', 'Sewerage', 'Solar Power', 'Generator', 'Security System'])
        .withMessage('Invalid convenience option'),
    ];
  }

  // ===============================================
  // Valuation Data Validation
  // ===============================================

  static validateValuation() {
    return [
      body('land_rate')
        .isFloat({ min: 1000, max: 10000000 })
        .withMessage('Land rate must be between Rs. 1,000 and Rs. 10,000,000 per perch'),

      body('market_value')
        .isFloat({ min: 100000, max: 1000000000 })
        .withMessage('Market value must be between Rs. 100,000 and Rs. 1,000,000,000'),

      body('forced_sale_value')
        .optional()
        .isFloat({ min: 50000, max: 1000000000 })
        .withMessage('Forced sale value must be between Rs. 50,000 and Rs. 1,000,000,000'),

      body('insurance_value')
        .optional()
        .isFloat({ min: 50000, max: 1000000000 })
        .withMessage('Insurance value must be between Rs. 50,000 and Rs. 1,000,000,000'),
    ];
  }

  // ===============================================
  // AI Enhancement Validation
  // ===============================================

  static validateAIEnhancement() {
    return [
      body('enhancement_type')
        .isIn(['route_enhancement', 'locality_analysis', 'market_analysis'])
        .withMessage('Enhancement type must be valid option'),

      body('input_data')
        .isObject()
        .withMessage('Input data must be an object'),

      body('input_data.coordinates')
        .optional()
        .isObject()
        .withMessage('Coordinates must be an object'),

      body('input_data.coordinates.latitude')
        .optional()
        .isFloat({ min: 5.5, max: 10.0 })
        .withMessage('Latitude must be within Sri Lankan bounds'),

      body('input_data.coordinates.longitude')
        .optional()
        .isFloat({ min: 79.0, max: 82.0 })
        .withMessage('Longitude must be within Sri Lankan bounds'),
    ];
  }

  // ===============================================
  // Report Management Validation
  // ===============================================

  static validateReportUpdate() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('Report ID must be a positive integer'),

      body('section')
        .isIn(['basic_info', 'property_location', 'legal_details', 'boundaries', 'land_description', 'building_details', 'valuation'])
        .withMessage('Section must be valid report section'),

      body('data')
        .isObject()
        .withMessage('Data must be an object'),
    ];
  }

  static validateReportStatus() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('Report ID must be a positive integer'),

      body('status')
        .isIn(['draft', 'in_progress', 'review', 'completed', 'finalized'])
        .withMessage('Status must be valid option'),
    ];
  }

  // ===============================================
  // Image Upload Validation
  // ===============================================

  static validateImageUpload() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('Report ID must be a positive integer'),

      body('category')
        .optional()
        .isIn(['land_views', 'building_exterior', 'building_interior', 'boundaries', 'location_maps'])
        .withMessage('Image category must be valid option'),

      body('caption')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Caption must not exceed 200 characters'),
    ];
  }

  // ===============================================
  // Query Parameter Validation
  // ===============================================

  static validatePagination() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be between 1 and 1000'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

      query('sort')
        .optional()
        .isIn(['created_at', 'updated_at', 'report_reference', 'status'])
        .withMessage('Sort field must be valid option'),

      query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be asc or desc'),
    ];
  }

  static validateDateRange() {
    return [
      query('start_date')
        .optional()
        .isISO8601()
        .withMessage('Start date must be valid ISO 8601 date'),

      query('end_date')
        .optional()
        .isISO8601()
        .withMessage('End date must be valid ISO 8601 date'),
    ];
  }

  // ===============================================
  // Custom Validation Functions
  // ===============================================

  static validateSriLankanLocation(fieldName) {
    return body(fieldName)
      .custom((value) => {
        // List of valid Sri Lankan districts
        const sriLankanDistricts = [
          'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
          'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
          'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
          'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
        ];

        if (fieldName.includes('district') && !sriLankanDistricts.includes(value)) {
          throw new Error(`${value} is not a valid Sri Lankan district`);
        }

        return true;
      });
  }

  static validateCurrency() {
    return body('amount')
      .isFloat({ min: 0 })
      .custom((value) => {
        if (value > 10000000000) { // 10 billion rupees
          throw new Error('Amount cannot exceed Rs. 10,000,000,000');
        }
        return true;
      });
  }

  static validateFileSize(maxSizeMB = 10) {
    return (req, res, next) => {
      if (req.files) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        const oversizedFiles = Object.values(req.files).flat().filter(
          file => file.size > maxSizeBytes
        );

        if (oversizedFiles.length > 0) {
          return res.status(400).json({
            success: false,
            message: `File size cannot exceed ${maxSizeMB}MB`,
            oversized_files: oversizedFiles.map(f => f.originalname)
          });
        }
      }
      next();
    };
  }

  // ===============================================
  // Sanitization Methods
  // ===============================================

  static sanitizeReportData(data) {
    const sanitized = {};

    // Remove any HTML tags
    const stripHtml = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/<[^>]*>/g, '').trim();
    };

    // Clean string fields
    const stringFields = [
      'instruction_source', 'valuation_purpose', 'village_name', 'district', 'province',
      'lot_number', 'plan_number', 'current_owner', 'north_boundary', 'south_boundary',
      'east_boundary', 'west_boundary', 'total_extent', 'frontage_measurement',
      'plantation_description', 'land_features', 'roof_description', 'wall_description',
      'floor_description', 'doors_windows', 'room_layout_description'
    ];

    stringFields.forEach(field => {
      if (data[field]) {
        sanitized[field] = stripHtml(data[field]);
      }
    });

    // Clean numeric fields
    const numericFields = [
      'latitude', 'longitude', 'building_age', 'total_floor_area', 'bedrooms',
      'land_rate', 'market_value', 'forced_sale_value', 'insurance_value'
    ];

    numericFields.forEach(field => {
      if (data[field] !== undefined) {
        const num = parseFloat(data[field]);
        if (!isNaN(num)) {
          sanitized[field] = num;
        }
      }
    });

    // Clean array fields
    if (data.building_conveniences && Array.isArray(data.building_conveniences)) {
      sanitized.building_conveniences = data.building_conveniences
        .map(item => stripHtml(item))
        .filter(item => item.length > 0);
    }

    return sanitized;
  }
}

module.exports = ValidationService;