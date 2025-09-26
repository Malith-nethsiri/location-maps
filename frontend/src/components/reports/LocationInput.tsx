import React, { useState, useRef, useCallback } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface LocationInputProps {
  onLocationSelected: (location: LocationData) => void;
}

const LocationInput: React.FC<LocationInputProps> = ({ onLocationSelected }) => {
  const [inputMethod, setInputMethod] = useState<'coordinates' | 'map' | 'current'>('coordinates');
  const [coordinates, setCoordinates] = useState({
    latitude: '',
    longitude: ''
  });
  const [error, setError] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 7.8731, lng: 80.7718 }); // Sri Lanka center
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);

  const validateCoordinates = (lat: string, lng: string): boolean => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Please enter valid numeric coordinates');
      return false;
    }

    // Sri Lanka bounds validation
    if (latitude < 5.5 || latitude > 10.0 || longitude < 79.0 || longitude > 82.0) {
      setError('Coordinates must be within Sri Lanka (Lat: 5.5-10.0, Lng: 79.0-82.0)');
      return false;
    }

    setError('');
    return true;
  };

  const handleCoordinateSubmit = () => {
    if (validateCoordinates(coordinates.latitude, coordinates.longitude)) {
      const location = {
        latitude: parseFloat(coordinates.latitude),
        longitude: parseFloat(coordinates.longitude)
      };
      onLocationSelected(location);
    }
  };

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        // Validate the location is in Sri Lanka
        if (validateCoordinates(location.latitude.toString(), location.longitude.toString())) {
          setCoordinates({
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString()
          });
          onLocationSelected(location);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        setError(`Location access denied: ${error.message}`);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onLocationSelected]);

  const handleCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    setCoordinates(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const getSampleCoordinates = () => {
    const samples = [
      { name: 'Colombo CBD', lat: 6.9271, lng: 79.8612 },
      { name: 'Kandy City', lat: 7.2906, lng: 80.6337 },
      { name: 'Galle Fort', lat: 6.0535, lng: 80.2210 },
      { name: 'Negombo Beach', lat: 7.2084, lng: 79.8438 },
      { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 }
    ];
    return samples[Math.floor(Math.random() * samples.length)];
  };

  const useSampleLocation = () => {
    const sample = getSampleCoordinates();
    setCoordinates({
      latitude: sample.lat.toString(),
      longitude: sample.lng.toString()
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Property Location
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Enter the GPS coordinates of the property to be valued. This will trigger automatic location intelligence analysis.
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Input Method Selection */}
          <div className="mb-6">
            <label className="text-base font-medium text-gray-900">Choose input method:</label>
            <div className="mt-3 space-y-3">
              <div className="flex items-center">
                <input
                  id="coordinates"
                  name="input_method"
                  type="radio"
                  checked={inputMethod === 'coordinates'}
                  onChange={() => setInputMethod('coordinates')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="coordinates" className="ml-3 block text-sm font-medium text-gray-700">
                  Manual GPS Coordinates Entry
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="current"
                  name="input_method"
                  type="radio"
                  checked={inputMethod === 'current'}
                  onChange={() => setInputMethod('current')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="current" className="ml-3 block text-sm font-medium text-gray-700">
                  Use Current Device Location
                </label>
              </div>

              <div className="flex items-center opacity-50">
                <input
                  id="map"
                  name="input_method"
                  type="radio"
                  checked={inputMethod === 'map'}
                  onChange={() => setInputMethod('map')}
                  disabled
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="map" className="ml-3 block text-sm font-medium text-gray-700">
                  Interactive Map Selection <span className="text-gray-400">(Coming Soon)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Coordinate Input */}
          {inputMethod === 'coordinates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                    Latitude *
                  </label>
                  <input
                    type="text"
                    id="latitude"
                    value={coordinates.latitude}
                    onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
                    placeholder="e.g., 6.9271"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Range: 5.5 to 10.0 (Sri Lanka)</p>
                </div>

                <div>
                  <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                    Longitude *
                  </label>
                  <input
                    type="text"
                    id="longitude"
                    value={coordinates.longitude}
                    onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
                    placeholder="e.g., 79.8612"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Range: 79.0 to 82.0 (Sri Lanka)</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={useSampleLocation}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  Use Sample Location
                </button>

                <div className="text-xs text-gray-500 flex items-center">
                  Need coordinates? Use{' '}
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500 mx-1"
                  >
                    Google Maps
                  </a>
                  to find them
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCoordinateSubmit}
                  disabled={!coordinates.latitude || !coordinates.longitude}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Analyze Location
                </button>
              </div>
            </div>
          )}

          {/* Current Location */}
          {inputMethod === 'current' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Use Your Current Location</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                We'll use your device's GPS to get the exact coordinates of your current location.
              </p>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGettingLocation ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Getting Location...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Get Current Location
                  </>
                )}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                Your browser will ask for location permission
              </p>
            </div>
          )}

          {/* Map Selection (Coming Soon) */}
          {inputMethod === 'map' && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Map Selection</h3>
              <p className="text-gray-500">
                This feature is coming soon. For now, please use coordinate entry or current location.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>We'll analyze the property location using Google Maps APIs</li>
                <li>Administrative divisions (Province, District, Village) will be identified</li>
                <li>Nearby facilities (schools, hospitals, banks, etc.) will be catalogued</li>
                <li>Route information from major cities will be generated</li>
                <li>Satellite imagery will be captured for the report</li>
                <li>All data will auto-populate your valuation report sections</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationInput;