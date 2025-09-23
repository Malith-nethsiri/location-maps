import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { MapPin, Search, Target } from 'lucide-react';
import { CoordinateInputForm, POICategory } from '../types';

interface CoordinateInputProps {
  onSubmit: (data: { latitude: number; longitude: number; radius: number; categories: POICategory[] }) => void;
  isLoading?: boolean;
  className?: string;
}

const schema = yup.object({
  latitude: yup
    .string()
    .required('Latitude is required')
    .matches(/^-?([0-8]?[0-9](\.[0-9]+)?|90(\.0+)?)$/, 'Invalid latitude format'),
  longitude: yup
    .string()
    .required('Longitude is required')
    .matches(/^-?((1[0-7]|[0-9])?[0-9](\.[0-9]+)?|180(\.0+)?)$/, 'Invalid longitude format'),
  radius: yup
    .number()
    .min(100, 'Minimum radius is 100 meters')
    .max(50000, 'Maximum radius is 50,000 meters')
    .required('Radius is required'),
  categories: yup
    .array()
    .of(yup.string().required())
    .min(1, 'Select at least one category')
    .required('Categories are required')
});

const availableCategories: { id: POICategory; name: string; description: string }[] = [
  { id: 'school', name: 'Schools', description: 'Educational institutions' },
  { id: 'hospital', name: 'Healthcare', description: 'Hospitals and medical facilities' },
  { id: 'government', name: 'Government', description: 'Government buildings and offices' },
  { id: 'religious', name: 'Religious', description: 'Places of worship' },
  { id: 'store', name: 'Shopping', description: 'Stores and shopping centers' },
  { id: 'restaurant', name: 'Restaurants', description: 'Food and dining' },
  { id: 'gas_station', name: 'Gas Stations', description: 'Fuel and automotive services' },
  { id: 'bank', name: 'Banking', description: 'Banks and ATMs' },
  { id: 'pharmacy', name: 'Pharmacy', description: 'Pharmacies and drug stores' },
  { id: 'police', name: 'Emergency', description: 'Police and emergency services' }
];

const CoordinateInput: React.FC<CoordinateInputProps> = ({
  onSubmit,
  isLoading = false,
  className = ''
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CoordinateInputForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      latitude: '',
      longitude: '',
      radius: 5000,
      categories: ['school', 'hospital', 'government', 'religious', 'store']
    }
  });

  const watchedCategories = watch('categories');

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude.toString());
        setValue('longitude', position.coords.longitude.toString());
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Error getting your location. Please enter coordinates manually.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleFormSubmit = (data: CoordinateInputForm) => {
    onSubmit({
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      radius: data.radius,
      categories: data.categories
    });
  };

  const toggleCategory = (categoryId: POICategory) => {
    const currentCategories = watchedCategories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];

    setValue('categories', newCategories);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="text-blue-600" size={24} />
        <h2 className="text-xl font-semibold text-gray-800">Location Analysis</h2>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Coordinates Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-2">
              Latitude
            </label>
            <input
              {...register('latitude')}
              type="text"
              id="latitude"
              placeholder="e.g., 40.7128"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.latitude ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.latitude && (
              <p className="text-red-500 text-sm mt-1">{errors.latitude.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-2">
              Longitude
            </label>
            <input
              {...register('longitude')}
              type="text"
              id="longitude"
              placeholder="e.g., -74.0060"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.longitude ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.longitude && (
              <p className="text-red-500 text-sm mt-1">{errors.longitude.message}</p>
            )}
          </div>
        </div>

        {/* Get Current Location Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Target size={16} />
            {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
          </button>
        </div>

        {/* Search Radius */}
        <div>
          <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-2">
            Search Radius (meters)
          </label>
          <input
            {...register('radius')}
            type="number"
            id="radius"
            min="100"
            max="50000"
            step="100"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.radius ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.radius && (
            <p className="text-red-500 text-sm mt-1">{errors.radius.message}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Search for places within this radius from the coordinates
          </p>
        </div>

        {/* POI Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Points of Interest Categories
          </label>
          {errors.categories && (
            <p className="text-red-500 text-sm mb-2">{errors.categories.message}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {availableCategories.map((category) => (
              <div
                key={category.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  watchedCategories?.includes(category.id)
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => toggleCategory(category.id)}
                title={category.description}
              >
                <div className="text-sm font-medium">{category.name}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Select the types of places you want to find near the location
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Search size={16} />
          {isLoading ? 'Analyzing Location...' : 'Analyze Location'}
        </button>
      </form>
    </div>
  );
};

export default CoordinateInput;