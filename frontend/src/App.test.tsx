import React from 'react';
import { render, screen } from '@testing-library/react';
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

test('renders Location Intelligence header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Location Intelligence/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders coordinate input form', () => {
  render(<App />);
  const latitudeInput = screen.getByLabelText(/latitude/i);
  const longitudeInput = screen.getByLabelText(/longitude/i);
  expect(latitudeInput).toBeInTheDocument();
  expect(longitudeInput).toBeInTheDocument();
});

test('renders analyze location button', () => {
  render(<App />);
  const analyzeButton = screen.getByRole('button', { name: /analyze location/i });
  expect(analyzeButton).toBeInTheDocument();
});