const express = require('express');
const router = express.Router();
const { validateRequest, schemas } = require('../middleware/validateRequest');
const locationService = require('../services/locationService');
const logger = require('../utils/logger');

// POST /api/location/analyze
// Analyze a location by coordinates and return comprehensive information
router.post('/analyze', validateRequest(schemas.locationAnalysis), async (req, res, next) => {
  try {
    const { latitude, longitude, radius, includeCategories } = req.body;

    logger.info(`Analyzing location: ${latitude}, ${longitude}`);

    // Get comprehensive location analysis
    const analysis = await locationService.analyzeLocation({
      latitude,
      longitude,
      radius,
      includeCategories
    });

    res.status(200).json({
      success: true,
      data: analysis,
      metadata: {
        analyzed_at: new Date().toISOString(),
        coordinates: { latitude, longitude },
        search_radius: radius,
        categories_included: includeCategories
      }
    });

  } catch (error) {
    logger.error('Location analysis error:', error);
    next(error);
  }
});

// POST /api/location/geocode
// Convert coordinates to human-readable address
router.post('/geocode', validateRequest(schemas.coordinates), async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    logger.info(`Geocoding coordinates: ${latitude}, ${longitude}`);

    const geocodeResult = await locationService.reverseGeocode(latitude, longitude);

    res.status(200).json({
      success: true,
      data: geocodeResult
    });

  } catch (error) {
    logger.error('Geocoding error:', error);
    next(error);
  }
});

// GET /api/location/satellite/:lat/:lng
// Get satellite imagery for specific coordinates
router.get('/satellite/:lat/:lng', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.params.lat);
    const longitude = parseFloat(req.params.lng);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
      });
    }

    const zoom = parseInt(req.query.zoom) || 15;
    const size = req.query.size || '400x400';

    logger.info(`Getting satellite imagery for: ${latitude}, ${longitude}`);

    const satelliteData = await locationService.getSatelliteImagery(
      latitude,
      longitude,
      { zoom, size }
    );

    res.status(200).json({
      success: true,
      data: satelliteData
    });

  } catch (error) {
    logger.error('Satellite imagery error:', error);
    next(error);
  }
});

// GET /api/location/nearest-city/:lat/:lng
// Find the nearest major city to given coordinates
router.get('/nearest-city/:lat/:lng', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.params.lat);
    const longitude = parseFloat(req.params.lng);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    logger.info(`Finding nearest city for: ${latitude}, ${longitude}`);

    const nearestCity = await locationService.findNearestCity(latitude, longitude);

    res.status(200).json({
      success: true,
      data: nearestCity
    });

  } catch (error) {
    logger.error('Nearest city search error:', error);
    next(error);
  }
});

module.exports = router;