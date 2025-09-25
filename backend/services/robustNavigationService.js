const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class RobustNavigationService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.apiTimeout = parseInt(process.env.GOOGLE_API_TIMEOUT) || 5000;
  }

  // ROBUST: Get directions with multiple fallbacks and error handling
  async getDirections({ origin, destination, travelMode = 'DRIVE', units = 'metric' }) {
    try {
      logger.info(`Getting directions from ${origin.latitude},${origin.longitude} to ${destination.latitude},${destination.longitude}`);

      // Try multiple approaches in order of preference
      const approaches = [
        () => this.getDirectionsRoutesAPI(origin, destination, travelMode, units),
        () => this.getDirectionsLegacyAPI(origin, destination, travelMode, units),
        () => this.getDirectionsEstimate(origin, destination, travelMode, units)
      ];

      for (const approach of approaches) {
        try {
          const result = await approach();
          if (result) {
            logger.info(`Directions obtained successfully via ${result.source || 'API'}`);
            return result;
          }
        } catch (error) {
          logger.warn(`Directions approach failed: ${error.message}`);
          continue;
        }
      }

      throw new Error('All direction APIs failed');

    } catch (error) {
      logger.error('Get directions error:', error);
      // Return estimated directions as last resort
      return this.getDirectionsEstimate(origin, destination, travelMode, units);
    }
  }

  // Try Google Routes API (2025)
  async getDirectionsRoutesAPI(origin, destination, travelMode, units) {
    if (!this.googleApiKey) {
      throw new Error('Google API key not configured');
    }

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude
          }
        }
      },
      travelMode: travelMode,
      routingPreference: 'TRAFFIC_UNAWARE', // Faster, more reliable
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: units.toUpperCase()
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.googleApiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps'
      },
      timeout: this.apiTimeout
    });

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No routes found in Routes API');
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    return {
      source: 'Routes API (2025)',
      origin,
      destination,
      travel_mode: travelMode,
      distance: {
        meters: route.distanceMeters,
        text: this.formatDistance(route.distanceMeters, units)
      },
      duration: {
        seconds: parseInt(route.duration.replace('s', '')),
        text: this.formatDuration(parseInt(route.duration.replace('s', '')))
      },
      steps: this.parseStepsFromRoutesAPI(leg.steps || [])
    };
  }

  // Try Google Directions API (Legacy)
  async getDirectionsLegacyAPI(origin, destination, travelMode, units) {
    if (!this.googleApiKey) {
      throw new Error('Google API key not configured');
    }

    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = {
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: travelMode.toLowerCase(),
      units,
      key: this.googleApiKey
    };

    const response = await axios.get(url, { params, timeout: this.apiTimeout });

    if (response.data.status !== 'OK') {
      throw new Error(`Legacy Directions API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    return {
      source: 'Directions API (Legacy)',
      origin,
      destination,
      travel_mode: travelMode,
      distance: leg.distance,
      duration: leg.duration,
      steps: this.parseStepsFromLegacyAPI(leg.steps || [])
    };
  }

  // Fallback: Estimate directions using distance calculation
  async getDirectionsEstimate(origin, destination, travelMode, units) {
    logger.info('Using estimated directions (no API available)');

    const distanceKm = this.calculateDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    ) / 1000;

    // Estimate travel time based on mode
    const speedKmh = travelMode === 'DRIVE' ? 50 : travelMode === 'WALK' ? 5 : 15;
    const timeHours = distanceKm / speedKmh;
    const timeMinutes = Math.round(timeHours * 60);

    return {
      source: 'Distance Estimation',
      origin,
      destination,
      travel_mode: travelMode,
      distance: {
        meters: Math.round(distanceKm * 1000),
        text: distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`
      },
      duration: {
        seconds: timeMinutes * 60,
        text: timeMinutes < 60 ? `${timeMinutes} min` : `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`
      },
      steps: [{
        step_number: 1,
        instruction: `Head ${this.getDirection(origin, destination)} towards ${destination.name || 'destination'}`,
        distance: {
          meters: Math.round(distanceKm * 1000),
          text: distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`
        },
        duration: {
          seconds: timeMinutes * 60,
          text: timeMinutes < 60 ? `${timeMinutes} min` : `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`
        }
      }],
      estimated: true
    };
  }

  // Parse steps from Routes API
  parseStepsFromRoutesAPI(steps) {
    return steps.map((step, index) => ({
      step_number: index + 1,
      instruction: step.navigationInstruction?.instructions || `Step ${index + 1}`,
      distance: step.distanceMeters ? {
        meters: step.distanceMeters,
        text: this.formatDistance(step.distanceMeters)
      } : null,
      duration: step.staticDuration ? {
        seconds: parseInt(step.staticDuration.replace('s', '')),
        text: this.formatDuration(parseInt(step.staticDuration.replace('s', '')))
      } : null
    }));
  }

  // Parse steps from Legacy API
  parseStepsFromLegacyAPI(steps) {
    return steps.map((step, index) => ({
      step_number: index + 1,
      instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || `Step ${index + 1}`,
      distance: step.distance,
      duration: step.duration
    }));
  }

  // Get cardinal direction
  getDirection(origin, destination) {
    const lat1 = origin.latitude;
    const lng1 = origin.longitude;
    const lat2 = destination.latitude;
    const lng2 = destination.longitude;

    const dLng = lng2 - lng1;
    const dLat = lat2 - lat1;

    if (Math.abs(dLat) > Math.abs(dLng)) {
      return dLat > 0 ? 'north' : 'south';
    } else {
      return dLng > 0 ? 'east' : 'west';
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
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

    return R * c;
  }

  // Format distance for display
  formatDistance(meters, units = 'metric') {
    if (units === 'imperial') {
      const feet = meters * 3.28084;
      const miles = feet / 5280;
      return miles >= 1 ? `${miles.toFixed(1)} mi` : `${Math.round(feet)} ft`;
    }

    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  }

  // Format duration for display
  formatDuration(seconds) {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes} min`;
  }

  // Cache management (simplified for reliability)
  async getCachedRoute(origin, destination, travelMode) {
    try {
      const cacheKey = `route:${origin.latitude}:${origin.longitude}:${destination.latitude}:${destination.longitude}:${travelMode}`;
      const result = await query('SELECT get_cache_data($1) as data', [cacheKey]);
      return result.rows[0].data;
    } catch (error) {
      logger.warn('Cache retrieval failed:', error.message);
      return null;
    }
  }

  async cacheRoute(directionsResult) {
    try {
      const cacheKey = `route:${directionsResult.origin.latitude}:${directionsResult.origin.longitude}:${directionsResult.destination.latitude}:${directionsResult.destination.longitude}:${directionsResult.travel_mode}`;
      await query(
        'SELECT set_cache_data($1, $2, $3, $4)',
        [cacheKey, 'routes', JSON.stringify(directionsResult), 2] // 2 hours cache
      );
    } catch (error) {
      logger.warn('Cache storage failed:', error.message);
    }
  }
}

module.exports = new RobustNavigationService();