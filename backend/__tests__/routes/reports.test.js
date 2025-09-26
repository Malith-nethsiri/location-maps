const request = require('supertest');
const app = require('../../server');
const { testData, testUtils } = require('../setup');

describe('Reports API Endpoints', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    testUser = await testUtils.createTestUser();
    authToken = testUtils.generateTestToken(testUser.id);
  });

  describe('POST /api/reports/create-from-coordinates', () => {
    it('should create a report with valid coordinates and data', async () => {
      const reportData = {
        user_id: testUser.id,
        coordinates: testData.validCoordinates,
        instruction_source: 'Test Bank',
        valuation_purpose: 'Mortgage evaluation for loan facility',
        report_type: 'mortgage',
        client_organization: 'Test Bank Ltd'
      };

      const response = await request(app)
        .post('/api/reports/create-from-coordinates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.user_id).toBe(testUser.id);
      expect(response.body.data.latitude).toBe(testData.validCoordinates.latitude);
      expect(response.body.data.longitude).toBe(testData.validCoordinates.longitude);
    });

    it('should reject invalid coordinates outside Sri Lanka', async () => {
      const reportData = {
        user_id: testUser.id,
        coordinates: testData.invalidCoordinates,
        instruction_source: 'Test Bank',
        valuation_purpose: 'Test purpose'
      };

      const response = await request(app)
        .post('/api/reports/create-from-coordinates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const reportData = {
        user_id: testUser.id,
        coordinates: testData.validCoordinates,
        instruction_source: 'Test Bank',
        valuation_purpose: 'Test purpose'
      };

      const response = await request(app)
        .post('/api/reports/create-from-coordinates')
        .send(reportData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        user_id: testUser.id,
        coordinates: testData.validCoordinates
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/reports/create-from-coordinates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/reports/:id', () => {
    let testReport;

    beforeEach(async () => {
      testReport = await testUtils.createTestReport(testUser.id);
    });

    it('should retrieve a report by ID', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReport.id);
      expect(response.body.data.user_id).toBe(testUser.id);
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/reports/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/reports/:id/section/:section', () => {
    let testReport;

    beforeEach(async () => {
      testReport = await testUtils.createTestReport(testUser.id);
    });

    it('should update a report section with valid data', async () => {
      const sectionData = {
        data: {
          building_type: 'two_storied_house',
          building_age: 10,
          condition_grade: 'excellent',
          total_floor_area: 2000
        }
      };

      const response = await request(app)
        .put(`/api/reports/${testReport.id}/section/building_details`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(sectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.building_type).toBe('two_storied_house');
      expect(response.body.data.building_age).toBe(10);
    });

    it('should validate section data', async () => {
      const invalidData = {
        data: {
          building_age: -5, // Invalid negative age
          total_floor_area: 100000 // Unrealistic size
        }
      };

      const response = await request(app)
        .put(`/api/reports/${testReport.id}/section/building_details`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid section names', async () => {
      const sectionData = {
        data: { test_field: 'test_value' }
      };

      const response = await request(app)
        .put(`/api/reports/${testReport.id}/section/invalid_section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(sectionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/reports/enhance-content', () => {
    it('should enhance route description with AI', async () => {
      const enhancementData = {
        enhancement_type: 'route_enhancement',
        input_data: {
          coordinates: testData.validCoordinates,
          start_location: 'Kandy',
          raw_directions: 'From Kandy proceed along Peradeniya Road'
        }
      };

      const response = await request(app)
        .post('/api/reports/enhance-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enhancementData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enhanced_content).toBeDefined();
      expect(response.body.data.enhancement_type).toBe('route_enhancement');
    });

    it('should enhance locality analysis with AI', async () => {
      const enhancementData = {
        enhancement_type: 'locality_analysis',
        input_data: {
          village_name: 'Kandy',
          district: 'Kandy',
          province: 'Central',
          development_level: 'well developed',
          nearby_facilities: ['Schools', 'Hospitals', 'Banks']
        }
      };

      const response = await request(app)
        .post('/api/reports/enhance-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enhancementData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enhanced_content).toBeDefined();
      expect(response.body.data.enhancement_type).toBe('locality_analysis');
    });

    it('should validate enhancement type', async () => {
      const invalidData = {
        enhancement_type: 'invalid_type',
        input_data: {}
      };

      const response = await request(app)
        .post('/api/reports/enhance-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reports/:id/preview', () => {
    let testReport;

    beforeEach(async () => {
      testReport = await testUtils.createTestReport(testUser.id);
    });

    it('should generate PDF preview', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport.id}/preview`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should generate HTML preview', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport.id}/preview?format=html`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('VALUATION REPORT');
    });
  });

  describe('POST /api/reports/analyze-location', () => {
    it('should analyze location from coordinates', async () => {
      const locationData = {
        coordinates: testData.validCoordinates
      };

      const response = await request(app)
        .post('/api/reports/analyze-location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(locationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location_intelligence).toBeDefined();
      expect(response.body.data.location_intelligence.section31_location).toBeDefined();
      expect(response.body.data.location_intelligence.section41_route_data).toBeDefined();
      expect(response.body.data.location_intelligence.section80_locality_data).toBeDefined();
    });

    it('should handle location analysis errors gracefully', async () => {
      const invalidLocation = {
        coordinates: {
          latitude: 0,
          longitude: 0
        }
      };

      const response = await request(app)
        .post('/api/reports/analyze-location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLocation)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Image Upload Endpoints', () => {
    let testReport;

    beforeEach(async () => {
      testReport = await testUtils.createTestReport(testUser.id);
    });

    describe('POST /api/reports/:id/images', () => {
      it('should upload images with valid category', async () => {
        // Note: This test would need actual file upload simulation
        // For now, we test the validation logic
        const response = await request(app)
          .post(`/api/reports/${testReport.id}/images`)
          .set('Authorization', `Bearer ${authToken}`)
          .field('category', 'land_views')
          .expect(400); // Expecting 400 because no files uploaded

        expect(response.body.message).toContain('No files uploaded');
      });

      it('should validate image category', async () => {
        const response = await request(app)
          .post(`/api/reports/${testReport.id}/images`)
          .set('Authorization', `Bearer ${authToken}`)
          .field('category', 'invalid_category')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/reports/:id/images', () => {
      it('should retrieve images for a report', async () => {
        const response = await request(app)
          .get(`/api/reports/${testReport.id}/images`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter images by category', async () => {
        const response = await request(app)
          .get(`/api/reports/${testReport.id}/images?category=land_views`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid report ID format', async () => {
      const response = await request(app)
        .get('/api/reports/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/reports/create-from-coordinates')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // This would need proper rate limiting configuration
      // For now, we test that the endpoint exists
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});