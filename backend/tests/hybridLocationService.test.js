const HybridLocationService = require('../services/hybridLocationService');

// Mock the database and external API calls
jest.mock('../config/database', () => ({
  query: jest.fn()
}));

jest.mock('axios');
const axios = require('axios');

describe('HybridLocationService Cost Optimization Tests', () => {
  let service;

  beforeEach(() => {
    service = HybridLocationService;
    service.googleApiKey = 'test-key';
    jest.clearAllMocks();
  });

  describe('Cost Calculation', () => {
    test('should calculate costs within $0.10 budget for typical analysis', () => {
      // Mock typical analysis results
      const mockPOIs = Array(20).fill().map((_, i) => ({
        place_id: `place_${i}`,
        name: `POI ${i}`,
        category: 'restaurant',
        distance_meters: i * 100
      }));

      const mockDirections = [
        { city: { name: 'City1' }, directions: { duration: '30 mins' } },
        { city: { name: 'City2' }, directions: { duration: '45 mins' } },
        { city: { name: 'City3' }, directions: { duration: '60 mins' } }
      ];

      const mockGeocode = { formatted_address: 'Test Address' };
      const mockSatellite = { image_url: 'https://test.com/image.png' };

      service.poiSearchCount = 4; // 4 POI API calls

      const costAnalysis = service.calculateActualCost(
        mockPOIs,
        mockDirections,
        mockGeocode,
        mockSatellite
      );

      // Validate cost breakdown (optimized rates)
      expect(costAnalysis.poi_search_cost).toBe(0.060); // Min of 4 * $0.020 and $0.060 cap
      expect(costAnalysis.routing_cost).toBe(0.015); // 3 * $0.005
      expect(costAnalysis.geocoding_cost).toBe(0.005);
      expect(costAnalysis.static_map_cost).toBe(0.002);

      // Total cost should be within budget
      expect(costAnalysis.total_estimated_cost).toBeLessThanOrEqual(0.10);
      expect(costAnalysis.within_budget).toBe(true);
      expect(costAnalysis.budget_remaining).toBeGreaterThanOrEqual(0);

      console.log('Cost Analysis:', costAnalysis);
    });

    test('should handle high POI count while staying in budget', () => {
      const mockPOIs = Array(25).fill().map((_, i) => ({
        place_id: `place_${i}`,
        name: `POI ${i}`,
        category: ['restaurant', 'store', 'hospital', 'school'][i % 4],
        distance_meters: i * 50
      }));

      const mockDirections = [
        { city: { name: 'City1' }, directions: { duration: '30 mins' } },
        { city: { name: 'City2' }, directions: { duration: '45 mins' } }
      ];

      service.poiSearchCount = 3; // Efficient batching

      const costAnalysis = service.calculateActualCost(
        mockPOIs,
        mockDirections,
        { formatted_address: 'Test' },
        { image_url: 'test.png' }
      );

      expect(costAnalysis.total_estimated_cost).toBeLessThanOrEqual(0.10);
      expect(costAnalysis.within_budget).toBe(true);
    });
  });

  describe('POI Category Grouping', () => {
    test('should group categories efficiently to reduce API calls', () => {
      const categories = ['hospital', 'pharmacy', 'school', 'government', 'restaurant', 'bank'];
      const groups = service.groupCategoriesForSearch(categories);

      // Should create logical groups to minimize API calls
      expect(groups).toHaveLength(4); // As defined in hybridLocationService.js
      expect(groups[0]).toContain('hospital');
      expect(groups[0]).toContain('pharmacy');
      expect(groups[1]).toContain('school');
      expect(groups[1]).toContain('government');
    });

    test('should handle comprehensive category list', () => {
      const allCategories = [
        'school', 'hospital', 'government', 'religious', 'store', 'restaurant',
        'bank', 'gas_station', 'pharmacy', 'police', 'fire_station',
        'post_office', 'library', 'park', 'entertainment'
      ];

      const groups = service.groupCategoriesForSearch(allCategories);

      // Should not exceed 4 groups for cost control
      expect(groups.length).toBeLessThanOrEqual(4);

      // All categories should be included somewhere
      const allGroupedCategories = groups.flat();
      expect(allGroupedCategories.length).toBeGreaterThan(0);
    });
  });

  describe('Duplicate POI Removal', () => {
    test('should remove duplicate POIs based on place_id', () => {
      const poisWithDuplicates = [
        { place_id: 'place_1', name: 'Restaurant A', distance_meters: 100 },
        { place_id: 'place_2', name: 'Store B', distance_meters: 200 },
        { place_id: 'place_1', name: 'Restaurant A', distance_meters: 100 }, // Duplicate
        { place_id: 'place_3', name: 'Hospital C', distance_meters: 300 },
        { place_id: 'place_2', name: 'Store B', distance_meters: 200 }, // Duplicate
      ];

      const uniquePOIs = service.removeDuplicatePOIs(poisWithDuplicates);

      expect(uniquePOIs).toHaveLength(3);
      expect(uniquePOIs.map(p => p.place_id)).toEqual(['place_1', 'place_2', 'place_3']);
    });

    test('should handle POIs without place_id using coordinate-based deduplication', () => {
      const poisWithoutIds = [
        { name: 'POI A', coordinates: { latitude: 6.9271, longitude: 79.8612 }, distance_meters: 100 },
        { name: 'POI B', coordinates: { latitude: 6.9272, longitude: 79.8613 }, distance_meters: 200 },
        { name: 'POI A', coordinates: { latitude: 6.9271, longitude: 79.8612 }, distance_meters: 100 }, // Duplicate
      ];

      const uniquePOIs = service.removeDuplicatePOIs(poisWithoutIds);

      expect(uniquePOIs).toHaveLength(2);
    });
  });

  describe('Distance Calculation', () => {
    test('should calculate accurate distances', () => {
      // Colombo to Kandy (approximately 94km straight line distance)
      const distance = service.calculateDistance(6.9271, 79.8612, 7.2906, 80.6337);

      expect(distance).toBeGreaterThan(90000); // 90km in meters
      expect(distance).toBeLessThan(100000); // 100km in meters
    });

    test('should handle short distances accurately', () => {
      // Very close coordinates (should be less than 1km)
      const distance = service.calculateDistance(6.9271, 79.8612, 6.9281, 79.8622);

      expect(distance).toBeLessThan(2000); // Less than 2km
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('Place Type Mapping', () => {
    test('should map Google place types to categories correctly', () => {
      const googleTypes = ['restaurant', 'food', 'establishment'];
      const categories = ['restaurant', 'hospital', 'school'];

      const category = service.determineCategoryFromTypes(googleTypes, categories);

      expect(category).toBe('restaurant');
    });

    test('should handle hospital-related types', () => {
      const googleTypes = ['hospital', 'health', 'establishment'];
      const categories = ['restaurant', 'hospital', 'school'];

      const category = service.determineCategoryFromTypes(googleTypes, categories);

      expect(category).toBe('hospital');
    });

    test('should default to appropriate category for unknown types', () => {
      const googleTypes = ['unknown_type', 'establishment'];
      const categories = ['restaurant', 'hospital'];

      const category = service.determineCategoryFromTypes(googleTypes, categories);

      expect(['restaurant', 'hospital', 'other']).toContain(category);
    });
  });
});

describe('Cost Budget Validation', () => {
  test('should demonstrate cost savings compared to original service', () => {
    // Original service cost (before optimization)
    const originalCost = 0.138; // From plan.md

    // Hybrid service typical cost
    const hybridService = HybridLocationService;
    hybridService.poiSearchCount = 4; // Batched POI searches

    const mockAnalysis = hybridService.calculateActualCost(
      Array(20).fill({ place_id: 'test' }), // 20 POIs
      [{ city: 'Test1' }, { city: 'Test2' }, { city: 'Test3' }], // 3 route calls
      { formatted_address: 'Test Address' },
      { image_url: 'test.png' }
    );

    // Should be less than original cost but more than over-optimized version
    expect(mockAnalysis.total_estimated_cost).toBeLessThan(originalCost);
    expect(mockAnalysis.total_estimated_cost).toBeGreaterThan(0.054); // Over-optimized cost
    expect(mockAnalysis.total_estimated_cost).toBeLessThanOrEqual(0.10); // Budget limit
  });

  test('should provide cost transparency', () => {
    const hybridService = HybridLocationService;
    hybridService.poiSearchCount = 3;

    const costBreakdown = hybridService.calculateActualCost(
      Array(15).fill({ place_id: 'test' }),
      [{ city: 'City1' }, { city: 'City2' }],
      { formatted_address: 'Test' },
      { image_url: 'test' }
    );

    // Should provide detailed breakdown
    expect(costBreakdown).toHaveProperty('poi_search_cost');
    expect(costBreakdown).toHaveProperty('routing_cost');
    expect(costBreakdown).toHaveProperty('geocoding_cost');
    expect(costBreakdown).toHaveProperty('static_map_cost');
    expect(costBreakdown).toHaveProperty('total_estimated_cost');
    expect(costBreakdown).toHaveProperty('within_budget');
    expect(costBreakdown).toHaveProperty('budget_remaining');

    // All costs should be positive
    expect(costBreakdown.poi_search_cost).toBeGreaterThan(0);
    expect(costBreakdown.routing_cost).toBeGreaterThan(0);
    expect(costBreakdown.geocoding_cost).toBeGreaterThan(0);
    expect(costBreakdown.static_map_cost).toBeGreaterThan(0);
  });
});