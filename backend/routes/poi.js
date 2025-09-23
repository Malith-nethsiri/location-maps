const express = require('express');
const router = express.Router();
const { validateRequest, schemas } = require('../middleware/validateRequest');
const poiService = require('../services/poiService');
const logger = require('../utils/logger');

// POST /api/poi/search
// Search for points of interest near given coordinates
router.post('/search', validateRequest(schemas.locationAnalysis), async (req, res, next) => {
  try {
    const { latitude, longitude, radius, includeCategories } = req.body;

    logger.info(`Searching POIs near: ${latitude}, ${longitude}`);

    const pois = await poiService.searchNearbyPOIs({
      latitude,
      longitude,
      radius,
      categories: includeCategories
    });

    res.status(200).json({
      success: true,
      data: {
        pois,
        total_found: pois.length,
        search_parameters: {
          center: { latitude, longitude },
          radius,
          categories: includeCategories
        }
      }
    });

  } catch (error) {
    logger.error('POI search error:', error);
    next(error);
  }
});

// GET /api/poi/categories
// Get available POI categories
router.get('/categories', (req, res) => {
  const categories = [
    {
      id: 'school',
      name: 'Schools',
      description: 'Educational institutions including primary, secondary, and higher education',
      google_types: ['school', 'university', 'primary_school', 'secondary_school']
    },
    {
      id: 'hospital',
      name: 'Hospitals & Healthcare',
      description: 'Medical facilities including hospitals, clinics, and pharmacies',
      google_types: ['hospital', 'doctor', 'pharmacy', 'physiotherapist', 'dentist']
    },
    {
      id: 'government',
      name: 'Government Buildings',
      description: 'Government offices, city halls, and public administration buildings',
      google_types: ['city_hall', 'local_government_office', 'courthouse', 'police']
    },
    {
      id: 'religious',
      name: 'Religious Places',
      description: 'Churches, mosques, temples, and other places of worship',
      google_types: ['church', 'mosque', 'synagogue', 'temple', 'place_of_worship']
    },
    {
      id: 'store',
      name: 'Stores & Shopping',
      description: 'Retail stores, shopping malls, and commercial establishments',
      google_types: ['store', 'shopping_mall', 'supermarket', 'grocery_store', 'clothing_store']
    },
    {
      id: 'restaurant',
      name: 'Restaurants & Food',
      description: 'Restaurants, cafes, fast food, and food establishments',
      google_types: ['restaurant', 'meal_takeaway', 'cafe', 'bakery', 'meal_delivery']
    },
    {
      id: 'gas_station',
      name: 'Gas Stations',
      description: 'Fuel stations and automotive services',
      google_types: ['gas_station', 'car_repair', 'car_wash']
    },
    {
      id: 'bank',
      name: 'Banks & ATMs',
      description: 'Banks, credit unions, and ATM locations',
      google_types: ['bank', 'atm', 'finance']
    },
    {
      id: 'pharmacy',
      name: 'Pharmacies',
      description: 'Pharmacies and drug stores',
      google_types: ['pharmacy', 'drugstore']
    },
    {
      id: 'police',
      name: 'Police & Emergency',
      description: 'Police stations, fire departments, and emergency services',
      google_types: ['police', 'fire_station', 'hospital']
    }
  ];

  res.status(200).json({
    success: true,
    data: categories
  });
});

// GET /api/poi/:id
// Get detailed information about a specific POI
router.get('/:id', async (req, res, next) => {
  try {
    const poiId = req.params.id;

    logger.info(`Getting POI details for: ${poiId}`);

    const poiDetails = await poiService.getPOIDetails(poiId);

    if (!poiDetails) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    res.status(200).json({
      success: true,
      data: poiDetails
    });

  } catch (error) {
    logger.error('POI details error:', error);
    next(error);
  }
});

// POST /api/poi/distances
// Calculate distances from a point to multiple POIs
router.post('/distances', async (req, res, next) => {
  try {
    const { origin, destinations, units = 'metric' } = req.body;

    // Validate input
    if (!origin || !origin.latitude || !origin.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Origin coordinates are required'
      });
    }

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Destinations array is required and cannot be empty'
      });
    }

    logger.info(`Calculating distances from origin to ${destinations.length} destinations`);

    const distances = await poiService.calculateDistances(origin, destinations, units);

    res.status(200).json({
      success: true,
      data: {
        origin,
        distances,
        units,
        total_destinations: destinations.length
      }
    });

  } catch (error) {
    logger.error('Distance calculation error:', error);
    next(error);
  }
});

module.exports = router;