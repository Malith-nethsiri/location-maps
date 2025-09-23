import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock Google Maps API
const mockGoogleMaps = {
  Map: jest.fn(() => ({
    setCenter: jest.fn(),
    setMapTypeId: jest.fn(),
    addListener: jest.fn(),
    fitBounds: jest.fn(),
  })),
  Marker: jest.fn(() => ({
    setMap: jest.fn(),
    addListener: jest.fn(),
  })),
  InfoWindow: jest.fn(() => ({
    open: jest.fn(),
  })),
  Polyline: jest.fn(() => ({
    setMap: jest.fn(),
  })),
  LatLngBounds: jest.fn(() => ({
    extend: jest.fn(),
  })),
  MapTypeId: {
    ROADMAP: 'roadmap',
    SATELLITE: 'satellite',
  },
};

// Mock the Google Maps JavaScript API
Object.defineProperty(window, 'google', {
  value: {
    maps: mockGoogleMaps,
  },
  writable: true,
});

// Mock environment variables
process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test_api_key';
process.env.REACT_APP_API_URL = 'http://localhost:3001/api';

test('renders app without crashing', () => {
  render(<App />);
});