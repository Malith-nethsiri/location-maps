import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { Route, NavigationRequest, UseNavigation } from '../types';

export const useNavigation = (): UseNavigation => {
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDirections = useCallback(async (request: NavigationRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate coordinates
      const { origin, destination } = request;

      if (
        origin.latitude < -90 || origin.latitude > 90 ||
        origin.longitude < -180 || origin.longitude > 180 ||
        destination.latitude < -90 || destination.latitude > 90 ||
        destination.longitude < -180 || destination.longitude > 180
      ) {
        throw new Error('Invalid coordinates provided');
      }

      // Check if origin and destination are the same
      if (
        Math.abs(origin.latitude - destination.latitude) < 0.0001 &&
        Math.abs(origin.longitude - destination.longitude) < 0.0001
      ) {
        throw new Error('Origin and destination cannot be the same location');
      }

      console.log('Getting directions:', request);

      const result = await apiService.getDirections(request);
      setRoute(result);

      console.log('Directions received:', result);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get directions';
      setError(errorMessage);
      console.error('Navigation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
  }, []);

  return {
    route,
    isLoading,
    error,
    getDirections,
    clearRoute
  };
};