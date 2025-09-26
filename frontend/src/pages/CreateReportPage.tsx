import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LocationInput from '../components/reports/LocationInput';
import LocationAnalysisPreview from '../components/reports/LocationAnalysisPreview';
import ReportInitializationForm from '../components/reports/ReportInitializationForm';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface LocationAnalysis {
  success: boolean;
  location_intelligence: {
    section31_location: {
      village_name: string;
      district: string;
      province: string;
      formatted_address: string;
    };
    section41_route_data: {
      nearest_major_city: string;
      route_instructions: string;
      distance_km: number;
    };
    section80_locality_data: {
      locality_type: string;
      development_level: string;
      infrastructure_description: string;
      nearby_facilities: string[];
    };
  };
}

const CreateReportPage: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<'location' | 'analysis' | 'details' | 'creating'>('location');
  const [coordinates, setCoordinates] = useState<LocationData | null>(null);
  const [locationAnalysis, setLocationAnalysis] = useState<LocationAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');

  // Redirect to profile completion if needed
  useEffect(() => {
    if (state.user && !state.user.profile?.profile_completed) {
      navigate('/profile-setup', {
        state: {
          from: '/reports/new',
          message: 'Complete your professional profile to create valuation reports'
        }
      });
    }
  }, [state.user, navigate]);

  const handleLocationSelected = async (location: LocationData) => {
    setCoordinates(location);
    setError('');
    setIsAnalyzing(true);
    setCurrentStep('analysis');

    try {
      const response = await fetch('/api/reports/analyze-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          coordinates: location
        })
      });

      const result = await response.json();

      if (result.success) {
        setLocationAnalysis(result.data);
        setTimeout(() => setCurrentStep('details'), 1500); // Show analysis briefly then proceed
      } else {
        throw new Error(result.message || 'Location analysis failed');
      }
    } catch (err: any) {
      setError(err.message);
      setCurrentStep('location'); // Go back to location input
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateReport = async (reportData: any) => {
    if (!coordinates || !state.user) return;

    setCurrentStep('creating');
    setError('');

    try {
      const response = await fetch('/api/reports/create-from-coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          user_id: state.user.id,
          coordinates,
          ...reportData
        })
      });

      const result = await response.json();

      if (result.success) {
        navigate(`/reports/${result.data.id}/builder`, {
          state: {
            message: 'Report created successfully with location intelligence',
            locationAnalysis
          }
        });
      } else {
        throw new Error(result.message || 'Failed to create report');
      }
    } catch (err: any) {
      setError(err.message);
      setCurrentStep('details');
    }
  };

  const handleStartOver = () => {
    setCurrentStep('location');
    setCoordinates(null);
    setLocationAnalysis(null);
    setError('');
  };

  if (!state.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Valuation Report</h1>
              <p className="mt-1 text-sm text-gray-500">
                Professional valuation report with location intelligence
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center">
              <div className={`flex items-center text-sm font-medium ${
                currentStep === 'location' ? 'text-blue-600' :
                ['analysis', 'details', 'creating'].includes(currentStep) ? 'text-green-600' : 'text-gray-500'
              }`}>
                <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === 'location' ? 'border-blue-600 bg-blue-50' :
                  ['analysis', 'details', 'creating'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
                }`}>
                  {['analysis', 'details', 'creating'].includes(currentStep) ? '✓' : '1'}
                </span>
                <span className="ml-2">Property Location</span>
              </div>

              <div className={`mx-4 h-0.5 flex-1 ${
                ['analysis', 'details', 'creating'].includes(currentStep) ? 'bg-green-600' : 'bg-gray-200'
              }`}></div>

              <div className={`flex items-center text-sm font-medium ${
                currentStep === 'analysis' ? 'text-blue-600' :
                ['details', 'creating'].includes(currentStep) ? 'text-green-600' : 'text-gray-500'
              }`}>
                <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === 'analysis' ? 'border-blue-600 bg-blue-50' :
                  ['details', 'creating'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
                }`}>
                  {['details', 'creating'].includes(currentStep) ? '✓' : '2'}
                </span>
                <span className="ml-2">Location Analysis</span>
              </div>

              <div className={`mx-4 h-0.5 flex-1 ${
                ['details', 'creating'].includes(currentStep) ? 'bg-green-600' : 'bg-gray-200'
              }`}></div>

              <div className={`flex items-center text-sm font-medium ${
                currentStep === 'details' ? 'text-blue-600' :
                currentStep === 'creating' ? 'text-green-600' : 'text-gray-500'
              }`}>
                <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === 'details' ? 'border-blue-600 bg-blue-50' :
                  currentStep === 'creating' ? 'border-green-600 bg-green-50' : 'border-gray-300'
                }`}>
                  {currentStep === 'creating' ? '✓' : '3'}
                </span>
                <span className="ml-2">Report Details</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                  {(currentStep === 'analysis' || currentStep === 'details') && (
                    <div className="mt-3">
                      <button
                        onClick={handleStartOver}
                        className="text-sm font-medium text-red-800 hover:text-red-600"
                      >
                        Start Over
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'location' && (
            <LocationInput onLocationSelected={handleLocationSelected} />
          )}

          {currentStep === 'analysis' && (
            <LocationAnalysisPreview
              isAnalyzing={isAnalyzing}
              locationAnalysis={locationAnalysis}
              coordinates={coordinates}
            />
          )}

          {currentStep === 'details' && locationAnalysis && (
            <ReportInitializationForm
              locationAnalysis={locationAnalysis}
              coordinates={coordinates}
              userProfile={state.user.profile}
              onSubmit={handleCreateReport}
              onBack={handleStartOver}
            />
          )}

          {currentStep === 'creating' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Creating Your Report</h3>
              <p className="text-gray-500">
                Generating professional valuation report with location intelligence...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateReportPage;