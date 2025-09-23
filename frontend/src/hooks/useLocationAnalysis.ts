import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { LocationAnalysis, LocationAnalysisRequest, UseLocationAnalysis } from '../types';

export const useLocationAnalysis = (): UseLocationAnalysis => {
  const [data, setData] = useState<LocationAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeLocation = useCallback(async (request: LocationAnalysisRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate coordinates
      if (
        request.latitude < -90 || request.latitude > 90 ||
        request.longitude < -180 || request.longitude > 180
      ) {
        throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
      }

      console.log('Analyzing location:', request);

      const result = await apiService.analyzeLocation(request);
      setData(result);

      console.log('Location analysis completed:', result);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze location';
      setError(errorMessage);
      console.error('Location analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    analyzeLocation,
    clearData
  };
};