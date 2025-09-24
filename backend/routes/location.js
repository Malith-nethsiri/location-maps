const express = require('express');
const router = express.Router();
const { validateRequest, schemas } = require('../middleware/validateRequest');
const locationService = require('../services/locationService');
const { query } = require('../config/database');
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
// Get road map imagery for specific coordinates
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

    const zoom = parseInt(req.query.zoom) || 14;
    const size = req.query.size || '600x400';

    logger.info(`Getting road map imagery for: ${latitude}, ${longitude}`);

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
    logger.error('Map imagery error:', error);
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

// GET /api/location/test-db
// Test database connection and table structure
router.get('/test-db', async (req, res, next) => {
  try {
    const results = {};

    // Test 1: Basic database connection
    try {
      const dbTest = await query('SELECT NOW() as current_time');
      results.connection = {
        status: 'connected',
        server_time: dbTest.rows[0].current_time
      };
    } catch (error) {
      results.connection = {
        status: 'failed',
        error: error.message
      };
    }

    // Test 2: Check if cities table exists and get structure
    try {
      const tableExists = await query("SELECT to_regclass('cities') as table_exists");
      results.cities_table = {
        exists: tableExists.rows[0].table_exists !== null
      };

      if (tableExists.rows[0].table_exists !== null) {
        // Get column information
        const columns = await query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'cities'
          ORDER BY ordinal_position
        `);
        results.cities_table.columns = columns.rows;

        // Get row count
        const count = await query('SELECT COUNT(*) as count FROM cities');
        results.cities_table.row_count = parseInt(count.rows[0].count);

        // Get Sri Lankan cities specifically
        const sriLankanCities = await query(`
          SELECT name, latitude, longitude
          FROM cities
          WHERE country = 'Sri Lanka'
          ORDER BY name
        `);
        results.cities_table.sri_lankan_cities = sriLankanCities.rows;
      }
    } catch (error) {
      results.cities_table = {
        exists: false,
        error: error.message
      };
    }

    // Test 3: Check if find_nearby_cities function exists
    try {
      const functionCheck = await query(`
        SELECT proname
        FROM pg_proc
        WHERE proname = 'find_nearby_cities'
      `);
      results.nearby_cities_function = {
        exists: functionCheck.rows.length > 0
      };

      if (functionCheck.rows.length > 0) {
        // Test the function with Sri Lankan coordinates
        const testResult = await query(
          'SELECT * FROM find_nearby_cities($1, $2, $3, $4)',
          [7.057203, 80.176836, 100, 5]
        );
        results.nearby_cities_function.test_result = testResult.rows;
      }
    } catch (error) {
      results.nearby_cities_function = {
        exists: false,
        error: error.message
      };
    }

    // Test 4: Try manual Haversine query
    try {
      const manualQuery = await query(`
        SELECT
          name as city_name,
          country,
          state,
          latitude,
          longitude,
          ROUND(
            CAST(
              6371 * acos(
                cos(radians($1)) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians($2)) +
                sin(radians($1)) *
                sin(radians(latitude))
              ) AS DECIMAL
            ), 2
          ) as distance_km,
          population
        FROM cities
        WHERE (
          6371 * acos(
            cos(radians($1)) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) *
            sin(radians(latitude))
          )
        ) <= $3
        ORDER BY (
          6371 * acos(
            cos(radians($1)) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) *
            sin(radians(latitude))
          )
        )
        LIMIT $4
      `, [7.057203, 80.176836, 100, 5]);
      results.manual_haversine = {
        success: true,
        results: manualQuery.rows
      };
    } catch (error) {
      results.manual_haversine = {
        success: false,
        error: error.message
      };
    }

    res.status(200).json({
      success: true,
      data: results,
      test_coordinates: {
        latitude: 7.057203,
        longitude: 80.176836,
        location: "Test coordinates in Sri Lanka"
      }
    });

  } catch (error) {
    logger.error('Database test error:', error);
    next(error);
  }
});

// POST /api/location/fix-sri-lankan-cities
// Manually insert Sri Lankan cities (temporary fix for production)
router.post('/fix-sri-lankan-cities', async (req, res, next) => {
  try {
    const sriLankanCities = [
      {name: 'Colombo', country: 'Sri Lanka', state: 'Western Province', latitude: 6.9271, longitude: 79.8612, population: 752993},
      {name: 'Kandy', country: 'Sri Lanka', state: 'Central Province', latitude: 7.2906, longitude: 80.6337, population: 125351},
      {name: 'Galle', country: 'Sri Lanka', state: 'Southern Province', latitude: 6.0535, longitude: 80.2210, population: 99478},
      {name: 'Negombo', country: 'Sri Lanka', state: 'Western Province', latitude: 7.2083, longitude: 79.8358, population: 142136},
      {name: 'Jaffna', country: 'Sri Lanka', state: 'Northern Province', latitude: 9.6615, longitude: 80.0255, population: 88138}
    ];

    const results = {
      inserted: [],
      existing: [],
      errors: []
    };

    for (const city of sriLankanCities) {
      try {
        // Check if city already exists
        const existingCity = await query(
          'SELECT id FROM cities WHERE name = $1 AND country = $2',
          [city.name, city.country]
        );

        if (existingCity.rows.length === 0) {
          await query(`
            INSERT INTO cities (name, country, state, latitude, longitude, population, is_major_city, timezone)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [city.name, city.country, city.state, city.latitude, city.longitude, city.population, true, 'Asia/Colombo']);
          results.inserted.push(city.name);
        } else {
          results.existing.push(city.name);
        }
      } catch (cityError) {
        results.errors.push({
          city: city.name,
          error: cityError.message
        });
      }
    }

    // Verify Sri Lankan cities after insertion
    const verifyResult = await query("SELECT name, latitude, longitude FROM cities WHERE country = 'Sri Lanka' ORDER BY name");

    res.status(200).json({
      success: true,
      data: {
        insertion_results: results,
        sri_lankan_cities_after_insert: verifyResult.rows
      }
    });

  } catch (error) {
    logger.error('Fix Sri Lankan cities error:', error);
    next(error);
  }
});

module.exports = router;