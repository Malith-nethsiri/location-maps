import React from 'react';

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

interface LocationAnalysisPreviewProps {
  isAnalyzing: boolean;
  locationAnalysis: LocationAnalysis | null;
  coordinates: LocationData | null;
}

const LocationAnalysisPreview: React.FC<LocationAnalysisPreviewProps> = ({
  isAnalyzing,
  locationAnalysis,
  coordinates
}) => {
  if (isAnalyzing) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Analyzing Property Location
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {coordinates && `Processing coordinates: ${coordinates.latitude}, ${coordinates.longitude}`}
            </p>
          </div>

          <div className="px-6 py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Location Intelligence in Progress</h3>
              <p className="text-gray-500 mb-6">
                Please wait while we gather comprehensive location data for your property...
              </p>

              {/* Analysis Steps */}
              <div className="max-w-md mx-auto">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    </div>
                    <span className="text-gray-600">Geocoding address information...</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    </div>
                    <span className="text-gray-600">Identifying administrative divisions...</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    </div>
                    <span className="text-gray-600">Searching nearby facilities...</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    </div>
                    <span className="text-gray-600">Calculating routes from major cities...</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    </div>
                    <span className="text-gray-600">Generating satellite imagery...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!locationAnalysis || !locationAnalysis.success) {
    return null;
  }

  const { location_intelligence } = locationAnalysis;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Location Analysis Complete
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Your property location has been analyzed successfully. Review the details below.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Property Identification */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Property Location (Section 3.1)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Province:</span>
                  <span className="text-gray-900">{location_intelligence.section31_location.province}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">District:</span>
                  <span className="text-gray-900">{location_intelligence.section31_location.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Village:</span>
                  <span className="text-gray-900">{location_intelligence.section31_location.village_name}</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-600 text-xs">Full Address:</span>
                  <p className="text-gray-900 text-xs">{location_intelligence.section31_location.formatted_address}</p>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414-1.414L9 5.586 7.707 4.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Access Routes (Section 4.1)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nearest City:</span>
                  <span className="text-gray-900">{location_intelligence.section41_route_data.nearest_major_city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="text-gray-900">{location_intelligence.section41_route_data.distance_km} km</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-600 text-xs">Route (Will be enhanced with AI):</span>
                  <p className="text-gray-900 text-xs">{location_intelligence.section41_route_data.route_instructions.substring(0, 100)}...</p>
                </div>
              </div>
            </div>

            {/* Locality Description */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Locality Details (Section 8.0)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="text-gray-900">{location_intelligence.section80_locality_data.locality_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Development:</span>
                  <span className="text-gray-900">{location_intelligence.section80_locality_data.development_level}</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-600 text-xs">Infrastructure:</span>
                  <p className="text-gray-900 text-xs">{location_intelligence.section80_locality_data.infrastructure_description}</p>
                </div>
              </div>
            </div>

            {/* Nearby Facilities */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Nearby Facilities
              </h4>
              <div className="space-y-1 text-xs">
                {location_intelligence.section80_locality_data.nearby_facilities.slice(0, 4).map((facility, index) => (
                  <div key={index} className="text-gray-900">
                    • {facility}
                  </div>
                ))}
                {location_intelligence.section80_locality_data.nearby_facilities.length > 4 && (
                  <div className="text-gray-600 pt-1">
                    + {location_intelligence.section80_locality_data.nearby_facilities.length - 4} more facilities
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Location Intelligence Ready
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your report sections will be automatically populated with this location data.
                    You can enhance route descriptions and market analysis with AI in the next step.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Proceeding to report details...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationAnalysisPreview;