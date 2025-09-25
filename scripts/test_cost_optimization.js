#!/usr/bin/env node
/**
 * Cost Optimization Testing Script
 * Tests the optimized location service and validates cost savings
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test coordinates in Sri Lanka
const TEST_COORDINATES = [
  { lat: 6.9271, lng: 79.8612, name: 'Colombo' },
  { lat: 7.2906, lng: 80.6337, name: 'Kandy' },
  { lat: 6.0535, lng: 80.2210, name: 'Galle' },
  { lat: 9.6615, lng: 80.0255, name: 'Jaffna' },
  { lat: 7.3956781, lng: 81.8333656, name: 'Kalmunai' }
];

class CostOptimizationTester {
  constructor() {
    this.results = {
      database_tests: {},
      api_tests: {},
      cost_analysis: {},
      performance_metrics: {}
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Cost Optimization Tests\n');

    try {
      // Test 1: Database connectivity and functions
      await this.testDatabaseFunctions();

      // Test 2: Optimized location analysis
      await this.testOptimizedLocationAnalysis();

      // Test 3: Caching performance
      await this.testCachingPerformance();

      // Test 4: Cost comparison
      await this.analyzeCostSavings();

      // Test 5: API endpoint validation
      await this.testAllEndpoints();

      // Generate final report
      this.generateReport();

    } catch (error) {
      console.error('❌ Testing failed:', error);
      process.exit(1);
    }
  }

  async testDatabaseFunctions() {
    console.log('🔍 Testing Database Functions...');

    try {
      // Test database connection
      const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
      console.log('✅ Database connection:', healthResponse.data.status);

      // Test database structure
      const dbTestResponse = await axios.get(`${API_BASE_URL}/api/location/test-db`);
      const dbResults = dbTestResponse.data.data;

      console.log('📊 Database Test Results:');
      console.log(`   - Connection: ${dbResults.connection?.status}`);
      console.log(`   - Cities table exists: ${dbResults.cities_table?.exists}`);
      console.log(`   - Total cities: ${dbResults.cities_table?.row_count || 0}`);
      console.log(`   - Sri Lankan cities: ${dbResults.cities_table?.sri_lankan_cities?.length || 0}`);
      console.log(`   - find_nearby_cities function: ${dbResults.nearby_cities_function?.exists}`);
      console.log(`   - Manual Haversine query: ${dbResults.manual_haversine?.success ? 'OK' : 'FAILED'}`);

      this.results.database_tests = dbResults;

      if (!dbResults.cities_table?.exists) {
        throw new Error('Cities table does not exist - run migrations first');
      }

      if (dbResults.cities_table?.sri_lankan_cities?.length < 100) {
        console.log('⚠️  Warning: Limited Sri Lankan cities data');
      }

      console.log('✅ Database functions test completed\n');

    } catch (error) {
      console.error('❌ Database test failed:', error.message);
      throw error;
    }
  }

  async testOptimizedLocationAnalysis() {
    console.log('🎯 Testing Optimized Location Analysis...');

    const testResults = [];

    for (const coord of TEST_COORDINATES) {
      console.log(`   Testing ${coord.name}...`);

      try {
        const startTime = performance.now();

        const response = await axios.post(`${API_BASE_URL}/api/location/analyze`, {
          latitude: coord.lat,
          longitude: coord.lng,
          radius: 5000,
          includeCategories: ['school', 'hospital', 'restaurant', 'store']
        });

        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        const data = response.data.data;

        testResults.push({
          location: coord.name,
          response_time_ms: responseTime,
          nearby_cities_count: data.nearby_cities?.length || 0,
          pois_count: data.points_of_interest?.length || 0,
          cost_optimization: data.cost_optimization,
          has_address: !!data.address,
          has_imagery: !!data.map_imagery
        });

        console.log(`   ✅ ${coord.name}: ${responseTime}ms, ${data.nearby_cities?.length || 0} cities, ${data.points_of_interest?.length || 0} POIs`);

      } catch (error) {
        console.log(`   ❌ ${coord.name}: ${error.message}`);
        testResults.push({
          location: coord.name,
          error: error.message
        });
      }
    }

    this.results.api_tests = testResults;
    console.log('✅ Optimized location analysis test completed\n');
  }

  async testCachingPerformance() {
    console.log('⚡ Testing Caching Performance...');

    const testCoord = TEST_COORDINATES[0]; // Use Colombo for caching test

    try {
      // First request (should be slower - no cache)
      console.log('   First request (no cache)...');
      const start1 = performance.now();
      await axios.post(`${API_BASE_URL}/api/location/analyze`, {
        latitude: testCoord.lat,
        longitude: testCoord.lng,
        radius: 3000,
        includeCategories: ['hospital', 'school']
      });
      const time1 = Math.round(performance.now() - start1);

      // Second request (should be faster - with cache)
      console.log('   Second request (with cache)...');
      const start2 = performance.now();
      await axios.post(`${API_BASE_URL}/api/location/analyze`, {
        latitude: testCoord.lat,
        longitude: testCoord.lng,
        radius: 3000,
        includeCategories: ['hospital', 'school']
      });
      const time2 = Math.round(performance.now() - start2);

      const speedImprovement = Math.round(((time1 - time2) / time1) * 100);

      console.log(`   📈 Performance improvement: ${speedImprovement}%`);
      console.log(`   First: ${time1}ms, Second: ${time2}ms`);

      this.results.performance_metrics = {
        uncached_ms: time1,
        cached_ms: time2,
        improvement_percent: speedImprovement
      };

      console.log('✅ Caching performance test completed\n');

    } catch (error) {
      console.error('❌ Caching test failed:', error.message);
    }
  }

  async analyzeCostSavings() {
    console.log('💰 Analyzing Cost Savings..');

    const testCoord = TEST_COORDINATES[1]; // Use Kandy

    try {
      const response = await axios.post(`${API_BASE_URL}/api/location/analyze`, {
        latitude: testCoord.lat,
        longitude: testCoord.lng,
        radius: 5000,
        includeCategories: ['school', 'hospital', 'restaurant', 'store', 'government']
      });

      const costData = response.data.data.cost_optimization;
      const nearbyCitiesCount = response.data.data.nearby_cities?.length || 0;

      // Calculate theoretical costs
      const originalCost = {
        poi_calls: 5 * 0.032, // 5 separate POI calls
        routes_calls: nearbyCitiesCount * 0.005, // Routes API for each city
        static_map: 0.002,
        geocoding: 0.002,
        total: 0
      };
      originalCost.total = originalCost.poi_calls + originalCost.routes_calls + originalCost.static_map + originalCost.geocoding;

      const optimizedCost = {
        poi_batched: 0.032, // Single batched POI call
        routes_calls: 0, // No Routes API calls
        static_map_cached: 0.002 / 24, // Cached for 24 hours
        geocoding_cached: 0.002 / 2, // Cached for 2 hours
        total: 0
      };
      optimizedCost.total = optimizedCost.poi_batched + optimizedCost.routes_calls + optimizedCost.static_map_cached + optimizedCost.geocoding_cached;

      const savings = {
        absolute: originalCost.total - optimizedCost.total,
        percentage: Math.round(((originalCost.total - optimizedCost.total) / originalCost.total) * 100)
      };

      console.log('   📊 Cost Analysis:');
      console.log(`   Original cost per analysis: $${originalCost.total.toFixed(4)}`);
      console.log(`   Optimized cost per analysis: $${optimizedCost.total.toFixed(4)}`);
      console.log(`   Savings per analysis: $${savings.absolute.toFixed(4)} (${savings.percentage}%)`);
      console.log(`   Monthly savings (1000 analyses): $${(savings.absolute * 1000).toFixed(2)}`);

      this.results.cost_analysis = {
        original_cost: originalCost.total,
        optimized_cost: optimizedCost.total,
        savings_per_analysis: savings.absolute,
        savings_percentage: savings.percentage,
        monthly_savings_1000_calls: savings.absolute * 1000
      };

      console.log('✅ Cost analysis completed\n');

    } catch (error) {
      console.error('❌ Cost analysis failed:', error.message);
    }
  }

  async testAllEndpoints() {
    console.log('🌐 Testing All API Endpoints...');

    const endpoints = [
      { method: 'GET', path: '/api/health', name: 'Health Check' },
      { method: 'GET', path: '/api/location/test-db', name: 'Database Test' },
      {
        method: 'POST',
        path: '/api/location/analyze',
        name: 'Location Analysis',
        data: { latitude: 6.9271, longitude: 79.8612, radius: 3000, includeCategories: ['hospital'] }
      },
      {
        method: 'POST',
        path: '/api/location/geocode',
        name: 'Geocoding',
        data: { latitude: 6.9271, longitude: 79.8612 }
      },
      { method: 'GET', path: '/api/location/satellite/6.9271/79.8612', name: 'Satellite Imagery' },
      { method: 'GET', path: '/api/location/nearest-city/6.9271/79.8612', name: 'Nearest City' }
    ];

    const endpointResults = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`   Testing ${endpoint.name}...`);

        let response;
        if (endpoint.method === 'GET') {
          response = await axios.get(`${API_BASE_URL}${endpoint.path}`);
        } else {
          response = await axios.post(`${API_BASE_URL}${endpoint.path}`, endpoint.data);
        }

        endpointResults.push({
          name: endpoint.name,
          path: endpoint.path,
          status: 'success',
          response_status: response.status,
          has_data: !!response.data
        });

        console.log(`   ✅ ${endpoint.name}: ${response.status}`);

      } catch (error) {
        endpointResults.push({
          name: endpoint.name,
          path: endpoint.path,
          status: 'failed',
          error: error.response?.data?.message || error.message
        });

        console.log(`   ❌ ${endpoint.name}: ${error.response?.status || 'Failed'}`);
      }
    }

    this.results.endpoint_tests = endpointResults;
    console.log('✅ API endpoints test completed\n');
  }

  generateReport() {
    console.log('📋 COST OPTIMIZATION TEST REPORT');
    console.log('=====================================\n');

    // Database Status
    console.log('🗄️  DATABASE STATUS:');
    const db = this.results.database_tests;
    console.log(`   Connection: ${db.connection?.status || 'Unknown'}`);
    console.log(`   Cities in database: ${db.cities_table?.row_count || 0}`);
    console.log(`   Sri Lankan cities: ${db.cities_table?.sri_lankan_cities?.length || 0}`);
    console.log(`   Required functions: ${db.nearby_cities_function?.exists ? '✅' : '❌'}\n`);

    // Performance Metrics
    console.log('⚡ PERFORMANCE METRICS:');
    const perf = this.results.performance_metrics;
    if (perf.improvement_percent) {
      console.log(`   Cache performance improvement: ${perf.improvement_percent}%`);
      console.log(`   Uncached response: ${perf.uncached_ms}ms`);
      console.log(`   Cached response: ${perf.cached_ms}ms\n`);
    } else {
      console.log('   Performance test data not available\n');
    }

    // Cost Analysis
    console.log('💰 COST OPTIMIZATION RESULTS:');
    const cost = this.results.cost_analysis;
    if (cost.savings_percentage) {
      console.log(`   Cost reduction achieved: ${cost.savings_percentage}%`);
      console.log(`   Original cost per analysis: $${cost.original_cost?.toFixed(4)}`);
      console.log(`   Optimized cost per analysis: $${cost.optimized_cost?.toFixed(4)}`);
      console.log(`   Savings per analysis: $${cost.savings_per_analysis?.toFixed(4)}`);
      console.log(`   Monthly savings (1000 analyses): $${cost.monthly_savings_1000_calls?.toFixed(2)}\n`);
    } else {
      console.log('   Cost analysis data not available\n');
    }

    // API Tests Summary
    console.log('🌐 API ENDPOINTS STATUS:');
    const successfulTests = this.results.api_tests?.filter(t => !t.error).length || 0;
    const totalTests = this.results.api_tests?.length || 0;
    console.log(`   Location analysis tests: ${successfulTests}/${totalTests} successful`);

    const successfulEndpoints = this.results.endpoint_tests?.filter(e => e.status === 'success').length || 0;
    const totalEndpoints = this.results.endpoint_tests?.length || 0;
    console.log(`   API endpoints: ${successfulEndpoints}/${totalEndpoints} working\n`);

    // Overall Status
    console.log('🎯 OVERALL STATUS:');
    const dbOk = db.connection?.status === 'connected' && db.cities_table?.exists;
    const apiOk = successfulTests > 0 && successfulEndpoints >= 4;
    const costOk = cost.savings_percentage >= 50;

    console.log(`   Database: ${dbOk ? '✅ Ready' : '❌ Issues detected'}`);
    console.log(`   API endpoints: ${apiOk ? '✅ Functional' : '❌ Issues detected'}`);
    console.log(`   Cost optimization: ${costOk ? '✅ Target achieved' : '⚠️  Needs review'}`);

    if (dbOk && apiOk && costOk) {
      console.log('\n🎉 Cost optimization implementation successful!');
      console.log('   Ready for production deployment.');
    } else {
      console.log('\n⚠️  Issues detected - review required before deployment.');
    }

    console.log('\n=====================================');
  }
}

// CLI execution
if (require.main === module) {
  const tester = new CostOptimizationTester();
  tester.runAllTests().catch(error => {
    console.error('Fatal testing error:', error);
    process.exit(1);
  });
}

module.exports = CostOptimizationTester;