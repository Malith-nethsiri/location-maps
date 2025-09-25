import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Star,
  Phone,
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Route
} from 'lucide-react';
import { LocationAnalysis, POI, NavigationRequest } from '../types';

interface LocationResultsProps {
  analysis: LocationAnalysis;
  onNavigateToLocation?: (request: NavigationRequest) => void;
  onShowPOIDetails?: (poi: POI) => void;
  className?: string;
}

const LocationResults: React.FC<LocationResultsProps> = ({
  analysis,
  onNavigateToLocation,
  onShowPOIDetails,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['address', 'nearest_city', 'directions']);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isExpanded = (section: string) => expandedSections.includes(section);

  // Group POIs by category
  const poisByCategory = analysis.points_of_interest.reduce((acc, poi) => {
    if (!acc[poi.category]) {
      acc[poi.category] = [];
    }
    acc[poi.category].push(poi);
    return acc;
  }, {} as Record<string, POI[]>);

  const categories = Object.keys(poisByCategory);
  const filteredPOIs = selectedCategory === 'all'
    ? analysis.points_of_interest
    : poisByCategory[selectedCategory] || [];

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      school: '🏫',
      hospital: '🏥',
      government: '🏛️',
      religious: '⛪',
      store: '🏪',
      restaurant: '🍽️',
      gas_station: '⛽',
      bank: '🏦',
      pharmacy: '💊',
      police: '👮'
    };
    return icons[category] || '📍';
  };

  const handleNavigate = (destination: { latitude: number; longitude: number }) => {
    if (onNavigateToLocation) {
      onNavigateToLocation({
        origin: analysis.coordinates,
        destination,
        travelMode: 'DRIVE',
        units: 'metric'
      });
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center gap-2">
          <MapPin size={24} />
          <h2 className="text-xl font-semibold">Location Analysis Results</h2>
        </div>
        <p className="text-blue-100 mt-1">
          {analysis.coordinates.latitude.toFixed(6)}, {analysis.coordinates.longitude.toFixed(6)}
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {/* Address Information */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('address')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold text-gray-800">Address Information</h3>
            {isExpanded('address') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {isExpanded('address') && (
            <div className="mt-3 space-y-2">
              <p className="text-gray-700">{analysis.address.formatted_address}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                {analysis.address.address_components.city && (
                  <div><span className="font-medium">City:</span> {analysis.address.address_components.city}</div>
                )}
                {analysis.address.address_components.state && (
                  <div><span className="font-medium">State:</span> {analysis.address.address_components.state}</div>
                )}
                {analysis.address.address_components.country && (
                  <div><span className="font-medium">Country:</span> {analysis.address.address_components.country}</div>
                )}
                {analysis.address.address_components.postal_code && (
                  <div><span className="font-medium">Postal:</span> {analysis.address.address_components.postal_code}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Nearest City */}
        {analysis.nearest_city && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('nearest_city')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-semibold text-gray-800">Nearest Major City</h3>
              {isExpanded('nearest_city') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {isExpanded('nearest_city') && (
              <div className="mt-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {analysis.nearest_city.name}, {analysis.nearest_city.country}
                      </h4>
                      {analysis.nearest_city.state && (
                        <p className="text-sm text-gray-600">{analysis.nearest_city.state}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {analysis.nearest_city.distance_km.toFixed(1)} km away
                      </p>
                      {analysis.nearest_city.population && (
                        <p className="text-sm text-gray-600">
                          Population: {analysis.nearest_city.population.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleNavigate(analysis.nearest_city!.coordinates)}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Route size={16} />
                      Directions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEBUG: Show debug info only in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg mx-4 my-4 p-4">
            <h3 className="font-bold text-yellow-800 mb-2">🐛 DEBUG INFO</h3>
            <div className="text-xs text-yellow-700">
              <p><strong>nearby_cities:</strong> {analysis.nearby_cities?.length || 0} cities found</p>
              <p><strong>directions_from_cities:</strong> {analysis.directions_from_cities?.length || 0} routes available</p>
              <p><strong>directions_from_city:</strong> {analysis.directions_from_city ? 'exists' : 'undefined'}</p>
              <p><strong>nearest_city:</strong> {analysis.nearest_city?.name || 'undefined'}</p>
            </div>
          </div>
        )}

        {/* How to Get Here - Multiple Cities Directions */}
        {analysis.directions_from_cities && analysis.directions_from_cities.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg mx-4 my-4">
            <div className="p-4">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-600 text-white p-2 rounded-full">
                    <Route size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">How to Get Here</h2>
                    <p className="text-sm text-gray-600">Choose from {analysis.directions_from_cities.length} nearby cities</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {analysis.directions_from_cities.map((cityDirection, index) => (
                  <div key={`city-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <button
                      onClick={() => toggleSection(`city-${index}`)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-800 text-lg">
                            📍 From {cityDirection.city.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              📏 {cityDirection.directions.distance.text}
                            </span>
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                              ⏱️ {cityDirection.directions.duration.text}
                            </span>
                            <span className="text-gray-500">
                              {cityDirection.city.distance_km} km away
                            </span>
                          </div>
                        </div>
                      </div>
                      {isExpanded(`city-${index}`) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {isExpanded(`city-${index}`) && (
                      <div className="border-t border-gray-100 p-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700 flex items-center gap-2">
                            <Navigation size={16} className="text-blue-600" />
                            Turn-by-turn directions
                          </h4>
                          {cityDirection.directions.steps.map((step, stepIndex) => (
                            <div key={stepIndex} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                              <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                {step.step_number || stepIndex + 1}
                              </div>
                              <div className="flex-grow">
                                <div className="text-gray-800 text-sm mb-1" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                                {step.distance && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="bg-gray-100 px-2 py-1 rounded">
                                      📏 {step.distance.text}
                                    </span>
                                    {step.duration && (
                                      <span className="bg-gray-100 px-2 py-1 rounded">
                                        ⏱️ {step.duration.text}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fallback: Single City Directions (for backward compatibility) */}
        {analysis.directions_from_city && (!analysis.directions_from_cities || analysis.directions_from_cities.length === 0) && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg mx-4 my-4">
            <div className="p-4">
              <button
                onClick={() => toggleSection('directions')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-2 rounded-full">
                    <Route size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">How to Get Here</h2>
                    <p className="text-sm text-gray-600">Directions from {analysis.nearest_city?.name}</p>
                  </div>
                </div>
                {isExpanded('directions') ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>

              {isExpanded('directions') && (
                <div className="mt-6 border-t pt-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{analysis.directions_from_city.distance.text}</div>
                        <div className="text-sm text-gray-600">Total Distance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{analysis.directions_from_city.duration.text}</div>
                        <div className="text-sm text-gray-600">Estimated Time</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Navigation size={18} className="text-blue-600" />
                      Step-by-Step Directions
                    </h3>
                    <div className="space-y-3">
                      {analysis.directions_from_city.steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {step.step_number || index + 1}
                          </div>
                          <div className="flex-grow">
                            <div className="text-gray-800 font-medium mb-1" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                            {step.distance && (
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  📏 {step.distance.text}
                                </span>
                                {step.duration && (
                                  <span className="bg-gray-100 px-2 py-1 rounded">
                                    ⏱️ {step.duration.text}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Points of Interest */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('pois')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold text-gray-800">
              Points of Interest ({analysis.total_pois_found})
            </h3>
            {isExpanded('pois') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {isExpanded('pois') && (
            <div className="mt-3 space-y-4">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All ({analysis.total_pois_found})
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span>{getCategoryIcon(category)}</span>
                    {category.replace('_', ' ')} ({poisByCategory[category].length})
                  </button>
                ))}
              </div>

              {/* POI List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPOIs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No points of interest found in the selected category.
                  </p>
                ) : (
                  filteredPOIs.map((poi, index) => (
                    <div key={poi.place_id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{getCategoryIcon(poi.category)}</span>
                            <h4 className="font-semibold text-gray-800">{poi.name}</h4>
                            {poi.rating && (
                              <div className="flex items-center gap-1 text-sm text-yellow-600">
                                <Star size={14} fill="currentColor" />
                                <span>{poi.rating}</span>
                                {poi.user_ratings_total && (
                                  <span className="text-gray-500">({poi.user_ratings_total})</span>
                                )}
                              </div>
                            )}
                          </div>
                          {poi.address && (
                            <p className="text-sm text-gray-600 mt-1">{poi.address}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {formatDistance(poi.distance_meters)}
                            </span>
                            {poi.phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone size={14} />
                                {poi.phone_number}
                              </span>
                            )}
                            {poi.website && (
                              <a
                                href={poi.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <Globe size={14} />
                                Website
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {onShowPOIDetails && (
                            <button
                              onClick={() => onShowPOIDetails(poi)}
                              className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              Details
                            </button>
                          )}
                          <button
                            onClick={() => handleNavigate(poi.coordinates)}
                            className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            <Navigation size={14} />
                            Go
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Road Map View */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('satellite')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold text-gray-800">Road Map View</h3>
            {isExpanded('satellite') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {isExpanded('satellite') && (
            <div className="mt-3">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                {(analysis.map_imagery || analysis.satellite_imagery) ? (
                  <div>
                    <img
                      src={(analysis.map_imagery || analysis.satellite_imagery)!.image_url}
                      alt="Road map view"
                      className="mx-auto rounded-lg shadow-md max-w-full h-auto"
                      style={{ maxHeight: '400px' }}
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Road map centered at {analysis.coordinates.latitude.toFixed(6)}, {analysis.coordinates.longitude.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">Road map not available</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Summary */}
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{analysis.total_pois_found}</div>
              <div className="text-sm text-gray-600">POIs Found</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatDistance(analysis.search_radius)}</div>
              <div className="text-sm text-gray-600">Search Radius</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{analysis.response_time_ms}ms</div>
              <div className="text-sm text-gray-600">Response Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationResults;