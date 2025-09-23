const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class NavigationService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.apiTimeout = parseInt(process.env.GOOGLE_API_TIMEOUT) || 5000;
  }

  // Get directions using Google Routes API (2025)
  async getDirections({ origin, destination, travelMode = 'DRIVE', units = 'metric' }) {
    try {
      // Check cache first
      const cachedRoute = await this.getCachedRoute(origin, destination, travelMode);
      if (cachedRoute) {
        logger.info('Returning cached route');
        return cachedRoute;
      }

      // Use Google Routes API (2025) - POST request format
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
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false
        },
        languageCode: 'en-US',
        units: units.toUpperCase()
      };

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.googleApiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues'
        },
        timeout: this.apiTimeout
      });

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      const directionsResult = {
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
        polyline: route.polyline.encodedPolyline,
        steps: this.parseNavigationSteps(leg.steps),
        overview: this.generateRouteOverview(leg.steps)
      };

      // Cache the result
      await this.cacheRoute(directionsResult);

      return directionsResult;

    } catch (error) {
      logger.error('Get directions error:', error);

      // Fallback to older Directions API if Routes API fails
      try {
        return await this.getDirectionsFallback(origin, destination, travelMode, units);
      } catch (fallbackError) {
        logger.error('Directions fallback also failed:', fallbackError);
        throw new Error('Failed to get directions from all available APIs');
      }
    }
  }

  // Fallback to Google Directions API (Legacy)
  async getDirectionsFallback(origin, destination, travelMode, units) {
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
      throw new Error(`Directions API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    return {
      origin,
      destination,
      travel_mode: travelMode,
      distance: leg.distance,
      duration: leg.duration,
      polyline: route.overview_polyline.points,
      steps: leg.steps.map(step => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
        distance: step.distance,
        duration: step.duration,
        start_location: step.start_location,
        end_location: step.end_location
      })),
      overview: `Route from ${leg.start_address} to ${leg.end_address}`
    };
  }

  // Get route to nearest city
  async getRouteToNearestCity({ latitude, longitude, travelMode = 'DRIVE', units = 'metric' }) {
    try {
      // Find nearest city
      const result = await query(
        'SELECT * FROM find_nearest_city($1, $2, $3)',
        [latitude, longitude, 500]
      );

      if (result.rows.length === 0) {
        throw new Error('No nearby cities found');
      }

      const nearestCity = result.rows[0];
      const destination = {
        latitude: parseFloat(nearestCity.latitude),
        longitude: parseFloat(nearestCity.longitude)
      };

      // Get directions to nearest city
      const directions = await this.getDirections({
        origin: { latitude, longitude },
        destination,
        travelMode,
        units
      });

      return {
        nearest_city: {
          name: nearestCity.city_name,
          country: nearestCity.country,
          state: nearestCity.state,
          coordinates: destination,
          distance_km: parseFloat(nearestCity.distance_km),
          population: nearestCity.population,
          timezone: nearestCity.timezone
        },
        route: directions
      };

    } catch (error) {
      logger.error('Get route to nearest city error:', error);
      throw new Error('Failed to get route to nearest city');
    }
  }

  // Get distance matrix between multiple points
  async getDistanceMatrix({ origins, destinations, travelMode = 'DRIVE', units = 'metric' }) {
    try {
      const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
      const params = {
        origins: origins.map(o => `${o.latitude},${o.longitude}`).join('|'),
        destinations: destinations.map(d => `${d.latitude},${d.longitude}`).join('|'),
        mode: travelMode.toLowerCase(),
        units,
        key: this.googleApiKey
      };

      const response = await axios.get(url, {
        params,
        timeout: this.apiTimeout * 2 // Distance matrix may take longer
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Distance Matrix API error: ${response.data.status}`);
      }

      const matrix = {
        origins,
        destinations,
        travel_mode: travelMode,
        units,
        rows: response.data.rows.map((row, originIndex) => ({
          origin_index: originIndex,
          origin: origins[originIndex],
          elements: row.elements.map((element, destIndex) => ({
            destination_index: destIndex,
            destination: destinations[destIndex],
            distance: element.distance,
            duration: element.duration,
            status: element.status
          }))
        }))
      };

      return matrix;

    } catch (error) {
      logger.error('Get distance matrix error:', error);
      throw new Error('Failed to get distance matrix');
    }
  }

  // Optimize waypoints for shortest route
  async optimizeWaypoints({ origin, destination, waypoints, travelMode = 'DRIVE', units = 'metric' }) {
    try {
      const url = 'https://maps.googleapis.com/maps/api/directions/json';
      const params = {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        waypoints: `optimize:true|${waypoints.map(w => `${w.latitude},${w.longitude}`).join('|')}`,
        mode: travelMode.toLowerCase(),
        units,
        key: this.googleApiKey
      };

      const response = await axios.get(url, { params, timeout: this.apiTimeout * 2 });

      if (response.data.status !== 'OK') {
        throw new Error(`Waypoint optimization error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const waypointOrder = response.data.routes[0].waypoint_order;

      return {
        origin,
        destination,
        original_waypoints: waypoints,
        optimized_waypoints: waypointOrder.map(index => waypoints[index]),
        waypoint_order: waypointOrder,
        route: {
          distance: route.legs.reduce((total, leg) => ({
            value: total.value + leg.distance.value,
            text: this.formatDistance(total.value + leg.distance.value, units)
          }), { value: 0, text: '0 km' }),
          duration: route.legs.reduce((total, leg) => ({
            value: total.value + leg.duration.value,
            text: this.formatDuration(total.value + leg.duration.value)
          }), { value: 0, text: '0 mins' }),
          polyline: route.overview_polyline.points
        }
      };

    } catch (error) {
      logger.error('Optimize waypoints error:', error);
      throw new Error('Failed to optimize waypoints');
    }
  }

  // Helper methods
  parseNavigationSteps(steps) {
    return steps.map((step, index) => ({
      step_number: index + 1,
      instruction: step.navigationInstruction?.instructions || 'Continue straight',
      distance: step.localizedValues?.distance || null,
      duration: step.localizedValues?.duration || null,
      maneuver: step.navigationInstruction?.maneuver || 'straight'
    }));
  }

  generateRouteOverview(steps) {
    const majorInstructions = steps
      .filter(step => step.navigationInstruction?.instructions)
      .slice(0, 5) // Get first 5 major steps
      .map(step => step.navigationInstruction.instructions);

    return majorInstructions.length > 0
      ? majorInstructions.join(' → ')
      : 'Route available';
  }

  formatDistance(meters, units) {
    if (units === 'imperial') {
      const miles = meters * 0.000621371;
      return miles >= 1
        ? `${miles.toFixed(1)} mi`
        : `${Math.round(meters * 3.28084)} ft`;
    } else {
      return meters >= 1000
        ? `${(meters / 1000).toFixed(1)} km`
        : `${Math.round(meters)} m`;
    }
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Cache methods
  async getCachedRoute(origin, destination, travelMode) {
    try {
      const result = await query(
        `SELECT * FROM routes
         WHERE origin_lat = $1 AND origin_lng = $2
         AND destination_lat = $3 AND destination_lng = $4
         AND travel_mode = $5
         AND expires_at > CURRENT_TIMESTAMP`,
        [
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude,
          travelMode
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const route = result.rows[0];
      return {
        origin,
        destination,
        travel_mode: route.travel_mode,
        distance: {
          meters: route.distance_meters,
          text: this.formatDistance(route.distance_meters, 'metric')
        },
        duration: {
          seconds: route.duration_seconds,
          text: this.formatDuration(route.duration_seconds)
        },
        polyline: route.route_polyline,
        steps: route.steps || [],
        cached: true
      };

    } catch (error) {
      logger.error('Get cached route error:', error);
      return null;
    }
  }

  async cacheRoute(routeData) {
    try {
      await query(
        `INSERT INTO routes (origin_lat, origin_lng, destination_lat, destination_lng, travel_mode, route_polyline, distance_meters, duration_seconds, steps)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (origin_lat, origin_lng, destination_lat, destination_lng, travel_mode)
         DO UPDATE SET
         route_polyline = EXCLUDED.route_polyline,
         distance_meters = EXCLUDED.distance_meters,
         duration_seconds = EXCLUDED.duration_seconds,
         steps = EXCLUDED.steps,
         expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'`,
        [
          routeData.origin.latitude,
          routeData.origin.longitude,
          routeData.destination.latitude,
          routeData.destination.longitude,
          routeData.travel_mode,
          routeData.polyline,
          routeData.distance.meters,
          routeData.duration.seconds,
          JSON.stringify(routeData.steps)
        ]
      );
    } catch (error) {
      logger.error('Cache route error:', error);
    }
  }

  // Cleanup expired routes
  async cleanupExpiredRoutes() {
    try {
      const result = await query('SELECT clean_expired_routes()');
      const deletedCount = result.rows[0].clean_expired_routes;
      logger.info(`Cleaned up ${deletedCount} expired routes`);
      return deletedCount;
    } catch (error) {
      logger.error('Cleanup expired routes error:', error);
      return 0;
    }
  }
}

module.exports = new NavigationService();