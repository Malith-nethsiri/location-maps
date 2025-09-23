const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class POIService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.apiTimeout = parseInt(process.env.GOOGLE_API_TIMEOUT) || 5000;
  }

  // Search for nearby POIs
  async searchNearbyPOIs({ latitude, longitude, radius = 5000, categories = [] }) {
    try {
      const startTime = Date.now();

      // Check cache first
      const cachedPOIs = await this.getCachedPOIs(latitude, longitude, radius, categories);
      if (cachedPOIs.length > 0) {
        logger.info(`Returning ${cachedPOIs.length} cached POIs`);
        return cachedPOIs;
      }

      // If not cached, search using Google Places API
      const pois = [];

      for (const category of categories) {
        try {
          const categoryPOIs = await this.searchByCategory(latitude, longitude, radius, category);
          pois.push(...categoryPOIs);
        } catch (error) {
          logger.warn(`Failed to search POIs for category ${category}:`, error.message);
        }
      }

      // Remove duplicates and sort by distance
      const uniquePOIs = this.removeDuplicatePOIs(pois);
      const sortedPOIs = uniquePOIs.sort((a, b) => a.distance_meters - b.distance_meters);

      // Cache results
      await this.cachePOIResults(sortedPOIs);

      const responseTime = Date.now() - startTime;
      logger.info(`Found ${sortedPOIs.length} POIs in ${responseTime}ms`);

      return sortedPOIs;

    } catch (error) {
      logger.error('Search nearby POIs error:', error);
      throw new Error('Failed to search nearby POIs');
    }
  }

  // Search POIs by specific category
  async searchByCategory(latitude, longitude, radius, category) {
    const placeTypes = this.getCategoryPlaceTypes(category);
    const categoryPOIs = [];

    for (const placeType of placeTypes) {
      try {
        const places = await this.googlePlacesNearbySearch(latitude, longitude, radius, placeType);

        const enrichedPlaces = places.map(place => ({
          place_id: place.place_id,
          name: place.name,
          category,
          subcategory: placeType,
          coordinates: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng
          },
          address: place.vicinity || place.formatted_address,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          business_status: place.business_status,
          price_level: place.price_level,
          types: place.types,
          opening_hours: place.opening_hours,
          photos: place.photos ? place.photos.slice(0, 3) : [], // Limit to 3 photos
          distance_meters: this.calculateDistance(
            latitude, longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          )
        }));

        categoryPOIs.push(...enrichedPlaces);

      } catch (error) {
        logger.warn(`Failed to search places for type ${placeType}:`, error.message);
      }
    }

    return categoryPOIs;
  }

  // Google Places Nearby Search
  async googlePlacesNearbySearch(latitude, longitude, radius, type) {
    try {
      const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      const params = {
        location: `${latitude},${longitude}`,
        radius: Math.min(radius, 50000), // Google Places API max radius is 50km
        type,
        key: this.googleApiKey
      };

      const response = await axios.get(url, {
        params,
        timeout: this.apiTimeout
      });

      if (response.data.status === 'ZERO_RESULTS') {
        return [];
      }

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.results || [];

    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Google Places API rate limit exceeded');
      }
      throw error;
    }
  }

  // Get detailed POI information
  async getPOIDetails(placeId) {
    try {
      // Check cache first
      const cachedPOI = await this.getCachedPOIDetails(placeId);
      if (cachedPOI) {
        return cachedPOI;
      }

      // Fetch from Google Places API
      const url = 'https://maps.googleapis.com/maps/api/place/details/json';
      const params = {
        place_id: placeId,
        fields: 'place_id,name,rating,user_ratings_total,price_level,opening_hours,website,formatted_phone_number,formatted_address,geometry,types,business_status,reviews',
        key: this.googleApiKey
      };

      const response = await axios.get(url, {
        params,
        timeout: this.apiTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Place Details API error: ${response.data.status}`);
      }

      const place = response.data.result;
      const detailedPOI = {
        place_id: place.place_id,
        name: place.name,
        coordinates: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        address: place.formatted_address,
        phone_number: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        price_level: place.price_level,
        business_status: place.business_status,
        types: place.types,
        opening_hours: place.opening_hours,
        reviews: place.reviews ? place.reviews.slice(0, 5) : [] // Limit to 5 reviews
      };

      // Cache the detailed result
      await this.cacheDetailedPOI(detailedPOI);

      return detailedPOI;

    } catch (error) {
      logger.error(`Get POI details error for ${placeId}:`, error);
      throw new Error('Failed to get POI details');
    }
  }

  // Calculate distances between origin and multiple destinations
  async calculateDistances(origin, destinations, units = 'metric') {
    try {
      const distances = [];

      // Use Google Distance Matrix API for accurate distances
      const batchSize = 10; // Google allows max 10 destinations per request

      for (let i = 0; i < destinations.length; i += batchSize) {
        const batch = destinations.slice(i, i + batchSize);
        const batchDistances = await this.getDistanceMatrix(origin, batch, units);
        distances.push(...batchDistances);
      }

      return distances;

    } catch (error) {
      logger.error('Calculate distances error:', error);

      // Fallback to straight-line distance calculation
      return destinations.map((dest, index) => ({
        destination_index: index,
        destination: dest,
        distance: this.calculateStraightLineDistance(origin, dest),
        duration: null,
        status: 'FALLBACK_CALCULATED'
      }));
    }
  }

  // Google Distance Matrix API
  async getDistanceMatrix(origin, destinations, units) {
    try {
      const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
      const params = {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: destinations.map(d => `${d.latitude},${d.longitude}`).join('|'),
        units,
        key: this.googleApiKey
      };

      const response = await axios.get(url, {
        params,
        timeout: this.apiTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Distance Matrix API error: ${response.data.status}`);
      }

      const elements = response.data.rows[0].elements;

      return destinations.map((dest, index) => {
        const element = elements[index];
        return {
          destination_index: index,
          destination: dest,
          distance: element.status === 'OK' ? element.distance : null,
          duration: element.status === 'OK' ? element.duration : null,
          status: element.status
        };
      });

    } catch (error) {
      logger.error('Distance Matrix API error:', error);
      throw error;
    }
  }

  // Helper methods
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

  calculateStraightLineDistance(origin, destination) {
    const distance = this.calculateDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );

    return {
      text: `${(distance / 1000).toFixed(1)} km`,
      value: distance
    };
  }

  removeDuplicatePOIs(pois) {
    const seen = new Set();
    return pois.filter(poi => {
      const key = poi.place_id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Cache methods
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

  async getCachedPOIDetails(placeId) {
    try {
      const result = await query(
        'SELECT * FROM pois WHERE google_place_id = $1',
        [placeId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const poi = result.rows[0];
      return {
        place_id: poi.google_place_id,
        name: poi.name,
        category: poi.category,
        subcategory: poi.subcategory,
        coordinates: {
          latitude: parseFloat(poi.latitude),
          longitude: parseFloat(poi.longitude)
        },
        address: poi.address,
        phone_number: poi.phone_number,
        website: poi.website,
        rating: poi.rating ? parseFloat(poi.rating) : null,
        user_ratings_total: poi.user_ratings_total,
        business_status: poi.business_status,
        opening_hours: poi.opening_hours,
        types: poi.google_types
      };

    } catch (error) {
      logger.error('Get cached POI details error:', error);
      return null;
    }
  }

  async cachePOIResults(pois) {
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
      logger.error('Cache POI results error:', error);
    }
  }

  async cacheDetailedPOI(poi) {
    try {
      await query(
        `INSERT INTO pois (google_place_id, name, latitude, longitude, address, phone_number, website, rating, user_ratings_total, business_status, opening_hours, google_types)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (google_place_id) DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         phone_number = EXCLUDED.phone_number,
         website = EXCLUDED.website,
         rating = EXCLUDED.rating,
         user_ratings_total = EXCLUDED.user_ratings_total,
         business_status = EXCLUDED.business_status,
         opening_hours = EXCLUDED.opening_hours,
         google_types = EXCLUDED.google_types,
         updated_at = CURRENT_TIMESTAMP`,
        [
          poi.place_id,
          poi.name,
          poi.coordinates.latitude,
          poi.coordinates.longitude,
          poi.address,
          poi.phone_number,
          poi.website,
          poi.rating,
          poi.user_ratings_total,
          poi.business_status,
          JSON.stringify(poi.opening_hours),
          poi.types
        ]
      );
    } catch (error) {
      logger.error('Cache detailed POI error:', error);
    }
  }
}

module.exports = new POIService();