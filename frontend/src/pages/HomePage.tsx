import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Coordinates,
  LocationAnalysis,
  NavigationRequest,
  POI,
  MapMarker,
  MapPolyline
} from '../types';
import { useLocationAnalysis } from '../hooks/useLocationAnalysis';
import { useNavigation } from '../hooks/useNavigation';
import CoordinateInput from '../components/CoordinateInput';
import LocationResults from '../components/LocationResults';
import MapComponent from '../components/MapComponent';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [mapPolylines, setMapPolylines] = useState<MapPolyline[]>([]);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ latitude: 40.7128, longitude: -74.0060 });
  const [satelliteView, setSatelliteView] = useState(false);

  const {
    data: locationAnalysis,
    isLoading: isAnalyzing,
    error: analysisError,
    analyzeLocation,
    clearData: clearAnalysis
  } = useLocationAnalysis();

  const {
    route,
    isLoading: isNavigating,
    error: navigationError,
    getDirections,
    clearRoute
  } = useNavigation();

  // Handle coordinate input submission
  const handleLocationSubmit = useCallback(async (data: {
    latitude: number;
    longitude: number;
    radius: number;
    categories: string[];
  }) => {
    try {
      setSelectedLocation({ latitude: data.latitude, longitude: data.longitude });
      setMapCenter({ latitude: data.latitude, longitude: data.longitude });

      await analyzeLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius,
        includeCategories: data.categories as any[]
      });

      toast.success('Location analysis completed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze location');
    }
  }, [analyzeLocation]);

  // Handle navigation requests
  const handleNavigationRequest = useCallback(async (request: NavigationRequest) => {
    try {
      await getDirections(request);
      toast.success('Directions retrieved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get directions');
    }
  }, [getDirections]);

  // Handle POI details
  const handleShowPOIDetails = useCallback((poi: POI) => {
    toast.info(`Showing details for ${poi.name}`);
    // Could open a modal or navigate to a details page
  }, []);

  // Handle map clicks
  const handleMapClick = useCallback((coordinates: Coordinates) => {
    setSelectedLocation(coordinates);
    setMapCenter(coordinates);

    // Optionally auto-analyze clicked location
    // analyzeLocation({ ...coordinates, radius: 5000, includeCategories: ['school', 'hospital'] });
  }, []);

  // Update map markers when analysis data changes
  React.useEffect(() => {
    if (!locationAnalysis) {
      setMapMarkers([]);
      return;
    }

    const markers: MapMarker[] = [];

    // Add main location marker
    markers.push({
      position: locationAnalysis.coordinates,
      title: 'Selected Location',
      color: 'red',
      info: {
        name: 'Selected Location',
        address: locationAnalysis.address.formatted_address
      }
    });

    // Add POI markers
    locationAnalysis.points_of_interest.forEach((poi) => {
      markers.push({
        position: poi.coordinates,
        title: poi.name,
        color: 'blue',
        info: {
          name: poi.name,
          category: poi.category,
          address: poi.address,
          rating: poi.rating
        },
        onClick: () => handleShowPOIDetails(poi)
      });
    });

    // Add nearest city marker
    if (locationAnalysis.nearest_city) {
      markers.push({
        position: locationAnalysis.nearest_city.coordinates,
        title: `${locationAnalysis.nearest_city.name} (Nearest City)`,
        color: 'green',
        info: {
          name: locationAnalysis.nearest_city.name,
          category: 'Major City',
          address: `${locationAnalysis.nearest_city.name}, ${locationAnalysis.nearest_city.country}`
        }
      });
    }

    setMapMarkers(markers);
  }, [locationAnalysis, handleShowPOIDetails]);

  // Update map polylines when route changes
  React.useEffect(() => {
    if (!route) {
      setMapPolylines([]);
      return;
    }

    // Decode polyline (simplified - in real app you'd use a proper polyline decoder)
    const polylines: MapPolyline[] = [{
      path: [route.origin, route.destination], // Simplified - actual polyline decoding needed
      color: '#FF0000',
      weight: 4,
      opacity: 0.7
    }];

    setMapPolylines(polylines);
  }, [route]);

  // Handle errors
  React.useEffect(() => {
    if (analysisError) {
      toast.error(analysisError);
    }
  }, [analysisError]);

  React.useEffect(() => {
    if (navigationError) {
      toast.error(navigationError);
    }
  }, [navigationError]);

  const clearAll = () => {
    clearAnalysis();
    clearRoute();
    setSelectedLocation(null);
    setMapMarkers([]);
    setMapPolylines([]);
    toast.info('All data cleared');
  };

  const handleGenerateReport = useCallback(() => {
    if (!locationAnalysis) {
      toast.error('Please complete location analysis first');
      return;
    }

    // Navigate to reports page with location data
    const reportData = {
      coordinates: locationAnalysis.coordinates,
      location_analysis: locationAnalysis
    };

    // Store data in sessionStorage for the reports page to pick up
    sessionStorage.setItem('location_report_data', JSON.stringify(reportData));

    navigate('/reports/create-from-location');
    toast.success('Redirecting to create valuation report...');
  }, [locationAnalysis, navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Location Intelligence</h1>
              <p className="text-sm text-gray-600">Analyze GPS coordinates, find POIs, and get navigation</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/reports"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Valuation Reports
              </Link>
              <button
                onClick={() => setSatelliteView(!satelliteView)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  satelliteView
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {satelliteView ? 'Road View' : 'Satellite View'}
              </button>
              {(locationAnalysis || route) && (
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel */}
          <div className="space-y-6">
            {/* Coordinate Input */}
            <CoordinateInput
              onSubmit={handleLocationSubmit}
              isLoading={isAnalyzing}
            />

            {/* Location Results */}
            {locationAnalysis && (
              <>
                <LocationResults
                  analysis={locationAnalysis}
                  onNavigateToLocation={handleNavigationRequest}
                  onShowPOIDetails={handleShowPOIDetails}
                />

                {/* Generate Valuation Report Button */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-green-800 mb-2">
                        Create Valuation Report
                      </h3>
                      <p className="text-sm text-green-700">
                        Use this location analysis to create a professional property valuation report
                        with AI-enhanced content generation.
                      </p>
                      <ul className="text-xs text-green-600 mt-2 space-y-1">
                        <li>• Auto-filled location and route descriptions</li>
                        <li>• Market analysis from nearby facilities</li>
                        <li>• Professional Sri Lankan valuation format</li>
                        <li>• Cost: ~$0.02 per report with AI enhancement</li>
                      </ul>
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
                    >
                      Generate Report →
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Results */}
            {route && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Navigation</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Distance:</span> {route.distance.text}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {route.duration.text}
                    </div>
                    <div>
                      <span className="font-medium">Travel Mode:</span> {route.travel_mode}
                    </div>
                    <div>
                      <span className="font-medium">Steps:</span> {route.steps.length}
                    </div>
                  </div>
                  {route.overview && (
                    <div>
                      <span className="font-medium">Overview:</span>
                      <p className="text-sm text-gray-600 mt-1">{route.overview}</p>
                    </div>
                  )}
                  <div className="max-h-32 overflow-y-auto">
                    <h4 className="font-medium text-sm mb-2">Turn-by-turn directions:</h4>
                    <ol className="space-y-1 text-sm text-gray-600">
                      {route.steps.map((step, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="font-medium text-blue-600">{step.step_number}.</span>
                          <span>{step.instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Map View</h3>
                {selectedLocation && (
                  <p className="text-sm text-gray-600">
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </p>
                )}
              </div>
              <MapComponent
                center={mapCenter}
                zoom={12}
                markers={mapMarkers}
                polylines={mapPolylines}
                onMapClick={handleMapClick}
                satelliteView={satelliteView}
                style={{ height: '600px', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Loading Overlays */}
      {(isAnalyzing || isNavigating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">
              {isAnalyzing ? 'Analyzing location...' : 'Getting directions...'}
            </span>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default HomePage;