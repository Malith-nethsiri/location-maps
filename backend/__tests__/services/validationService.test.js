const ValidationService = require('../../services/validationService');
const { validationResult } = require('express-validator');
const { testData } = require('../setup');

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    isFloat: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isArray: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isObject: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  param: jest.fn(() => ({
    isInt: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  query: jest.fn(() => ({
    optional: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn()
}));

describe('Validation Service', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      path: '/test'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should handle validation errors', () => {
      const mockErrors = {
        isEmpty: () => false,
        array: () => [
          { path: 'email', msg: 'Invalid email', value: 'invalid' },
          { path: 'name', msg: 'Name too short', value: 'a' }
        ]
      };

      validationResult.mockReturnValue(mockErrors);

      ValidationService.handleValidationErrors(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email', value: 'invalid' },
          { field: 'name', message: 'Name too short', value: 'a' }
        ]
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when no validation errors', () => {
      const mockErrors = {
        isEmpty: () => true,
        array: () => []
      };

      validationResult.mockReturnValue(mockErrors);

      ValidationService.handleValidationErrors(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Coordinate Validation', () => {
    it('should create coordinate validation rules', () => {
      const rules = ValidationService.validateCoordinates();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(2);
    });

    it('should create separate coordinate validation rules', () => {
      const rules = ValidationService.validateSeparateCoordinates();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(2);
    });
  });

  describe('User Profile Validation', () => {
    it('should create user profile validation rules', () => {
      const rules = ValidationService.validateUserProfile();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(5);
    });
  });

  describe('Report Creation Validation', () => {
    it('should create report creation validation rules', () => {
      const rules = ValidationService.validateCreateReport();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(3);
    });
  });

  describe('Property Details Validation', () => {
    it('should create property details validation rules', () => {
      const rules = ValidationService.validatePropertyDetails();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(5);
    });
  });

  describe('Boundaries Validation', () => {
    it('should create boundaries validation rules', () => {
      const rules = ValidationService.validateBoundaries();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(4);
    });
  });

  describe('Land Description Validation', () => {
    it('should create land description validation rules', () => {
      const rules = ValidationService.validateLandDescription();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(4);
    });
  });

  describe('Building Details Validation', () => {
    it('should create building details validation rules', () => {
      const rules = ValidationService.validateBuildingDetails();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(8);
    });
  });

  describe('Valuation Validation', () => {
    it('should create valuation validation rules', () => {
      const rules = ValidationService.validateValuation();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(2);
    });
  });

  describe('AI Enhancement Validation', () => {
    it('should create AI enhancement validation rules', () => {
      const rules = ValidationService.validateAIEnhancement();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(3);
    });
  });

  describe('Report Management Validation', () => {
    it('should create report update validation rules', () => {
      const rules = ValidationService.validateReportUpdate();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(3);
    });

    it('should create report status validation rules', () => {
      const rules = ValidationService.validateReportStatus();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(2);
    });
  });

  describe('Image Upload Validation', () => {
    it('should create image upload validation rules', () => {
      const rules = ValidationService.validateImageUpload();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(3);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should create pagination validation rules', () => {
      const rules = ValidationService.validatePagination();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(4);
    });

    it('should create date range validation rules', () => {
      const rules = ValidationService.validateDateRange();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(2);
    });
  });

  describe('Custom Validation Functions', () => {
    it('should validate Sri Lankan districts', () => {
      const validator = ValidationService.validateSriLankanLocation('district');

      expect(validator).toBeDefined();
    });

    it('should validate currency amounts', () => {
      const validator = ValidationService.validateCurrency();

      expect(validator).toBeDefined();
    });
  });

  describe('File Size Validation', () => {
    it('should validate file sizes within limit', () => {
      mockReq.files = [
        { size: 5 * 1024 * 1024, originalname: 'test1.jpg' }, // 5MB
        { size: 3 * 1024 * 1024, originalname: 'test2.jpg' }  // 3MB
      ];

      const middleware = ValidationService.validateFileSize(10);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject files exceeding size limit', () => {
      mockReq.files = [
        { size: 15 * 1024 * 1024, originalname: 'large.jpg' } // 15MB
      ];

      const middleware = ValidationService.validateFileSize(10);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File size cannot exceed 10MB',
        oversized_files: ['large.jpg']
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle requests without files', () => {
      const middleware = ValidationService.validateFileSize(10);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize report data correctly', () => {
      const dirtyData = {
        instruction_source: '<script>alert("xss")</script>Test Bank',
        valuation_purpose: 'Mortgage <b>evaluation</b>',
        latitude: '7.8731',
        longitude: '80.7718',
        building_age: '15',
        total_floor_area: '1500.5',
        building_conveniences: ['Electricity', 'Water Supply', '', '<script>'],
        unknown_field: 'should be ignored'
      };

      const sanitized = ValidationService.sanitizeReportData(dirtyData);

      expect(sanitized.instruction_source).toBe('Test Bank');
      expect(sanitized.valuation_purpose).toBe('Mortgage evaluation');
      expect(sanitized.latitude).toBe(7.8731);
      expect(sanitized.longitude).toBe(80.7718);
      expect(sanitized.building_age).toBe(15);
      expect(sanitized.total_floor_area).toBe(1500.5);
      expect(sanitized.building_conveniences).toEqual(['Electricity', 'Water Supply']);
      expect(sanitized.unknown_field).toBeUndefined();
    });

    it('should handle missing or invalid data', () => {
      const incompleteData = {
        instruction_source: '',
        latitude: 'invalid',
        building_conveniences: null
      };

      const sanitized = ValidationService.sanitizeReportData(incompleteData);

      expect(sanitized.instruction_source).toBe('');
      expect(sanitized.latitude).toBeUndefined();
      expect(sanitized.building_conveniences).toBeUndefined();
    });

    it('should preserve valid numeric values', () => {
      const numericData = {
        latitude: 7.8731,
        longitude: 80.7718,
        building_age: 0,
        total_floor_area: 1500.75
      };

      const sanitized = ValidationService.sanitizeReportData(numericData);

      expect(sanitized.latitude).toBe(7.8731);
      expect(sanitized.longitude).toBe(80.7718);
      expect(sanitized.building_age).toBe(0);
      expect(sanitized.total_floor_area).toBe(1500.75);
    });

    it('should clean array fields properly', () => {
      const dataWithArrays = {
        building_conveniences: [
          'Electricity',
          '<script>alert("xss")</script>',
          'Water Supply',
          '',
          'Internet'
        ]
      };

      const sanitized = ValidationService.sanitizeReportData(dataWithArrays);

      expect(sanitized.building_conveniences).toEqual([
        'Electricity',
        'alert("xss")',
        'Water Supply',
        'Internet'
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', () => {
      const sanitized = ValidationService.sanitizeReportData({});

      expect(sanitized).toEqual({});
    });

    it('should handle null input', () => {
      const sanitized = ValidationService.sanitizeReportData(null);

      expect(sanitized).toEqual({});
    });

    it('should handle undefined input', () => {
      const sanitized = ValidationService.sanitizeReportData(undefined);

      expect(sanitized).toEqual({});
    });
  });

  describe('Security Considerations', () => {
    it('should remove HTML tags from string fields', () => {
      const maliciousData = {
        instruction_source: '<img src=x onerror=alert(1)>Bank Name',
        valuation_purpose: '<iframe src="javascript:alert(1)"></iframe>Purpose',
        village_name: '<svg onload=alert(1)>Village</svg>'
      };

      const sanitized = ValidationService.sanitizeReportData(maliciousData);

      expect(sanitized.instruction_source).toBe('Bank Name');
      expect(sanitized.valuation_purpose).toBe('Purpose');
      expect(sanitized.village_name).toBe('Village');
    });

    it('should handle nested malicious content', () => {
      const nestedMalicious = {
        instruction_source: '<<script>alert(1)</script>script>Bank</script>',
        valuation_purpose: 'javascript:alert(1)'
      };

      const sanitized = ValidationService.sanitizeReportData(nestedMalicious);

      expect(sanitized.instruction_source).toBe('Bank');
      expect(sanitized.valuation_purpose).toBe('javascript:alert(1)');
    });
  });
});