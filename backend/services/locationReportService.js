const pool = require('../config/database');
const logger = require('../utils/logger');
const axios = require('axios');

class LocationReportService {
    constructor() {
        this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api';
    }

    // Main function: GPS coordinates → Complete location intelligence for report
    async analyzeLocationForReport(coordinates, reportContext = {}) {
        try {
            const { latitude, longitude } = coordinates;
            logger.info(`Analyzing location for report: ${latitude}, ${longitude}`);

            // Run all location analysis in parallel for efficiency
            const [
                addressData,
                administrativeData,
                poiData,
                routeData,
                satelliteImageData
            ] = await Promise.all([
                this.getDetailedAddress(latitude, longitude),
                this.getAdministrativeHierarchy(latitude, longitude),
                this.getNearbyFacilitiesForReport(latitude, longitude),
                this.getRoutesFromMajorCities(latitude, longitude),
                this.generateSatelliteImageUrl(latitude, longitude)
            ]);

            // Compile location intelligence for report sections
            const locationIntelligence = {
                // Section 3.1: Property Identification - Location
                section31_location: {
                    village_name: administrativeData.village || 'Not Available',
                    pradeshiya_sabha: administrativeData.pradeshiyaSabha || 'Not Available',
                    korale: administrativeData.korale || 'Not Available',
                    hathpattu: administrativeData.hathpattu || 'Not Available',
                    district: administrativeData.district || 'Not Available',
                    province: administrativeData.province || 'Not Available',
                    latitude: latitude,
                    longitude: longitude,
                    formatted_address: addressData.formatted_address
                },

                // Section 4.1: Route Description (Raw data for AI enhancement)
                section41_route_data: {
                    nearest_major_city: routeData.nearestMajorCity,
                    route_instructions: routeData.basicInstructions,
                    distance_km: routeData.distance,
                    estimated_time: routeData.duration,
                    route_quality: routeData.roadQuality
                },

                // Section 4.2: Location Map
                section42_location_map: {
                    satellite_image_url: satelliteImageData.satellite_url,
                    hybrid_image_url: satelliteImageData.hybrid_url,
                    terrain_image_url: satelliteImageData.terrain_url
                },

                // Section 8.0: Locality Description - Facilities
                section80_locality_data: {
                    locality_type: this.determineLocalityType(poiData, addressData),
                    distance_to_town: routeData.distanceToNearestTown,
                    nearest_town: routeData.nearestTown,
                    development_level: this.assessDevelopmentLevel(poiData),
                    infrastructure_description: this.generateInfrastructureDescription(poiData),
                    nearby_facilities: this.formatFacilitiesForReport(poiData)
                },

                // Raw data for AI processing
                raw_data: {
                    address_components: addressData.address_components,
                    poi_analysis: poiData,
                    route_analysis: routeData,
                    administrative_hierarchy: administrativeData
                }
            };

            // Cache the location analysis for reuse
            await this.cacheLocationAnalysis(coordinates, locationIntelligence);

            return {
                success: true,
                location_intelligence: locationIntelligence,
                coordinates: { latitude, longitude },
                analysis_timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Location analysis for report failed:', error);
            throw error;
        }
    }

    // Get detailed address information
    async getDetailedAddress(latitude, longitude) {
        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    latlng: `${latitude},${longitude}`,
                    key: this.googleApiKey,
                    result_type: 'street_address|route|locality|administrative_area_level_1|country',
                    language: 'en'
                }
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    formatted_address: result.formatted_address,
                    address_components: result.address_components,
                    place_id: result.place_id
                };
            }

            throw new Error('Geocoding failed');

        } catch (error) {
            logger.error('Geocoding error:', error);
            return {
                formatted_address: `Location at ${latitude}, ${longitude}`,
                address_components: [],
                place_id: null
            };
        }
    }

    // Get Sri Lankan administrative hierarchy
    async getAdministrativeHierarchy(latitude, longitude) {
        try {
            // First try to get from our database
            const cachedData = await this.getCachedAdministrativeData(latitude, longitude);
            if (cachedData) {
                return cachedData;
            }

            // If not cached, use Google Geocoding to identify administrative levels
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    latlng: `${latitude},${longitude}`,
                    key: this.googleApiKey,
                    result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3|locality|sublocality',
                    language: 'en'
                }
            });

            if (response.data.status === 'OK') {
                const administrativeData = this.parseAdministrativeComponents(response.data.results);

                // Cache for future use
                await this.cacheAdministrativeData(latitude, longitude, administrativeData);

                return administrativeData;
            }

            return this.getDefaultAdministrativeData();

        } catch (error) {
            logger.error('Administrative hierarchy error:', error);
            return this.getDefaultAdministrativeData();
        }
    }

    // Get comprehensive POI data organized for valuation reports
    async getNearbyFacilitiesForReport(latitude, longitude) {
        try {
            const facilityCategories = {
                educational: ['school', 'university', 'library'],
                medical: ['hospital', 'pharmacy', 'doctor'],
                financial: ['bank', 'atm'],
                commercial: ['shopping_mall', 'supermarket', 'gas_station'],
                transport: ['bus_station', 'train_station', 'airport'],
                government: ['city_hall', 'police', 'post_office'],
                religious: ['church', 'temple', 'mosque'],
                recreation: ['park', 'gym', 'restaurant']
            };

            const facilityPromises = Object.entries(facilityCategories).map(
                ([category, types]) => this.searchNearbyByCategory(latitude, longitude, types, category)
            );

            const facilityResults = await Promise.all(facilityPromises);

            // Organize results by category for report
            const organizedFacilities = {};
            facilityResults.forEach((result, index) => {
                const categoryName = Object.keys(facilityCategories)[index];
                organizedFacilities[categoryName] = result;
            });

            return organizedFacilities;

        } catch (error) {
            logger.error('POI search error:', error);
            return {};
        }
    }

    // Search nearby facilities by category with multiple radius attempts
    async searchNearbyByCategory(latitude, longitude, types, category) {
        const radii = [1000, 3000, 5000]; // 1km, 3km, 5km
        let allResults = [];

        for (const radius of radii) {
            try {
                for (const type of types) {
                    const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, {
                        params: {
                            location: `${latitude},${longitude}`,
                            radius: radius,
                            type: type,
                            key: this.googleApiKey
                        }
                    });

                    if (response.data.status === 'OK') {
                        const results = response.data.results.map(place => ({
                            name: place.name,
                            type: type,
                            category: category,
                            distance: this.calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng),
                            rating: place.rating || null,
                            address: place.vicinity || '',
                            place_id: place.place_id
                        }));

                        allResults = allResults.concat(results);
                    }
                }

                // If we found enough facilities at this radius, don't search further
                if (allResults.length >= 5) break;

            } catch (error) {
                logger.warn(`POI search failed for ${category} at ${radius}m:`, error.message);
            }
        }

        // Remove duplicates and sort by distance
        const uniqueResults = allResults.filter((place, index, self) =>
            index === self.findIndex(p => p.place_id === place.place_id)
        );

        return uniqueResults.sort((a, b) => a.distance - b.distance).slice(0, 10);
    }

    // Get routes from major Sri Lankan cities
    async getRoutesFromMajorCities(latitude, longitude) {
        const majorCities = [
            { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
            { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
            { name: 'Galle', lat: 6.0535, lng: 80.2210 },
            { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
            { name: 'Negombo', lat: 7.2084, lng: 79.8438 },
            { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
            { name: 'Batticaloa', lat: 7.7102, lng: 81.6924 },
            { name: 'Matara', lat: 5.9549, lng: 80.5550 },
            { name: 'Ratnapura', lat: 6.6828, lng: 80.3992 },
            { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 }
        ];

        try {
            // Find nearest major city
            const citiesWithDistances = majorCities.map(city => ({
                ...city,
                distance: this.calculateDistance(latitude, longitude, city.lat, city.lng)
            }));

            const nearestCity = citiesWithDistances.sort((a, b) => a.distance - b.distance)[0];

            // Get detailed route from nearest major city
            const routeData = await this.getDetailedRoute(
                nearestCity.lat,
                nearestCity.lng,
                latitude,
                longitude
            );

            return {
                nearestMajorCity: nearestCity.name,
                nearestTown: nearestCity.name, // Can be enhanced with district capitals
                distanceToNearestTown: nearestCity.distance,
                basicInstructions: routeData.instructions,
                distance: routeData.distance,
                duration: routeData.duration,
                roadQuality: routeData.roadQuality
            };

        } catch (error) {
            logger.error('Route calculation error:', error);
            return {
                nearestMajorCity: 'Colombo',
                nearestTown: 'Colombo',
                distanceToNearestTown: 0,
                basicInstructions: 'Route data unavailable',
                distance: 0,
                duration: 0,
                roadQuality: 'Unknown'
            };
        }
    }

    // Get detailed route using Google Routes API
    async getDetailedRoute(fromLat, fromLng, toLat, toLng) {
        try {
            const response = await axios.post(
                'https://routes.googleapis.com/directions/v2:computeRoutes',
                {
                    origin: {
                        location: {
                            latLng: { latitude: fromLat, longitude: fromLng }
                        }
                    },
                    destination: {
                        location: {
                            latLng: { latitude: toLat, longitude: toLng }
                        }
                    },
                    travelMode: 'DRIVE',
                    routingPreference: 'TRAFFIC_AWARE',
                    computeAlternativeRoutes: false,
                    routeModifiers: {
                        avoidTolls: false,
                        avoidHighways: false,
                        avoidFerries: false
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': this.googleApiKey,
                        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps.navigationInstruction'
                    }
                }
            );

            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const instructions = this.extractRouteInstructions(route);

                return {
                    instructions: instructions,
                    distance: Math.round(route.distanceMeters / 1000), // Convert to km
                    duration: route.duration,
                    roadQuality: this.assessRoadQuality(route)
                };
            }

            throw new Error('No routes found');

        } catch (error) {
            logger.error('Detailed route error:', error);
            return {
                instructions: 'Detailed route unavailable',
                distance: 0,
                duration: '0s',
                roadQuality: 'Unknown'
            };
        }
    }

    // Generate satellite imagery URLs for report
    generateSatelliteImageUrl(latitude, longitude) {
        const baseParams = {
            center: `${latitude},${longitude}`,
            zoom: 16,
            size: '640x640',
            scale: 2,
            key: this.googleApiKey,
            markers: `color:red|label:P|${latitude},${longitude}`
        };

        return {
            satellite_url: `${this.baseUrl}/staticmap?${new URLSearchParams({
                ...baseParams,
                maptype: 'satellite'
            })}`,
            hybrid_url: `${this.baseUrl}/staticmap?${new URLSearchParams({
                ...baseParams,
                maptype: 'hybrid'
            })}`,
            terrain_url: `${this.baseUrl}/staticmap?${new URLSearchParams({
                ...baseParams,
                maptype: 'terrain'
            })}`
        };
    }

    // Helper functions for report data processing
    determineLocalityType(poiData, addressData) {
        const facilityCount = Object.values(poiData).reduce((count, category) => count + category.length, 0);

        if (facilityCount > 50) return 'urban commercial';
        if (facilityCount > 20) return 'semi-urban residential';
        if (facilityCount > 10) return 'suburban residential';
        return 'rural residential';
    }

    assessDevelopmentLevel(poiData) {
        const infraScore = this.calculateInfrastructureScore(poiData);

        if (infraScore > 80) return 'highly developed';
        if (infraScore > 60) return 'well developed';
        if (infraScore > 40) return 'moderately developed';
        if (infraScore > 20) return 'developing';
        return 'limited development';
    }

    generateInfrastructureDescription(poiData) {
        const descriptions = [];

        if (poiData.educational?.length > 0) descriptions.push('educational facilities');
        if (poiData.medical?.length > 0) descriptions.push('healthcare services');
        if (poiData.financial?.length > 0) descriptions.push('banking facilities');
        if (poiData.commercial?.length > 0) descriptions.push('commercial establishments');
        if (poiData.transport?.length > 0) descriptions.push('transport connectivity');

        return descriptions.length > 0
            ? `The area has good access to ${descriptions.join(', ')}`
            : 'Limited infrastructure facilities in the immediate vicinity';
    }

    formatFacilitiesForReport(poiData) {
        const formatted = [];

        Object.entries(poiData).forEach(([category, facilities]) => {
            if (facilities.length > 0) {
                const nearest = facilities.slice(0, 3);
                const facilityList = nearest.map(f => `${f.name} (${f.distance.toFixed(1)}km)`).join(', ');
                formatted.push(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${facilityList}`);
            }
        });

        return formatted;
    }

    // Cache functions for performance
    async cacheLocationAnalysis(coordinates, analysisData) {
        try {
            const query = `
                INSERT INTO location_analysis_cache (
                    latitude, longitude, analysis_data, created_at
                ) VALUES ($1, $2, $3, NOW())
                ON CONFLICT (latitude, longitude)
                DO UPDATE SET analysis_data = $3, created_at = NOW()
            `;

            await pool.query(query, [
                coordinates.latitude,
                coordinates.longitude,
                JSON.stringify(analysisData)
            ]);

        } catch (error) {
            logger.warn('Failed to cache location analysis:', error);
        }
    }

    async getCachedLocationAnalysis(coordinates) {
        try {
            const query = `
                SELECT analysis_data FROM location_analysis_cache
                WHERE latitude = $1 AND longitude = $2
                AND created_at > NOW() - INTERVAL '24 hours'
            `;

            const result = await pool.query(query, [coordinates.latitude, coordinates.longitude]);

            if (result.rows.length > 0) {
                return JSON.parse(result.rows[0].analysis_data);
            }

            return null;

        } catch (error) {
            logger.warn('Failed to get cached location analysis:', error);
            return null;
        }
    }

    // Utility functions
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    calculateInfrastructureScore(poiData) {
        const weights = {
            educational: 15,
            medical: 20,
            financial: 10,
            commercial: 15,
            transport: 20,
            government: 10,
            religious: 5,
            recreation: 5
        };

        let score = 0;
        Object.entries(poiData).forEach(([category, facilities]) => {
            const weight = weights[category] || 5;
            score += Math.min(facilities.length * 2, weight);
        });

        return Math.min(score, 100);
    }

    extractRouteInstructions(route) {
        try {
            const steps = route.legs[0]?.steps || [];
            return steps.map(step =>
                step.navigationInstruction?.instructions || 'Continue'
            ).join('. ');
        } catch (error) {
            return 'Route instructions unavailable';
        }
    }

    assessRoadQuality(route) {
        // This is a simplified assessment - could be enhanced with real road quality data
        const distance = route.distanceMeters;
        const duration = parseInt(route.duration.replace('s', ''));
        const avgSpeed = (distance / 1000) / (duration / 3600); // km/h

        if (avgSpeed > 60) return 'Excellent (Highway)';
        if (avgSpeed > 40) return 'Good (Main Roads)';
        if (avgSpeed > 25) return 'Fair (Secondary Roads)';
        return 'Poor (Local Roads)';
    }

    parseAdministrativeComponents(geocodeResults) {
        // Implementation for parsing Sri Lankan administrative levels
        // This would need to be customized based on actual Google Geocoding API responses for Sri Lanka
        const adminData = {
            village: null,
            pradeshiyaSabha: null,
            korale: null,
            hathpattu: null,
            district: null,
            province: null
        };

        // Extract from geocoding results based on administrative_area_level
        // This is a simplified version - real implementation would need detailed mapping
        for (const result of geocodeResults) {
            for (const component of result.address_components) {
                if (component.types.includes('administrative_area_level_1')) {
                    adminData.province = component.long_name;
                }
                if (component.types.includes('administrative_area_level_2')) {
                    adminData.district = component.long_name;
                }
                if (component.types.includes('locality')) {
                    adminData.village = component.long_name;
                }
            }
        }

        return adminData;
    }

    getDefaultAdministrativeData() {
        return {
            village: 'To be determined',
            pradeshiyaSabha: 'To be determined',
            korale: 'To be determined',
            hathpattu: 'To be determined',
            district: 'To be determined',
            province: 'To be determined'
        };
    }

    async getCachedAdministrativeData(latitude, longitude) {
        // Implementation for checking cached administrative data
        return null;
    }

    async cacheAdministrativeData(latitude, longitude, data) {
        // Implementation for caching administrative data
        return true;
    }
}

module.exports = new LocationReportService();