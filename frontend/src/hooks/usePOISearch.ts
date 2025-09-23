import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { POI, POISearchRequest, UsePOISearch } from '../types';

export const usePOISearch = (): UsePOISearch => {
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPOIs = useCallback(async (request: POISearchRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate coordinates
      if (
        request.latitude < -90 || request.latitude > 90 ||
        request.longitude < -180 || request.longitude > 180
      ) {
        throw new Error('Invalid coordinates provided');
      }

      // Validate radius
      if (request.radius && (request.radius < 100 || request.radius > 50000)) {
        throw new Error('Radius must be between 100 and 50,000 meters');
      }

      console.log('Searching POIs:', request);

      const result = await apiService.searchPOIs(request);
      setPois(result);

      console.log(`Found ${result.length} POIs:`, result);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to search POIs';
      setError(errorMessage);
      console.error('POI search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPOIs = useCallback(() => {
    setPois([]);
    setError(null);
  }, []);

  return {
    pois,
    isLoading,
    error,
    searchPOIs,
    clearPOIs
  };
};