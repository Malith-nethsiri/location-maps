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

        {/* Directions from Nearest City */}
        {analysis.directions_from_city && (
          <div className="p-4 border-b">
            <button
              onClick={() => toggleSection('directions')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Route className="text-green-600" size={20} />
                <h3 className="font-semibold">Directions from {analysis.nearest_city?.name}</h3>
              </div>
              {isExpanded('directions') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {isExpanded('directions') && (
              <div className="mt-3">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      <p><strong>Distance:</strong> {analysis.directions_from_city.distance.text}</p>
                      <p><strong>Duration:</strong> {analysis.directions_from_city.duration.text}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 mb-2">Turn-by-turn directions:</h4>
                    {analysis.directions_from_city.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border-l-4 border-green-400">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {step.step_number}
                        </span>
                        <div className="flex-grow">
                          <p className="text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                          {step.distance && (
                            <p className="text-xs text-gray-500 mt-1">
                              {step.distance.text} • {step.duration?.text}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
                      src={(analysis.map_imagery || analysis.satellite_imagery)?.image_url}
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