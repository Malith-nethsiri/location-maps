const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class LocationService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.apiTimeout = parseInt(process.env.GOOGLE_API_TIMEOUT) || 5000;

    if (!this.googleApiKey) {
      logger.warn('Google Maps API key not configured');
    }
  }

  // Analyze location comprehensively
  async analyzeLocation({ latitude, longitude, radius = 5000, includeCategories = [] }) {
    try {
      const startTime = Date.now();

      // Parallel execution of all location analysis tasks
      const [geocodeResult, nearestCity, nearbyCities, pois, satelliteImagery] = await Promise.all([
        this.reverseGeocode(latitude, longitude),
        this.findNearestCity(latitude, longitude),
        this.findNearbyCities(latitude, longitude, 100, 5), // Find up to 5 cities within 100km
        this.searchNearbyPOIs(latitude, longitude, radius, includeCategories),
        this.getSatelliteImagery(latitude, longitude)
      ]);

      // Get directions from multiple nearby cities
      const directionsFromCities = [];
      if (nearbyCities && nearbyCities.length > 0) {
        try {
          const navigationService = require('./navigationService');
          const navService = new navigationService();

          // Get directions from each nearby city in parallel
          const directionsPromises = nearbyCities.map(async (city) => {
            try {
              const directions = await navService.getDirections({
                origin: { latitude: city.coordinates.latitude, longitude: city.coordinates.longitude },
                destination: { latitude, longitude },
                travelMode: 'DRIVE'
              });

              return {
                city: city,
                directions: directions
              };
            } catch (error) {
              logger.warn(`Could not get directions from ${city.name}:`, error.message);
              return null;
            }
          });

          const directionsResults = await Promise.all(directionsPromises);
          directionsFromCities.push(...directionsResults.filter(result => result !== null));
        } catch (error) {
          logger.warn('Could not get directions from nearby cities:', error.message);
        }
      }

      // Keep single nearest city direction for backward compatibility
      let directionsFromCity = null;
      if (nearestCity && nearestCity.coordinates) {
        try {
          const navigationService = require('./navigationService');
          const navService = new navigationService();
          directionsFromCity = await navService.getDirections({
            origin: { latitude: nearestCity.coordinates.latitude, longitude: nearestCity.coordinates.longitude },
            destination: { latitude, longitude },
            travelMode: 'DRIVE'
          });
        } catch (error) {
          logger.warn('Could not get directions from nearest city:', error.message);
        }
      }

      const responseTime = Date.now() - startTime;

      // Cache the query for analytics
      await this.cacheUserQuery({
        queryType: 'location_analysis',
        latitude,
        longitude,
        searchRadius: radius,
        categories: includeCategories,
        responseData: { geocodeResult, nearestCity, pois: pois.length },
        responseTimeMs: responseTime
      });

      return {
        coordinates: { latitude, longitude },
        address: geocodeResult,
        nearest_city: nearestCity,
        nearby_cities: nearbyCities,
        directions_from_city: directionsFromCity, // Keep for backward compatibility
        directions_from_cities: directionsFromCities, // New: multiple cities directions
        points_of_interest: pois,
        map_imagery: satelliteImagery,
        search_radius: radius,
        total_pois_found: pois.length,
        response_time_ms: responseTime
      };

    } catch (error) {
      logger.error('Location analysis error:', error);
      throw new Error('Failed to analyze location');
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(latitude, longitude) {
    try {
      // Check cache first
      const cachedLocation = await this.getCachedLocation(latitude, longitude);
      if (cachedLocation) {
        return cachedLocation;
      }

      const url = 'https://maps.googleapis.com/maps/api/geocode/json';
      const params = {
        latlng: `${latitude},${longitude}`,
        key: this.googleApiKey,
        result_type: 'street_address|route|locality|administrative_area_level_1|country'
      };

      const response = await axios.get(url, {
        params,
        timeout: this.apiTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }

      const result = response.data.results[0];
      if (!result) {
        throw new Error('No geocoding results found');
      }

      const addressComponents = this.parseAddressComponents(result.address_components);
      const geocodeResult = {
        formatted_address: result.formatted_address,
        address_components: addressComponents,
        place_id: result.place_id,
        types: result.types
      };

      // Cache the result
      await this.cacheLocation(latitude, longitude, geocodeResult);

      return geocodeResult;

    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  // Get map imagery for coordinates (road view with labels and context)
  async getSatelliteImagery(latitude, longitude, options = {}) {
    try {
      const { zoom = 14, size = '600x400', maptype = 'roadmap' } = options;

      const url = 'https://maps.googleapis.com/maps/api/staticmap';
      const params = {
        center: `${latitude},${longitude}`,
        zoom,
        size,
        maptype,
        markers: `color:red|label:📍|${latitude},${longitude}`,
        format: 'png',
        language: 'en',
        region: 'US',
        key: this.googleApiKey
      };

      // Return the URL and metadata instead of fetching the image
      return {
        image_url: `${url}?${new URLSearchParams(params).toString()}`,
        metadata: {
          center: { latitude, longitude },
          zoom,
          size,
          maptype,
          marker: { color: 'red', position: { latitude, longitude } }
        }
      };

    } catch (error) {
      logger.error('Map imagery error:', error);
      throw new Error('Failed to get map imagery');
    }
  }

  // Find nearest major city
  async findNearestCity(latitude, longitude) {
    try {
      const result = await query(
        'SELECT * FROM find_nearest_city($1, $2, $3)',
        [latitude, longitude, 500] // 500km max distance
      );

      if (result.rows.length === 0) {
        return null;
      }

      const city = result.rows[0];
      return {
        name: city.city_name,
        country: city.country,
        state: city.state,
        coordinates: {
          latitude: parseFloat(city.latitude),
          longitude: parseFloat(city.longitude)
        },
        distance_km: parseFloat(city.distance_km),
        population: city.population,
        timezone: city.timezone
      };

    } catch (error) {
      logger.error('Find nearest city error:', error);
      throw new Error('Failed to find nearest city');
    }
  }

  // Find multiple nearby cities for access information
  async findNearbyCities(latitude, longitude, maxDistance = 100, limit = 5) {
    try {
      logger.info(`DEBUG: Finding nearby cities for ${latitude}, ${longitude} within ${maxDistance}km`);

      // First, check if cities table exists
      const tableCheck = await query("SELECT to_regclass('cities') as table_exists");
      logger.info(`DEBUG: Cities table exists: ${tableCheck.rows[0].table_exists !== null}`);

      if (tableCheck.rows[0].table_exists === null) {
        logger.error('DEBUG: Cities table does not exist!');
        return [];
      }

      // Check how many total cities we have
      const cityCount = await query('SELECT COUNT(*) as count FROM cities');
      logger.info(`DEBUG: Total cities in database: ${cityCount.rows[0].count}`);

      // First, try the new function
      let result;
      try {
        result = await query(
          'SELECT * FROM find_nearby_cities($1, $2, $3, $4)',
          [latitude, longitude, maxDistance, limit]
        );
        logger.info(`DEBUG: find_nearby_cities function returned ${result.rows.length} cities`);
      } catch (funcError) {
        logger.warn(`DEBUG: find_nearby_cities function failed: ${funcError.message}`);
        result = null;
      }

      // If function doesn't exist or no results, fallback to basic query
      if (!result || result.rows.length === 0) {
        logger.warn('DEBUG: Using fallback query');

        // Ensure Sri Lankan cities exist
        await this.ensureSriLankanCities();

        // Use basic SQL with Haversine formula
        result = await query(`
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
        `, [latitude, longitude, maxDistance, limit]);
      }

      logger.info(`DEBUG: Fallback query returned ${result.rows.length} cities`);
      if (result.rows.length === 0) {
        logger.warn('DEBUG: No cities found within radius despite Sri Lankan cities existing');
        return [];
      }

      const mappedCities = result.rows.map(city => ({
        name: city.city_name,
        country: city.country,
        state: city.state,
        coordinates: {
          latitude: parseFloat(city.latitude),
          longitude: parseFloat(city.longitude)
        },
        distance_km: parseFloat(city.distance_km),
        population: city.population
      }));

      logger.info(`DEBUG: Returning ${mappedCities.length} mapped cities: ${mappedCities.map(c => `${c.name} (${c.distance_km}km)`).join(', ')}`);
      return mappedCities;

    } catch (error) {
      logger.error('DEBUG: Find nearby cities ERROR:', error.message);
      logger.error('DEBUG: Full error stack:', error);
      return []; // Return empty array on error instead of failing
    }
  }

  // Ensure Sri Lankan cities exist in database (fallback)
  async ensureSriLankanCities() {
    try {
      logger.info('DEBUG: Ensuring Sri Lankan cities exist...');

      const sriLankanCities = [
        {name: 'Colombo', country: 'Sri Lanka', state: 'Western Province', latitude: 6.9271, longitude: 79.8612, population: 752993},
        {name: 'Kandy', country: 'Sri Lanka', state: 'Central Province', latitude: 7.2906, longitude: 80.6337, population: 125351},
        {name: 'Galle', country: 'Sri Lanka', state: 'Southern Province', latitude: 6.0535, longitude: 80.2210, population: 99478},
        {name: 'Negombo', country: 'Sri Lanka', state: 'Western Province', latitude: 7.2083, longitude: 79.8358, population: 142136},
        {name: 'Jaffna', country: 'Sri Lanka', state: 'Northern Province', latitude: 9.6615, longitude: 80.0255, population: 88138}
      ];

      let insertedCount = 0;
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
            insertedCount++;
            logger.info(`DEBUG: Inserted city: ${city.name}`);
          } else {
            logger.info(`DEBUG: City already exists: ${city.name}`);
          }
        } catch (cityError) {
          logger.error(`DEBUG: Failed to insert/check city ${city.name}:`, cityError.message);
        }
      }

      logger.info(`DEBUG: Sri Lankan cities process complete. Inserted: ${insertedCount} cities`);

      // Verify cities were inserted
      const sriLankanCount = await query("SELECT COUNT(*) as count FROM cities WHERE country = 'Sri Lanka'");
      logger.info(`DEBUG: Total Sri Lankan cities in database: ${sriLankanCount.rows[0].count}`);

    } catch (error) {
      logger.error('DEBUG: Failed to ensure Sri Lankan cities:', error.message);
    }
  }

  // Search nearby POIs
  async searchNearbyPOIs(latitude, longitude, radius, categories) {
    try {
      // First check database cache
      const cachedPOIs = await this.getCachedPOIs(latitude, longitude, radius, categories);
      if (cachedPOIs.length > 0) {
        return cachedPOIs;
      }

      // If not in cache, use Google Places API
      const pois = [];

      for (const category of categories) {
        const categoryPOIs = await this.searchPOIsByCategory(latitude, longitude, radius, category);
        pois.push(...categoryPOIs);
      }

      // Remove duplicates based on place_id
      const uniquePOIs = pois.filter((poi, index, self) =>
        index === self.findIndex(p => p.place_id === poi.place_id)
      );

      // Cache the results
      await this.cachePOIs(uniquePOIs);

      return uniquePOIs;

    } catch (error) {
      logger.error('Search nearby POIs error:', error);
      throw new Error('Failed to search nearby POIs');
    }
  }

  // Search POIs by category using Google Places API
  async searchPOIsByCategory(latitude, longitude, radius, category) {
    try {
      const placeTypes = this.getCategoryPlaceTypes(category);
      const pois = [];

      for (const type of placeTypes) {
        const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        const params = {
          location: `${latitude},${longitude}`,
          radius,
          type,
          key: this.googleApiKey
        };

        const response = await axios.get(url, {
          params,
          timeout: this.apiTimeout
        });

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
          logger.warn(`Places API warning for type ${type}:`, response.data.status);
          continue;
        }

        const places = response.data.results.map(place => ({
          place_id: place.place_id,
          name: place.name,
          category,
          subcategory: type,
          coordinates: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng
          },
          address: place.vicinity,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          business_status: place.business_status,
          types: place.types,
          price_level: place.price_level,
          distance_meters: this.calculateDistance(
            latitude, longitude,
            place.geometry.location.lat, place.geometry.location.lng
          )
        }));

        pois.push(...places);
      }

      return pois;

    } catch (error) {
      logger.error(`Search POIs by category error for ${category}:`, error);
      return [];
    }
  }

  // Helper methods
  parseAddressComponents(components) {
    const parsed = {};

    components.forEach(component => {
      const types = component.types;

      if (types.includes('street_number')) {
        parsed.street_number = component.long_name;
      }
      if (types.includes('route')) {
        parsed.route = component.long_name;
      }
      if (types.includes('locality')) {
        parsed.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        parsed.state = component.long_name;
      }
      if (types.includes('country')) {
        parsed.country = component.long_name;
      }
      if (types.includes('postal_code')) {
        parsed.postal_code = component.long_name;
      }
    });

    return parsed;
  }

  getCategoryPlaceTypes(category) {
    const categoryMap = {
      school: ['school', 'university', 'primary_school', 'secondary_school'],
      hospital: ['hospital', 'doctor', 'pharmacy', 'physiotherapist', 'dentist'],
      government: ['city_hall', 'local_government_office', 'courthouse', 'police'],
      religious: ['church', 'mosque', 'synagogue', 'temple', 'place_of_worship'],
      store: ['store', 'shopping_mall', 'supermarket', 'grocery_store', 'clothing_store'],
      restaurant: ['restaurant', 'meal_takeaway', 'cafe', 'bakery', 'meal_delivery'],
      gas_station: ['gas_station', 'car_repair', 'car_wash'],
      bank: ['bank', 'atm', 'finance'],
      pharmacy: ['pharmacy', 'drugstore'],
      police: ['police', 'fire_station', 'hospital']
    };

    return categoryMap[category] || [category];
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  }

  // Cache methods
  async getCachedLocation(latitude, longitude) {
    try {
      const result = await query(
        'SELECT * FROM locations WHERE latitude = $1 AND longitude = $2',
        [latitude, longitude]
      );

      if (result.rows.length > 0) {
        const location = result.rows[0];
        return {
          formatted_address: location.formatted_address,
          address_components: {
            city: location.city,
            state: location.state,
            country: location.country,
            postal_code: location.postal_code
          }
        };
      }

      return null;
    } catch (error) {
      logger.error('Get cached location error:', error);
      return null;
    }
  }

  async cacheLocation(latitude, longitude, geocodeResult) {
    try {
      await query(
        `INSERT INTO locations (latitude, longitude, address, formatted_address, country, state, city, postal_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (latitude, longitude) DO UPDATE SET
         formatted_address = EXCLUDED.formatted_address,
         updated_at = CURRENT_TIMESTAMP`,
        [
          latitude,
          longitude,
          JSON.stringify(geocodeResult.address_components),
          geocodeResult.formatted_address,
          geocodeResult.address_components?.country,
          geocodeResult.address_components?.state,
          geocodeResult.address_components?.city,
          geocodeResult.address_components?.postal_code
        ]
      );
    } catch (error) {
      logger.error('Cache location error:', error);
    }
  }

  async getCachedPOIs(latitude, longitude, radius, categories) {
    try {
      const result = await query(
        'SELECT * FROM get_pois_within_radius($1, $2, $3, $4)',
        [latitude, longitude, radius, categories.length > 0 ? categories : null]
      );

      return result.rows.map(poi => ({
        place_id: poi.poi_id.toString(),
        name: poi.name,
        category: poi.category,
        coordinates: {
          latitude: parseFloat(poi.latitude),
          longitude: parseFloat(poi.longitude)
        },
        address: poi.address,
        rating: poi.rating ? parseFloat(poi.rating) : null,
        user_ratings_total: poi.user_ratings_total,
        distance_meters: parseFloat(poi.distance_meters)
      }));
    } catch (error) {
      logger.error('Get cached POIs error:', error);
      return [];
    }
  }

  async cachePOIs(pois) {
    try {
      for (const poi of pois) {
        await query(
          `INSERT INTO pois (google_place_id, name, category, subcategory, latitude, longitude, address, rating, user_ratings_total, business_status, google_types)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (google_place_id) DO UPDATE SET
           name = EXCLUDED.name,
           rating = EXCLUDED.rating,
           user_ratings_total = EXCLUDED.user_ratings_total,
           business_status = EXCLUDED.business_status,
           updated_at = CURRENT_TIMESTAMP`,
          [
            poi.place_id,
            poi.name,
            poi.category,
            poi.subcategory,
            poi.coordinates.latitude,
            poi.coordinates.longitude,
            poi.address,
            poi.rating,
            poi.user_ratings_total,
            poi.business_status,
            poi.types
          ]
        );
      }
    } catch (error) {
      logger.error('Cache POIs error:', error);
    }
  }

  async cacheUserQuery(queryData) {
    try {
      await query(
        `INSERT INTO user_queries (query_type, latitude, longitude, search_radius, categories, response_data, response_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          queryData.queryType,
          queryData.latitude,
          queryData.longitude,
          queryData.searchRadius,
          JSON.stringify(queryData.categories),
          JSON.stringify(queryData.responseData),
          queryData.responseTimeMs
        ]
      );
    } catch (error) {
      logger.error('Cache user query error:', error);
    }
  }
}

module.exports = new LocationService();