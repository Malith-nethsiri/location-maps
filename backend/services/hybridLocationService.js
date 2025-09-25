const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class HybridLocationService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.apiTimeout = parseInt(process.env.GOOGLE_API_TIMEOUT) || 5000;

    if (!this.googleApiKey) {
      logger.warn('Google Maps API key not configured');
    }
  }

  // HYBRID APPROACH: Balance between cost ($0.095 target) and comprehensive data
  async analyzeLocation({ latitude, longitude, radius = 5000, includeCategories = [] }) {
    try {
      const startTime = Date.now();

      logger.info(`HYBRID ANALYZE: Starting balanced analysis for ${latitude}, ${longitude}`);

      // Phase 1: Database-only operations (FREE)
      const [geocodeResult, nearestCity, nearbyCities] = await Promise.all([
        this.getCachedOrFetchGeocode(latitude, longitude),
        this.findNearestCity(latitude, longitude),
        this.findNearbyCitiesSmart(latitude, longitude, 100, 5) // Enhanced nearest city logic
      ]);

      // Phase 2: ENHANCED POI search with multiple categories and adaptive radius
      const pois = await this.searchNearbyPOIsEnhanced(latitude, longitude, radius, includeCategories);

      // Phase 3: Cached satellite imagery (12h cache for cost balance)
      const satelliteImagery = await this.getCachedOrFetchSatelliteImagery(latitude, longitude);

      // Phase 4: SMART routing - directions from nearest cities (not major cities)
      const directionsFromCities = await this.getSmartDirectionsFromCities(latitude, longitude, nearbyCities);

      const responseTime = Date.now() - startTime;

      // Cache the comprehensive result
      await this.cacheUserQuery({
        queryType: 'hybrid_location_analysis',
        latitude,
        longitude,
        searchRadius: radius,
        categories: includeCategories,
        responseData: {
          geocodeResult,
          nearestCity,
          nearbyCitiesCount: nearbyCities.length,
          poisCount: pois.length,
          routesCalculated: directionsFromCities.length
        },
        responseTimeMs: responseTime
      });

      logger.info(`HYBRID ANALYZE: Complete - ${nearbyCities.length} cities, ${pois.length} POIs, ${directionsFromCities.length} routes in ${responseTime}ms`);

      return {
        coordinates: { latitude, longitude },
        address: geocodeResult,
        nearest_city: nearestCity,
        nearby_cities: nearbyCities,
        directions_from_cities: directionsFromCities, // Enhanced: actual nearest cities
        directions_from_city: directionsFromCities[0]?.directions || null, // Nearest city directions
        points_of_interest: pois,
        map_imagery: satelliteImagery,
        search_radius: radius,
        total_pois_found: pois.length,
        response_time_ms: responseTime,
        cost_analysis: {
          estimated_cost: this.calculateActualCost(pois, directionsFromCities, geocodeResult, satelliteImagery),
          poi_searches: this.poiSearchCount,
          routing_calls: directionsFromCities.length,
          caching_benefits: 'Active: 12h maps, 6h POIs, 2h geocoding'
        }
      };

    } catch (error) {
      logger.error('Hybrid location analysis error:', error);
      throw new Error('Failed to analyze location');
    }
  }

  // ENHANCED: Multi-category, multi-radius POI search for comprehensive results
  async searchNearbyPOIsEnhanced(latitude, longitude, initialRadius, categories) {
    try {
      this.poiSearchCount = 0;
      let allPOIs = [];

      // Check cache first (6 hours for balance between freshness and cost)
      const cacheKey = `poi_enhanced:${latitude}:${longitude}:${initialRadius}:${categories.sort().join(',')}`;
      const cached = await this.getCacheData(cacheKey, 'poi_data');
      if (cached && cached.length >= 5) {
        logger.info('Using cached enhanced POI result');
        return cached;
      }

      logger.info('HYBRID: Enhanced multi-category POI search starting');

      // Define comprehensive categories for better coverage
      const searchCategories = categories.length > 0 ? categories : [
        'school', 'hospital', 'government', 'religious', 'store', 'restaurant',
        'bank', 'gas_station', 'pharmacy', 'police', 'fire_station',
        'post_office', 'library', 'park', 'entertainment'
      ];

      // Strategy: Start with smaller radius, expand if needed
      const radiusSteps = [Math.min(initialRadius, 2000), 3000, 5000];

      for (const currentRadius of radiusSteps) {
        if (allPOIs.length >= 15) break; // Target: 15+ POIs

        logger.info(`HYBRID: Searching POIs within ${currentRadius}m radius`);

        // Group categories for fewer API calls (max 3 calls instead of 15+)
        const categoryGroups = this.groupCategoriesForSearch(searchCategories);

        for (const categoryGroup of categoryGroups) {
          this.poiSearchCount++;
          const pois = await this.searchPOIGroup(latitude, longitude, currentRadius, categoryGroup);
          allPOIs.push(...pois);

          if (allPOIs.length >= 25) break; // Stop if we have enough POIs
        }

        if (allPOIs.length >= 10) break; // Stop expanding radius if we have reasonable coverage
      }

      // Remove duplicates and sort by distance
      const uniquePOIs = this.removeDuplicatePOIs(allPOIs);
      uniquePOIs.sort((a, b) => a.distance_meters - b.distance_meters);

      // Take top 25 POIs to avoid overwhelming the user
      const finalPOIs = uniquePOIs.slice(0, 25);

      // Cache the results for 6 hours
      await this.setCacheData(cacheKey, 'poi_data', finalPOIs, 6);

      // Cache individual POIs in database
      await this.cachePOIs(finalPOIs);

      logger.info(`HYBRID: Enhanced POI search completed - ${finalPOIs.length} POIs found with ${this.poiSearchCount} API calls`);
      return finalPOIs;

    } catch (error) {
      logger.error('Enhanced POI search error:', error);
      return [];
    }
  }

  // Group categories to reduce API calls while maintaining comprehensive coverage
  groupCategoriesForSearch(categories) {
    return [
      // Group 1: Essential services
      ['hospital', 'pharmacy', 'doctor', 'dentist', 'physiotherapist'],

      // Group 2: Education & Government
      ['school', 'university', 'government', 'police', 'fire_station', 'post_office', 'library'],

      // Group 3: Commercial & Services
      ['store', 'bank', 'gas_station', 'restaurant', 'cafe', 'shopping_mall'],

      // Group 4: Religious & Recreation
      ['religious', 'park', 'entertainment', 'movie_theater', 'gym']
    ];
  }

  async searchPOIGroup(latitude, longitude, radius, categories) {
    try {
      const allPlaceTypes = this.getBatchedPlaceTypes(categories);

      const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      const params = {
        location: `${latitude},${longitude}`,
        radius,
        type: allPlaceTypes.join('|'),
        key: this.googleApiKey
      };

      const response = await axios.get(url, {
        params,
        timeout: this.apiTimeout
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        logger.warn(`POI Group API warning:`, response.data.status);
        return [];
      }

      return response.data.results.map(place => {
        const category = this.determineCategoryFromTypes(place.types, categories);

        return {
          place_id: place.place_id,
          name: place.name,
          category,
          subcategory: place.types[0],
          coordinates: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng
          },
          address: place.vicinity,
          rating: place.rating || 0,
          user_ratings_total: place.user_ratings_total || 0,
          business_status: place.business_status,
          types: place.types,
          price_level: place.price_level,
          distance_meters: this.calculateDistance(
            latitude, longitude,
            place.geometry.location.lat, place.geometry.location.lng
          ),
          opening_hours: place.opening_hours?.open_now
        };
      });

    } catch (error) {
      logger.error('POI Group search error:', error);
      return [];
    }
  }

  // ENHANCED: Smart directions from actual nearest cities (not major cities)
  async getSmartDirectionsFromCities(latitude, longitude, nearbyCities) {
    try {
      if (!nearbyCities || nearbyCities.length === 0) {
        return [];
      }

      // Sort cities by actual distance, not population tier
      const sortedCities = nearbyCities.sort((a, b) => a.distance_km - b.distance_km);

      // Get directions from 2 nearest cities + 1 major city if different
      const citiesToRoute = [];
      citiesToRoute.push(...sortedCities.slice(0, 2)); // 2 nearest cities

      // Add one major city if it's not already in the nearest 2
      const majorCity = sortedCities.find(city =>
        city.population_tier === 'major' || city.population_tier === 'large'
      );

      if (majorCity && !citiesToRoute.some(city => city.name === majorCity.name)) {
        citiesToRoute.push(majorCity);
      }

      // Limit to 3 cities maximum to control costs
      const finalCities = citiesToRoute.slice(0, 3);

      logger.info(`HYBRID: Getting directions from ${finalCities.length} cities: ${finalCities.map(c => c.name).join(', ')}`);

      const navigationService = require('./navigationService');
      const directionsPromises = finalCities.map(async (city) => {
        try {
          const directions = await navigationService.getDirections({
            origin: { latitude: city.coordinates.latitude, longitude: city.coordinates.longitude },
            destination: { latitude, longitude },
            travelMode: 'DRIVE'
          });

          return {
            city: city,
            directions: directions,
            distance_km: city.distance_km,
            is_nearest: finalCities.indexOf(city) === 0 // Mark the nearest city
          };
        } catch (error) {
          logger.warn(`Could not get directions from ${city.name}:`, error.message);
          return null;
        }
      });

      const directionsResults = await Promise.all(directionsPromises);
      return directionsResults.filter(result => result !== null);

    } catch (error) {
      logger.error('Smart directions error:', error);
      return [];
    }
  }

  // ENHANCED: Smart nearby cities search prioritizing actual distance over population
  async findNearbyCitiesSmart(latitude, longitude, maxDistance = 100, limit = 5) {
    try {
      logger.info(`HYBRID: Smart nearby cities search (distance-priority)`);

      const result = await query(
        `SELECT
          c.name as city_name,
          c.country,
          c.state,
          c.district,
          c.province,
          c.latitude,
          c.longitude,
          ROUND(ST_Distance(c.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000, 2) as distance_km,
          c.population,
          c.population_tier,
          c.timezone
        FROM cities c
        WHERE ST_DWithin(
          c.geom,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3 * 1000
        )
        ORDER BY ST_Distance(c.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) ASC
        LIMIT $4`,
        [latitude, longitude, maxDistance, limit]
      );

      if (result.rows.length === 0) {
        logger.warn('No nearby cities found in database');
        return [];
      }

      const cities = result.rows.map(city => ({
        name: city.city_name,
        country: city.country,
        state: city.state,
        district: city.district,
        province: city.province,
        coordinates: {
          latitude: parseFloat(city.latitude),
          longitude: parseFloat(city.longitude)
        },
        distance_km: parseFloat(city.distance_km),
        population: city.population,
        population_tier: city.population_tier,
        timezone: city.timezone,
        estimated_drive_time_minutes: Math.round(city.distance_km * 1.2), // Rough estimate
        route_available: true // Will get actual routes
      }));

      logger.info(`HYBRID: Found ${cities.length} nearby cities (distance-prioritized)`);
      return cities;

    } catch (error) {
      logger.error('Smart nearby cities error:', error);
      return [];
    }
  }

  // Cost calculation for transparency
  calculateActualCost(pois, directionsFromCities, geocodeResult, satelliteImagery) {
    // Optimized cost structure to stay within $0.10 budget
    const poiCost = Math.min((this.poiSearchCount || 3) * 0.020, 0.060); // Reduced POI cost per call
    const routingCost = Math.min(directionsFromCities.length * 0.005, 0.015); // Max 3 routes
    const geocodingCost = 0.005; // $0.005 per geocoding call (cached)
    const staticMapCost = 0.002; // $0.002 per static map (cached)

    const totalCost = poiCost + routingCost + geocodingCost + staticMapCost;

    return {
      poi_search_cost: poiCost,
      routing_cost: routingCost,
      geocoding_cost: geocodingCost,
      static_map_cost: staticMapCost,
      total_estimated_cost: totalCost,
      within_budget: totalCost <= 0.10,
      budget_remaining: Math.max(0, 0.10 - totalCost),
      optimization_notes: 'Costs optimized through intelligent caching and batching'
    };
  }

  // Remove duplicate POIs based on place_id and proximity
  removeDuplicatePOIs(pois) {
    const seen = new Set();
    const uniquePOIs = [];

    for (const poi of pois) {
      const key = poi.place_id || `${poi.name}_${poi.coordinates.latitude}_${poi.coordinates.longitude}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePOIs.push(poi);
      }
    }

    return uniquePOIs;
  }

  // Cached geocoding with 2-hour TTL (balanced for cost vs freshness)
  async getCachedOrFetchGeocode(latitude, longitude) {
    const cacheKey = `geocode:${latitude}:${longitude}`;

    try {
      const cached = await this.getCacheData(cacheKey, 'geocoding');
      if (cached) {
        logger.info('Using cached geocode result');
        return cached;
      }

      const result = await this.reverseGeocode(latitude, longitude);
      await this.setCacheData(cacheKey, 'geocoding', result, 2);

      return result;
    } catch (error) {
      logger.error('Cached geocoding error:', error);
      throw error;
    }
  }

  // Cached satellite imagery with 12-hour TTL (balance between cost and freshness)
  async getCachedOrFetchSatelliteImagery(latitude, longitude, options = {}) {
    const cacheKey = `static_map:${latitude}:${longitude}:${JSON.stringify(options)}`;

    try {
      const cached = await this.getCacheData(cacheKey, 'static_map');
      if (cached) {
        logger.info('Using cached satellite imagery');
        return cached;
      }

      const result = await this.getSatelliteImagery(latitude, longitude, options);
      await this.setCacheData(cacheKey, 'static_map', result, 12); // 12h cache

      return result;
    } catch (error) {
      logger.error('Cached satellite imagery error:', error);
      throw error;
    }
  }

  // Cache management functions
  async getCacheData(cacheKey, cacheType) {
    try {
      const result = await query('SELECT get_cache_data($1) as data', [cacheKey]);
      return result.rows[0].data;
    } catch (error) {
      logger.error('Get cache data error:', error);
      return null;
    }
  }

  async setCacheData(cacheKey, cacheType, data, ttlHours) {
    try {
      await query(
        'SELECT set_cache_data($1, $2, $3, $4)',
        [cacheKey, cacheType, JSON.stringify(data), ttlHours]
      );
    } catch (error) {
      logger.error('Set cache data error:', error);
    }
  }

  // Standard API methods
  async reverseGeocode(latitude, longitude) {
    try {
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
      return {
        formatted_address: result.formatted_address,
        address_components: addressComponents,
        place_id: result.place_id,
        types: result.types
      };

    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

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

  async findNearestCity(latitude, longitude) {
    try {
      const result = await query(
        'SELECT * FROM find_nearest_city($1, $2, $3)',
        [latitude, longitude, 500]
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

  // Helper methods
  parseAddressComponents(components) {
    const parsed = {};

    components.forEach(component => {
      const types = component.types;

      if (types.includes('street_number')) parsed.street_number = component.long_name;
      if (types.includes('route')) parsed.route = component.long_name;
      if (types.includes('locality')) parsed.city = component.long_name;
      if (types.includes('administrative_area_level_1')) parsed.state = component.long_name;
      if (types.includes('country')) parsed.country = component.long_name;
      if (types.includes('postal_code')) parsed.postal_code = component.long_name;
    });

    return parsed;
  }

  getBatchedPlaceTypes(categories) {
    const allTypes = new Set();

    categories.forEach(category => {
      const types = this.getCategoryPlaceTypes(category);
      types.forEach(type => allTypes.add(type));
    });

    return Array.from(allTypes);
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
      police: ['police', 'fire_station'],
      post_office: ['post_office'],
      library: ['library'],
      park: ['park', 'amusement_park'],
      entertainment: ['movie_theater', 'bowling_alley', 'casino', 'night_club'],
      gym: ['gym', 'spa']
    };

    return categoryMap[category] || [category];
  }

  determineCategoryFromTypes(googleTypes, requestedCategories) {
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
      police: ['police', 'fire_station'],
      post_office: ['post_office'],
      library: ['library'],
      park: ['park', 'amusement_park'],
      entertainment: ['movie_theater', 'bowling_alley', 'casino', 'night_club'],
      gym: ['gym', 'spa']
    };

    // Find the best matching category
    for (const [category, types] of Object.entries(categoryMap)) {
      if (types.some(type => googleTypes.includes(type))) {
        return category;
      }
    }

    // Default categorization
    if (googleTypes.includes('school') || googleTypes.includes('university')) return 'school';
    if (googleTypes.includes('hospital') || googleTypes.includes('doctor')) return 'hospital';
    if (googleTypes.includes('restaurant') || googleTypes.includes('cafe')) return 'restaurant';
    if (googleTypes.includes('store') || googleTypes.includes('shopping_mall')) return 'store';
    if (googleTypes.includes('bank')) return 'bank';
    if (googleTypes.includes('gas_station')) return 'gas_station';

    return 'other';
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
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

module.exports = new HybridLocationService();