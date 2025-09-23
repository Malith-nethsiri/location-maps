const express = require('express');
const router = express.Router();
const { validateRequest, schemas } = require('../middleware/validateRequest');
const navigationService = require('../services/navigationService');
const logger = require('../utils/logger');

// POST /api/navigation/directions
// Get turn-by-turn directions between two points using Google Routes API (2025)
router.post('/directions', validateRequest(schemas.navigationRequest), async (req, res, next) => {
  try {
    const { origin, destination, travelMode, units } = req.body;

    logger.info(`Getting directions from ${origin.latitude},${origin.longitude} to ${destination.latitude},${destination.longitude}`);

    const directions = await navigationService.getDirections({
      origin,
      destination,
      travelMode,
      units
    });

    res.status(200).json({
      success: true,
      data: directions,
      metadata: {
        requested_at: new Date().toISOString(),
        travel_mode: travelMode,
        units
      }
    });

  } catch (error) {
    logger.error('Directions error:', error);
    next(error);
  }
});

// POST /api/navigation/route-to-city
// Get directions from coordinates to nearest major city
router.post('/route-to-city', validateRequest(schemas.coordinates), async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const travelMode = req.body.travelMode || 'DRIVE';
    const units = req.body.units || 'metric';

    logger.info(`Getting route to nearest city from: ${latitude}, ${longitude}`);

    const routeToCity = await navigationService.getRouteToNearestCity({
      latitude,
      longitude,
      travelMode,
      units
    });

    res.status(200).json({
      success: true,
      data: routeToCity
    });

  } catch (error) {
    logger.error('Route to city error:', error);
    next(error);
  }
});

// POST /api/navigation/matrix
// Get distance matrix between multiple origins and destinations
router.post('/matrix', async (req, res, next) => {
  try {
    const { origins, destinations, travelMode = 'DRIVE', units = 'metric' } = req.body;

    // Validate input
    if (!origins || !Array.isArray(origins) || origins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Origins array is required and cannot be empty'
      });
    }

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Destinations array is required and cannot be empty'
      });
    }

    logger.info(`Calculating distance matrix: ${origins.length} origins to ${destinations.length} destinations`);

    const matrix = await navigationService.getDistanceMatrix({
      origins,
      destinations,
      travelMode,
      units
    });

    res.status(200).json({
      success: true,
      data: matrix
    });

  } catch (error) {
    logger.error('Distance matrix error:', error);
    next(error);
  }
});

// POST /api/navigation/optimize-waypoints
// Optimize the order of waypoints for the shortest route
router.post('/optimize-waypoints', async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      waypoints,
      travelMode = 'DRIVE',
      units = 'metric'
    } = req.body;

    // Validate input
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Waypoints array is required and cannot be empty'
      });
    }

    logger.info(`Optimizing route with ${waypoints.length} waypoints`);

    const optimizedRoute = await navigationService.optimizeWaypoints({
      origin,
      destination,
      waypoints,
      travelMode,
      units
    });

    res.status(200).json({
      success: true,
      data: optimizedRoute
    });

  } catch (error) {
    logger.error('Waypoint optimization error:', error);
    next(error);
  }
});

// GET /api/navigation/travel-modes
// Get available travel modes
router.get('/travel-modes', (req, res) => {
  const travelModes = [
    {
      id: 'DRIVE',
      name: 'Driving',
      description: 'Driving directions using roads suitable for automobiles',
      icon: 'car'
    },
    {
      id: 'WALK',
      name: 'Walking',
      description: 'Walking directions using pedestrian paths and sidewalks',
      icon: 'walk'
    },
    {
      id: 'BICYCLE',
      name: 'Bicycling',
      description: 'Bicycling directions using bicycle paths and bike-friendly roads',
      icon: 'bicycle'
    },
    {
      id: 'TRANSIT',
      name: 'Public Transit',
      description: 'Public transportation directions using buses, trains, and other transit',
      icon: 'transit'
    }
  ];

  res.status(200).json({
    success: true,
    data: travelModes
  });
});

module.exports = router;