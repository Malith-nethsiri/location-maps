const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validateRequest');
const { uploadMultiple, uploadByCategory, getFileInfo, optimizeImage } = require('../middleware/upload');
const reportsService = require('../services/reportsService');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// ===============================================
// Validation Middleware
// ===============================================

const validateCreateReport = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('report_type').optional().isIn(['mortgage', 'fair_value', 'insurance', 'investment'])
    .withMessage('Invalid report type'),
  body('coordinates').optional().custom((value) => {
    if (value && (!value.latitude || !value.longitude)) {
      throw new Error('Coordinates must include both latitude and longitude');
    }
    return true;
  }),
  validateRequest
];

const validateUpdateSection = [
  param('id').isInt().withMessage('Report ID must be an integer'),
  body('section').notEmpty().withMessage('Section name is required'),
  body('data').isObject().withMessage('Section data must be an object'),
  validateRequest
];

const validateGenerateContent = [
  body('content_type').isIn(['route_description', 'property_description', 'market_analysis', 'locality_analysis', 'building_description'])
    .withMessage('Invalid content type'),
  body('input_data').isObject().withMessage('Input data must be an object'),
  validateRequest
];

// ===============================================
// User Profile Routes
// ===============================================

/**
 * GET /api/reports/profile/:user_id
 * Get or create user profile for auto-fill data
 */
router.get('/profile/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const profile = await reportsService.getUserProfile(user_id);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    next(error);
  }
});

/**
 * PUT /api/reports/profile/:user_id
 * Update user profile information
 */
router.put('/profile/:user_id', [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email_address').isEmail().withMessage('Valid email is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const profileData = req.body;

    const profile = await reportsService.updateUserProfile(user_id, profileData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    next(error);
  }
});

// ===============================================
// Report Management Routes
// ===============================================

/**
 * POST /api/reports/create
 * Create a new valuation report
 */
router.post('/create', validateCreateReport, async (req, res, next) => {
  try {
    const reportData = req.body;

    // Auto-fill from location analysis if coordinates provided
    if (reportData.coordinates) {
      const locationData = await reportsService.getLocationData(reportData.coordinates);
      if (locationData) {
        reportData.location_context = locationData;
      }
    }

    const report = await reportsService.createReport(reportData);

    logger.info(`New valuation report created: ${report.id} for user: ${reportData.user_id}`);

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error creating report:', error);
    next(error);
  }
});

/**
 * GET /api/reports/:id
 * Get a specific report by ID
 */
router.get('/:id', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await reportsService.getReport(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error fetching report:', error);
    next(error);
  }
});

/**
 * GET /api/reports/user/:user_id
 * Get all reports for a specific user
 */
router.get('/user/:user_id', [
  query('status').optional().isIn(['draft', 'in_progress', 'completed', 'finalized']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;

    const reports = await reportsService.getUserReports(user_id, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: reports.reports,
      pagination: {
        total: reports.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: reports.total > (parseInt(offset) + parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching user reports:', error);
    next(error);
  }
});

/**
 * PUT /api/reports/:id/section
 * Update a specific section of the report
 */
router.put('/:id/section', validateUpdateSection, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { section, data } = req.body;

    const updatedReport = await reportsService.updateReportSection(id, section, data);

    res.json({
      success: true,
      message: 'Report section updated successfully',
      data: updatedReport
    });
  } catch (error) {
    logger.error('Error updating report section:', error);
    next(error);
  }
});

/**
 * PUT /api/reports/:id/status
 * Update report status
 */
router.put('/:id/status', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  body('status').isIn(['draft', 'in_progress', 'completed', 'finalized'])
    .withMessage('Invalid status'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await reportsService.updateReportStatus(id, status);

    res.json({
      success: true,
      message: 'Report status updated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error updating report status:', error);
    next(error);
  }
});

// ===============================================
// AI Content Generation Routes
// ===============================================

/**
 * POST /api/reports/generate-content
 * Generate AI-enhanced content for report sections
 */
router.post('/generate-content', validateGenerateContent, async (req, res, next) => {
  try {
    const { content_type, input_data, use_cache = true } = req.body;

    // Check cache first if enabled
    let cachedContent = null;
    if (use_cache) {
      cachedContent = await aiService.getCachedContent(content_type, input_data);
    }

    if (cachedContent) {
      return res.json({
        success: true,
        data: {
          generated_text: cachedContent.generated_text,
          cached: true,
          cost_saved: cachedContent.cost_usd
        }
      });
    }

    // Generate new content
    const result = await aiService.generateContent(content_type, input_data);

    res.json({
      success: true,
      data: {
        generated_text: result.generated_text,
        cached: false,
        tokens_used: result.tokens_used,
        cost_usd: result.cost_usd,
        model_used: result.ai_model
      }
    });
  } catch (error) {
    logger.error('Error generating AI content:', error);

    // Provide fallback response for AI failures
    res.status(500).json({
      success: false,
      message: 'AI content generation failed. Please enter content manually.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/reports/:id/enhance
 * Enhance multiple report sections with AI
 */
router.post('/:id/enhance', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  body('sections').isArray().withMessage('Sections must be an array'),
  body('sections.*').isIn(['route_description', 'property_description', 'market_analysis', 'locality_analysis', 'building_description'])
    .withMessage('Invalid section type'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sections } = req.body;

    const report = await reportsService.getReport(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const enhancedSections = await aiService.enhanceReportSections(report, sections);

    res.json({
      success: true,
      message: 'Report sections enhanced successfully',
      data: enhancedSections,
      total_cost: enhancedSections.reduce((sum, section) => sum + section.cost_usd, 0)
    });
  } catch (error) {
    logger.error('Error enhancing report sections:', error);
    next(error);
  }
});

/**
 * POST /api/reports/enhance-content
 * Enhanced AI content generation with frontend-compatible pricing
 */
router.post('/enhance-content', [
  body('enhancement_type').isIn(['route_enhancement', 'locality_analysis', 'market_analysis'])
    .withMessage('Invalid enhancement type'),
  body('input_data').isObject().withMessage('Input data must be an object'),
  validateRequest
], async (req, res, next) => {
  try {
    const { enhancement_type, input_data } = req.body;

    // Map frontend enhancement types to backend content types
    const contentTypeMap = {
      route_enhancement: 'route_description',
      locality_analysis: 'locality_analysis',
      market_analysis: 'market_analysis'
    };

    const contentType = contentTypeMap[enhancement_type];
    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enhancement type'
      });
    }

    // Generate content using AI service
    const result = await aiService.generateContent(contentType, input_data);

    // Calculate fixed costs that match frontend expectations
    const fixedCosts = {
      route_enhancement: 0.003,
      locality_analysis: 0.008,
      market_analysis: 0.006
    };

    res.json({
      success: true,
      data: {
        enhanced_content: result.generated_text,
        enhancement_type,
        cached: result.cached,
        tokens_used: result.tokens_used,
        actual_cost_usd: result.cost_usd,
        frontend_cost_usd: fixedCosts[enhancement_type], // Fixed cost for frontend display
        model_used: result.ai_model
      }
    });
  } catch (error) {
    logger.error('Error enhancing content:', error);
    res.status(500).json({
      success: false,
      message: 'Content enhancement failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===============================================
// PDF Generation Routes
// ===============================================

/**
 * GET /api/reports/:id/preview
 * Generate PDF preview of the report
 */
router.get('/:id/preview', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  query('format').optional().isIn(['pdf', 'html']),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'pdf' } = req.query;

    const report = await reportsService.getReport(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (format === 'html') {
      const htmlContent = await reportsService.generateReportHTML(report);
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } else {
      const pdfBuffer = await reportsService.generateReportPDF(report, { isDraft: true });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="valuation-report-${id}-preview.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    logger.error('Error generating report preview:', error);
    next(error);
  }
});

/**
 * POST /api/reports/:id/finalize
 * Generate final PDF report
 */
router.post('/:id/finalize', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await reportsService.getReport(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Validate report completeness
    const validation = await reportsService.validateReport(report);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Report is incomplete',
        errors: validation.errors
      });
    }

    // Generate final PDF
    const pdfBuffer = await reportsService.generateReportPDF(report, { isDraft: false });

    // Update report status
    await reportsService.updateReportStatus(id, 'finalized');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="valuation-report-${report.report_reference}.pdf"`);
    res.send(pdfBuffer);

    logger.info(`Report finalized: ${id} - ${report.report_reference}`);
  } catch (error) {
    logger.error('Error finalizing report:', error);
    next(error);
  }
});

// ===============================================
// Template and Reference Data Routes
// ===============================================

/**
 * GET /api/reports/templates/:category
 * Get template options for dropdowns and auto-fill
 */
router.get('/templates/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const templates = await reportsService.getTemplates(category);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    next(error);
  }
});

/**
 * GET /api/reports/reference/sri-lankan-locations
 * Get Sri Lankan administrative divisions for dropdowns
 */
router.get('/reference/sri-lankan-locations', [
  query('type').optional().isIn(['province', 'district', 'city', 'pradeshiya_sabha']),
  query('parent').optional(),
], async (req, res, next) => {
  try {
    const { type, parent } = req.query;
    const locations = await reportsService.getSriLankanLocations(type, parent);

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    logger.error('Error fetching Sri Lankan locations:', error);
    next(error);
  }
});

// ===============================================
// Image Management Routes
// ===============================================

/**
 * POST /api/reports/:id/images
 * Upload images for the report
 */
router.post('/:id/images', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {

  // Apply upload middleware
  uploadMultiple('images', 10)(req, res, async (uploadErr) => {
    if (uploadErr) {
      return; // Error already handled by middleware
    }

    try {
      const { id } = req.params;
      const { category = 'general' } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Process uploaded files
      const uploadedImages = [];

      for (const file of req.files) {
        // Optimize image (if optimization library is available)
        const optimizedPath = await optimizeImage(file.path);

        // Save to database
        const imageRecord = await reportsService.saveReportImage(parseInt(id), {
          category,
          filename: file.filename,
          file_path: optimizedPath,
          file_size: file.size,
          mime_type: file.mimetype,
          caption: req.body.caption || `${category.replace('_', ' ')} image`
        });

        uploadedImages.push({
          ...imageRecord,
          file_info: getFileInfo(file)
        });
      }

      res.json({
        success: true,
        message: `Successfully uploaded ${uploadedImages.length} images`,
        data: {
          report_id: parseInt(id),
          uploaded_images: uploadedImages,
          category
        }
      });
    } catch (error) {
      logger.error('Error processing uploaded images:', error);
      next(error);
    }
  });
});

/**
 * POST /api/reports/:id/images/category
 * Upload images by category (multiple categories at once)
 */
router.post('/:id/images/category', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {

  // Apply upload middleware
  uploadByCategory()(req, res, async (uploadErr) => {
    if (uploadErr) {
      return; // Error already handled by middleware
    }

    try {
      const { id } = req.params;

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const results = {};
      let totalUploaded = 0;

      // Process files by category
      for (const [category, files] of Object.entries(req.files)) {
        const categoryResults = [];

        for (const file of files) {
          // Optimize image
          const optimizedPath = await optimizeImage(file.path);

          // Save to database
          const imageRecord = await reportsService.saveReportImage(parseInt(id), {
            category,
            filename: file.filename,
            file_path: optimizedPath,
            file_size: file.size,
            mime_type: file.mimetype,
            caption: req.body[`${category}_caption`] || `${category.replace('_', ' ')} image`
          });

          categoryResults.push({
            ...imageRecord,
            file_info: getFileInfo(file)
          });
        }

        results[category] = categoryResults;
        totalUploaded += categoryResults.length;
      }

      res.json({
        success: true,
        message: `Successfully uploaded ${totalUploaded} images across ${Object.keys(results).length} categories`,
        data: {
          report_id: parseInt(id),
          results,
          total_uploaded: totalUploaded
        }
      });
    } catch (error) {
      logger.error('Error processing categorized image upload:', error);
      next(error);
    }
  });
});

/**
 * GET /api/reports/:id/images
 * Get all images for a report
 */
router.get('/:id/images', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  query('category').optional(),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.query;

    const images = await reportsService.getReportImages(parseInt(id), category);

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    logger.error('Error fetching report images:', error);
    next(error);
  }
});

/**
 * DELETE /api/reports/:id/images/:imageId
 * Delete a specific image
 */
router.delete('/:id/images/:imageId', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  param('imageId').isInt().withMessage('Image ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    const success = await reportsService.deleteReportImage(parseInt(id), parseInt(imageId));

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting image:', error);
    next(error);
  }
});

// ===============================================
// Location Intelligence Integration Routes
// ===============================================

/**
 * POST /api/reports/create-from-coordinates
 * Create a new report with automatic location analysis
 */
router.post('/create-from-coordinates', [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('report_type').optional().isIn(['mortgage', 'fair_value', 'insurance', 'investment']),
  validateRequest
], async (req, res, next) => {
  try {
    const { user_id, coordinates, ...initialData } = req.body;

    const report = await reportsService.createReportFromCoordinates(user_id, coordinates, initialData);

    res.status(201).json({
      success: true,
      message: 'Report created successfully with location analysis',
      data: report
    });
  } catch (error) {
    logger.error('Error creating report from coordinates:', error);
    next(error);
  }
});

/**
 * GET /api/reports/:id/location-context
 * Get location context data for a specific report
 */
router.get('/:id/location-context', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const locationContext = await reportsService.getLocationContext(parseInt(id));

    if (!locationContext) {
      return res.status(404).json({
        success: false,
        message: 'Location context not found for this report'
      });
    }

    res.json({
      success: true,
      data: locationContext
    });
  } catch (error) {
    logger.error('Error fetching location context:', error);
    next(error);
  }
});

/**
 * POST /api/reports/:id/regenerate-location
 * Regenerate location analysis for an existing report
 */
router.post('/:id/regenerate-location', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const locationAnalysis = await reportsService.regenerateLocationAnalysis(parseInt(id));

    res.json({
      success: true,
      message: 'Location analysis regenerated successfully',
      data: locationAnalysis
    });
  } catch (error) {
    logger.error('Error regenerating location analysis:', error);
    next(error);
  }
});

/**
 * GET /api/reports/:id/poi-analysis
 * Get detailed POI analysis for a report
 */
router.get('/:id/poi-analysis', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  query('category').optional().isString(),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.query;

    const locationContext = await reportsService.getLocationContext(parseInt(id));

    if (!locationContext) {
      return res.status(404).json({
        success: false,
        message: 'Location context not found for this report'
      });
    }

    let poiData = locationContext.poi_analysis;

    // Filter by category if specified
    if (category) {
      poiData = poiData.filter(poi => poi.category === category);
    }

    // Group by category for organized display
    const groupedPOIs = poiData.reduce((acc, poi) => {
      if (!acc[poi.category]) {
        acc[poi.category] = [];
      }
      acc[poi.category].push(poi);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        by_category: groupedPOIs,
        all_facilities: poiData,
        total_count: poiData.length,
        categories: Object.keys(groupedPOIs)
      }
    });
  } catch (error) {
    logger.error('Error fetching POI analysis:', error);
    next(error);
  }
});

/**
 * POST /api/reports/analyze-location
 * Standalone location analysis (without creating a report)
 */
router.post('/analyze-location', [
  body('coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const { coordinates } = req.body;

    const locationReportService = require('../services/locationReportService');
    const locationAnalysis = await locationReportService.analyzeLocationForReport(coordinates);

    res.json({
      success: true,
      data: locationAnalysis
    });
  } catch (error) {
    logger.error('Error analyzing location:', error);
    next(error);
  }
});

/**
 * GET /api/reports/:id/route-data
 * Get route information for AI enhancement
 */
router.get('/:id/route-data', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const locationContext = await reportsService.getLocationContext(parseInt(id));

    if (!locationContext) {
      return res.status(404).json({
        success: false,
        message: 'Location context not found for this report'
      });
    }

    res.json({
      success: true,
      data: {
        nearest_major_city: locationContext.nearest_major_city,
        route_instructions: locationContext.route_instructions,
        route_distance_km: locationContext.route_distance_km,
        route_duration: locationContext.route_duration,
        route_quality: locationContext.route_quality,
        raw_route_data: locationContext.raw_route_data
      }
    });
  } catch (error) {
    logger.error('Error fetching route data:', error);
    next(error);
  }
});

// ===============================================
// Analytics and Cost Tracking Routes
// ===============================================

/**
 * GET /api/reports/analytics/costs/:user_id
 * Get AI usage and cost analytics for user
 */
router.get('/analytics/costs/:user_id', [
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
], async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;

    const analytics = await reportsService.getCostAnalytics(user_id, {
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching cost analytics:', error);
    next(error);
  }
});

// ===============================================
// Dashboard and Analytics Routes
// ===============================================

/**
 * GET /api/reports/dashboard
 * Get dashboard data for the current user
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user?.id; // Assuming authentication middleware sets req.user

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const dashboardData = await reportsService.getDashboardData(userId);

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    next(error);
  }
});

/**
 * GET /api/reports/analytics
 * Get detailed analytics data
 */
router.get('/analytics', [
  query('timeframe').optional().isIn(['week', 'month', 'quarter', 'year']),
  validateRequest
], async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { timeframe = 'month' } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const analyticsData = await reportsService.getAnalyticsData(userId, timeframe);

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    logger.error('Error fetching analytics data:', error);
    next(error);
  }
});

/**
 * GET /api/reports/districts
 * Get list of districts from user's reports
 */
router.get('/districts', async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const districts = await reportsService.getUserDistricts(userId);

    res.json({
      success: true,
      data: districts
    });
  } catch (error) {
    logger.error('Error fetching districts:', error);
    next(error);
  }
});

/**
 * GET /api/reports
 * Get paginated list of reports with filters
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('status').optional().isIn(['all', 'draft', 'completed', 'archived']),
  query('district').optional().isString(),
  query('sortBy').optional().isIn(['created_at', 'market_value', 'village_name']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  validateRequest
], async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      district = 'all',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status: status === 'all' ? null : status,
      district: district === 'all' ? null : district,
      sortBy,
      sortOrder
    };

    const result = await reportsService.getReportsWithPagination(filters);

    res.json({
      success: true,
      data: {
        reports: result.reports,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          total: result.total,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching reports list:', error);
    next(error);
  }
});

/**
 * GET /api/reports/:id/pdf
 * Download PDF for a completed report
 */
router.get('/:id/pdf', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const report = await reportsService.getReport(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check ownership
    if (report.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if report is completed
    if (report.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'PDF is only available for completed reports'
      });
    }

    const pdfBuffer = await reportsService.generateReportPDF(report, { isDraft: false });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="valuation-report-${report.report_reference}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error downloading PDF:', error);
    next(error);
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
router.delete('/:id', [
  param('id').isInt().withMessage('Report ID must be an integer'),
  validateRequest
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const report = await reportsService.getReport(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check ownership
    if (report.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await reportsService.deleteReport(id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting report:', error);
    next(error);
  }
});

module.exports = router;