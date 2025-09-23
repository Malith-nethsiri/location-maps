const request = require('supertest');
const app = require('../server');

describe('Location Endpoints', () => {
  const validCoordinates = {
    latitude: 40.7128,
    longitude: -74.0060
  };

  const invalidCoordinates = {
    latitude: 91, // Invalid latitude
    longitude: -74.0060
  };

  describe('POST /api/location/analyze', () => {
    it('should analyze location with valid coordinates', async () => {
      const requestBody = {
        ...validCoordinates,
        radius: 5000,
        includeCategories: ['school', 'hospital']
      };

      const response = await request(app)
        .post('/api/location/analyze')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('coordinates');
      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('points_of_interest');
      expect(response.body.data.coordinates.latitude).toBe(validCoordinates.latitude);
      expect(response.body.data.coordinates.longitude).toBe(validCoordinates.longitude);
    });

    it('should reject invalid coordinates', async () => {
      const requestBody = {
        ...invalidCoordinates,
        radius: 5000,
        includeCategories: ['school']
      };

      const response = await request(app)
        .post('/api/location/analyze')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/location/analyze')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/location/geocode', () => {
    it('should geocode valid coordinates', async () => {
      const response = await request(app)
        .post('/api/location/geocode')
        .send(validCoordinates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('formatted_address');
      expect(response.body.data).toHaveProperty('address_components');
    });

    it('should reject invalid coordinates', async () => {
      const response = await request(app)
        .post('/api/location/geocode')
        .send(invalidCoordinates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/location/satellite/:lat/:lng', () => {
    it('should return satellite imagery URL', async () => {
      const response = await request(app)
        .get(`/api/location/satellite/${validCoordinates.latitude}/${validCoordinates.longitude}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('image_url');
      expect(response.body.data).toHaveProperty('metadata');
    });

    it('should reject invalid coordinates in URL', async () => {
      const response = await request(app)
        .get('/api/location/satellite/invalid/coordinates')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/location/nearest-city/:lat/:lng', () => {
    it('should find nearest city', async () => {
      const response = await request(app)
        .get(`/api/location/nearest-city/${validCoordinates.latitude}/${validCoordinates.longitude}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('country');
      expect(response.body.data).toHaveProperty('coordinates');
      expect(response.body.data).toHaveProperty('distance_km');
    });
  });
});