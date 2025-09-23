// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock Google Maps API responses for testing
const mockGoogleMapsResponse = {
  status: 'OK',
  results: [{
    formatted_address: 'Test Address, Test City, Test Country',
    address_components: [
      { long_name: 'Test City', types: ['locality'] },
      { long_name: 'Test State', types: ['administrative_area_level_1'] },
      { long_name: 'Test Country', types: ['country'] }
    ],
    place_id: 'test_place_id'
  }]
};

// Mock axios for API calls
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: mockGoogleMapsResponse })),
  post: jest.fn(() => Promise.resolve({ data: mockGoogleMapsResponse })),
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ data: mockGoogleMapsResponse })),
    post: jest.fn(() => Promise.resolve({ data: mockGoogleMapsResponse })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

// Global test utilities
global.testHelpers = {
  validCoordinates: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  invalidCoordinates: {
    latitude: 91,
    longitude: -74.0060
  }
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});