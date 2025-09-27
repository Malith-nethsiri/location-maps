import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  LocationAnalysisRequest,
  LocationAnalysis,
  NavigationRequest,
  Route,
  POISearchRequest,
  POI,
  DistanceMatrixRequest,
  ApiResponse,
  Coordinates,
  NearestCity,
  TravelMode
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);

        // Handle common error scenarios
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.response?.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please check your connection.');
        }

        throw error;
      }
    );
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('API health check failed');
    }
  }

  // Location Analysis
  async analyzeLocation(request: LocationAnalysisRequest): Promise<LocationAnalysis> {
    try {
      const response = await this.api.post<ApiResponse<LocationAnalysis>>(
        '/location/analyze',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Location analysis failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Location analysis error:', error);
      throw new Error(error.response?.data?.error || 'Failed to analyze location');
    }
  }

  // Reverse Geocoding
  async reverseGeocode(latitude: number, longitude: number): Promise<any> {
    try {
      const response = await this.api.post<ApiResponse<any>>(
        '/location/geocode',
        { latitude, longitude }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Geocoding failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Reverse geocoding error:', error);
      throw new Error(error.response?.data?.error || 'Failed to reverse geocode');
    }
  }

  // Get Satellite Imagery
  async getSatelliteImagery(
    latitude: number,
    longitude: number,
    zoom: number = 15,
    size: string = '400x400'
  ): Promise<any> {
    try {
      const response = await this.api.get<ApiResponse<any>>(
        `/location/satellite/${latitude}/${longitude}`,
        { params: { zoom, size } }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get satellite imagery');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Satellite imagery error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get satellite imagery');
    }
  }

  // Find Nearest City
  async findNearestCity(latitude: number, longitude: number): Promise<NearestCity | null> {
    try {
      const response = await this.api.get<ApiResponse<NearestCity>>(
        `/location/nearest-city/${latitude}/${longitude}`
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to find nearest city');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Find nearest city error:', error);
      throw new Error(error.response?.data?.error || 'Failed to find nearest city');
    }
  }

  // POI Search
  async searchPOIs(request: POISearchRequest): Promise<POI[]> {
    try {
      const response = await this.api.post<ApiResponse<{ pois: POI[] }>>(
        '/poi/search',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'POI search failed');
      }

      return response.data.data!.pois;
    } catch (error: any) {
      console.error('POI search error:', error);
      throw new Error(error.response?.data?.error || 'Failed to search POIs');
    }
  }

  // Get POI Details
  async getPOIDetails(placeId: string): Promise<POI> {
    try {
      const response = await this.api.get<ApiResponse<POI>>(`/poi/${placeId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get POI details');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('POI details error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get POI details');
    }
  }

  // Calculate Distances
  async calculateDistances(
    origin: Coordinates,
    destinations: Coordinates[],
    units: 'metric' | 'imperial' = 'metric'
  ): Promise<any[]> {
    try {
      const response = await this.api.post<ApiResponse<any>>(
        '/poi/distances',
        { origin, destinations, units }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Distance calculation failed');
      }

      return response.data.data!.distances;
    } catch (error: any) {
      console.error('Distance calculation error:', error);
      throw new Error(error.response?.data?.error || 'Failed to calculate distances');
    }
  }

  // Navigation - Get Directions
  async getDirections(request: NavigationRequest): Promise<Route> {
    try {
      const response = await this.api.post<ApiResponse<Route>>(
        '/navigation/directions',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Navigation failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Navigation error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get directions');
    }
  }

  // Get Route to Nearest City
  async getRouteToNearestCity(
    latitude: number,
    longitude: number,
    travelMode: TravelMode = 'DRIVE',
    units: 'metric' | 'imperial' = 'metric'
  ): Promise<any> {
    try {
      const response = await this.api.post<ApiResponse<any>>(
        '/navigation/route-to-city',
        { latitude, longitude, travelMode, units }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Route to city failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Route to city error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get route to nearest city');
    }
  }

  // Distance Matrix
  async getDistanceMatrix(request: DistanceMatrixRequest): Promise<any> {
    try {
      const response = await this.api.post<ApiResponse<any>>(
        '/navigation/matrix',
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Distance matrix failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Distance matrix error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get distance matrix');
    }
  }

  // Optimize Waypoints
  async optimizeWaypoints(
    origin: Coordinates,
    destination: Coordinates,
    waypoints: Coordinates[],
    travelMode: TravelMode = 'DRIVE',
    units: 'metric' | 'imperial' = 'metric'
  ): Promise<any> {
    try {
      const response = await this.api.post<ApiResponse<any>>(
        '/navigation/optimize-waypoints',
        { origin, destination, waypoints, travelMode, units }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Waypoint optimization failed');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Waypoint optimization error:', error);
      throw new Error(error.response?.data?.error || 'Failed to optimize waypoints');
    }
  }

  // Get Available POI Categories
  async getPOICategories(): Promise<any[]> {
    try {
      const response = await this.api.get<ApiResponse<any[]>>('/poi/categories');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get POI categories');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('POI categories error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get POI categories');
    }
  }

  // Get Available Travel Modes
  async getTravelModes(): Promise<any[]> {
    try {
      const response = await this.api.get<ApiResponse<any[]>>('/navigation/travel-modes');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get travel modes');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Travel modes error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get travel modes');
    }
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;