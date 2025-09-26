// Global test setup and configuration
const { Pool } = require('pg');

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'location_intelligence_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password'
};

// Global test pool
global.testPool = new Pool(testDbConfig);

// Test data fixtures
global.testData = {
  validUser: {
    email_address: 'test@example.com',
    full_name: 'John Doe',
    mobile_number: '0771234567',
    professional_title: 'Chartered Valuer',
    qualifications_list: ['MRICS', 'BSc Estate Management'],
    professional_status: 'Independent Valuer',
    ivsl_registration: 'V/12345',
    house_number: '123',
    street_name: 'Test Street',
    area_name: 'Test Area',
    city: 'Colombo',
    district: 'Colombo'
  },

  validCoordinates: {
    latitude: 7.8731,
    longitude: 80.7718
  },

  validReport: {
    instruction_source: 'Test Bank',
    valuation_purpose: 'Mortgage evaluation for loan facility',
    report_type: 'mortgage',
    client_organization: 'Test Bank Ltd',
    village_name: 'Kandy',
    district: 'Kandy',
    province: 'Central',
    lot_number: '15',
    plan_number: '1234 dated 2023-01-15',
    current_owner: 'Mr. A.B. Silva',
    north_boundary: 'Property of Mr. A.B. Silva',
    south_boundary: 'Property of Mrs. C.D. Fernando',
    east_boundary: 'Paddy land',
    west_boundary: '20 feet wide motorable road',
    total_extent: '35.5 perches',
    land_shape: 'rectangular',
    topography_type: 'fairly_level',
    soil_type: 'red_earth',
    land_use_type: 'residential',
    building_type: 'single_storied_house',
    building_age: 15,
    condition_grade: 'good',
    total_floor_area: 1500,
    bedrooms: 3,
    land_rate: 450000,
    market_value: 15000000
  },

  invalidCoordinates: {
    latitude: 15.0, // Outside Sri Lanka bounds
    longitude: 90.0  // Outside Sri Lanka bounds
  }
};

// Test utilities
global.testUtils = {
  // Clean up database
  async cleanDatabase() {
    const tables = [
      'report_images',
      'generated_content',
      'valuation_reports',
      'user_profiles',
      'users'
    ];

    for (const table of tables) {
      await global.testPool.query(`DELETE FROM ${table}`);
    }
  },

  // Create test user
  async createTestUser(userData = global.testData.validUser) {
    const query = `
      INSERT INTO users (email_address, password_hash, profile_completed, created_at)
      VALUES ($1, $2, true, NOW())
      RETURNING id
    `;
    const result = await global.testPool.query(query, [
      userData.email_address,
      '$2b$10$dummy.hash.for.testing'
    ]);

    const userId = result.rows[0].id;

    // Create profile
    const profileQuery = `
      INSERT INTO user_profiles (
        user_id, full_name, mobile_number, professional_title,
        qualifications_list, professional_status, ivsl_registration,
        house_number, street_name, area_name, city, district,
        profile_completed, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW())
      RETURNING *
    `;

    const profileResult = await global.testPool.query(profileQuery, [
      userId,
      userData.full_name,
      userData.mobile_number,
      userData.professional_title,
      userData.qualifications_list,
      userData.professional_status,
      userData.ivsl_registration,
      userData.house_number,
      userData.street_name,
      userData.area_name,
      userData.city,
      userData.district
    ]);

    return {
      id: userId,
      profile: profileResult.rows[0]
    };
  },

  // Create test report
  async createTestReport(userId, reportData = global.testData.validReport) {
    const query = `
      INSERT INTO valuation_reports (
        user_id, instruction_source, valuation_purpose, report_type,
        client_organization, latitude, longitude, village_name, district,
        province, lot_number, plan_number, current_owner, north_boundary,
        south_boundary, east_boundary, west_boundary, total_extent,
        land_shape, topography_type, soil_type, land_use_type,
        building_type, building_age, condition_grade, total_floor_area,
        bedrooms, land_rate, market_value, status, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, 'draft', NOW()
      )
      RETURNING *
    `;

    const result = await global.testPool.query(query, [
      userId,
      reportData.instruction_source,
      reportData.valuation_purpose,
      reportData.report_type,
      reportData.client_organization,
      global.testData.validCoordinates.latitude,
      global.testData.validCoordinates.longitude,
      reportData.village_name,
      reportData.district,
      reportData.province,
      reportData.lot_number,
      reportData.plan_number,
      reportData.current_owner,
      reportData.north_boundary,
      reportData.south_boundary,
      reportData.east_boundary,
      reportData.west_boundary,
      reportData.total_extent,
      reportData.land_shape,
      reportData.topography_type,
      reportData.soil_type,
      reportData.land_use_type,
      reportData.building_type,
      reportData.building_age,
      reportData.condition_grade,
      reportData.total_floor_area,
      reportData.bedrooms,
      reportData.land_rate,
      reportData.market_value
    ]);

    return result.rows[0];
  },

  // Generate JWT token for testing
  generateTestToken(userId) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  // Wait for async operations
  async wait(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Global setup before all tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Suppress console output during tests
  if (!process.env.VERBOSE_TESTS) {
    global.originalConsole = console;
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

// Global cleanup after all tests
afterAll(async () => {
  // Restore console
  if (global.originalConsole) {
    console = global.originalConsole;
  }

  // Close database connection
  if (global.testPool) {
    await global.testPool.end();
  }
});

// Clean database before each test
beforeEach(async () => {
  await global.testUtils.cleanDatabase();
});

module.exports = {
  testDbConfig,
  testData: global.testData,
  testUtils: global.testUtils
};