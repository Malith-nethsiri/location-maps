const aiService = require('../../services/aiService');
const { testData } = require('../setup');

// Mock OpenAI client
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'Generated AI content for testing'
              }
            }],
            usage: {
              total_tokens: 150
            },
            model: 'gpt-3.5-turbo'
          })
        }
      }
    }))
  };
});

describe('AI Service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Content Generation', () => {
    it('should generate route description content', async () => {
      const inputData = {
        start_location: 'Kandy',
        coordinates: testData.validCoordinates,
        raw_directions: 'From Kandy proceed along Peradeniya Road'
      };

      const result = await aiService.generateContent('route_description', inputData);

      expect(result).toHaveProperty('generated_text');
      expect(result).toHaveProperty('tokens_used');
      expect(result).toHaveProperty('cost_usd');
      expect(result).toHaveProperty('ai_model');
      expect(result.cached).toBe(false);
    });

    it('should generate locality analysis content', async () => {
      const inputData = {
        village_name: 'Kandy',
        district: 'Kandy',
        province: 'Central',
        locality_type: 'urban',
        development_level: 'well developed',
        nearby_facilities: ['Schools', 'Hospitals', 'Banks']
      };

      const result = await aiService.generateContent('locality_analysis', inputData);

      expect(result).toHaveProperty('generated_text');
      expect(result.ai_model).toBe('gpt-4'); // Locality analysis uses GPT-4
    });

    it('should generate market analysis content', async () => {
      const inputData = {
        location: 'Kandy, Central Province',
        development_level: 'well developed',
        distance_to_town: '5km from city center',
        nearby_pois: ['Shopping centers', 'Universities']
      };

      const result = await aiService.generateContent('market_analysis', inputData);

      expect(result).toHaveProperty('generated_text');
      expect(result.ai_model).toBe('gpt-4'); // Market analysis uses GPT-4
    });

    it('should generate building description content', async () => {
      const inputData = {
        building_type: 'single_storied_house',
        age: 15,
        condition: 'good',
        materials: {
          roof: 'AC sheets on timber rafters',
          walls: 'Cement block walls',
          floor: 'Concrete with tiles'
        },
        floor_area: 1500,
        rooms: 'Three bedrooms, living room, kitchen'
      };

      const result = await aiService.generateContent('building_description', inputData);

      expect(result).toHaveProperty('generated_text');
    });

    it('should handle invalid content type', async () => {
      const inputData = { test: 'data' };

      await expect(
        aiService.generateContent('invalid_type', inputData)
      ).resolves.toHaveProperty('generated_text');
    });
  });

  describe('Prompt Building', () => {
    it('should build route description prompt correctly', () => {
      const data = {
        start_location: 'Kandy',
        coordinates: testData.validCoordinates,
        raw_directions: 'Test directions'
      };

      const prompt = aiService.buildPrompt('route_description', data);

      expect(prompt).toContain('Generate a professional route description');
      expect(prompt).toContain('Kandy');
      expect(prompt).toContain('Sri Lankan valuation language');
    });

    it('should build locality analysis prompt correctly', () => {
      const data = {
        village_name: 'Kandy',
        district: 'Kandy',
        province: 'Central'
      };

      const prompt = aiService.buildPrompt('locality_analysis', data);

      expect(prompt).toContain('Generate detailed locality analysis');
      expect(prompt).toContain('Kandy');
      expect(prompt).toContain('Central');
    });
  });

  describe('Model Selection', () => {
    it('should use GPT-4 for complex analysis', () => {
      expect(aiService.getModelForContentType('market_analysis')).toBe('gpt-4');
      expect(aiService.getModelForContentType('locality_analysis')).toBe('gpt-4');
      expect(aiService.getModelForContentType('quality_validation')).toBe('gpt-4');
    });

    it('should use GPT-3.5-turbo for simple descriptions', () => {
      expect(aiService.getModelForContentType('route_description')).toBe('gpt-3.5-turbo');
      expect(aiService.getModelForContentType('property_description')).toBe('gpt-3.5-turbo');
      expect(aiService.getModelForContentType('building_description')).toBe('gpt-3.5-turbo');
    });
  });

  describe('Token Limits', () => {
    it('should set appropriate token limits for different content types', () => {
      expect(aiService.getMaxTokensForContentType('route_description')).toBe(200);
      expect(aiService.getMaxTokensForContentType('locality_analysis')).toBe(450);
      expect(aiService.getMaxTokensForContentType('market_analysis')).toBe(400);
      expect(aiService.getMaxTokensForContentType('quality_validation')).toBe(500);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate costs correctly for different models', () => {
      const gpt35Cost = aiService.calculateCost(1000, 'gpt-3.5-turbo');
      const gpt4Cost = aiService.calculateCost(1000, 'gpt-4');

      expect(gpt35Cost).toBe(0.002); // $0.002 per 1K tokens
      expect(gpt4Cost).toBe(0.03);   // $0.03 per 1K tokens
    });

    it('should default to GPT-3.5-turbo pricing for unknown models', () => {
      const unknownCost = aiService.calculateCost(1000, 'unknown-model');
      expect(unknownCost).toBe(0.002);
    });
  });

  describe('Batch Processing', () => {
    it('should enhance multiple report sections', async () => {
      const mockReport = {
        id: 1,
        ...testData.validReport,
        ...testData.validCoordinates
      };

      const sections = ['route_description', 'locality_analysis'];
      const results = await aiService.enhanceReportSections(mockReport, sections);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('section', 'route_description');
      expect(results[1]).toHaveProperty('section', 'locality_analysis');
      expect(results[0]).toHaveProperty('generated_text');
      expect(results[1]).toHaveProperty('generated_text');
    });

    it('should extract input data correctly for each section', () => {
      const mockReport = {
        ...testData.validReport,
        ...testData.validCoordinates,
        nearest_town: 'Kandy',
        village_name: 'Test Village',
        district: 'Kandy'
      };

      const routeData = aiService.extractInputDataForSection(mockReport, 'route_description');
      expect(routeData).toHaveProperty('start_location', 'Kandy');
      expect(routeData).toHaveProperty('coordinates');

      const localityData = aiService.extractInputDataForSection(mockReport, 'locality_analysis');
      expect(localityData).toHaveProperty('village_name', 'Test Village');
      expect(localityData).toHaveProperty('district', 'Kandy');
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service unavailability', async () => {
      // Temporarily disable AI service
      const originalIsEnabled = aiService.isEnabled;
      aiService.isEnabled = false;

      await expect(
        aiService.generateContent('route_description', {})
      ).rejects.toThrow('AI service is not available');

      // Restore original state
      aiService.isEnabled = originalIsEnabled;
    });

    it('should provide fallback content when AI fails', async () => {
      // Mock OpenAI to throw an error
      const mockCreate = require('openai').OpenAI().chat.completions.create;
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await aiService.generateContent('route_description', {});

      expect(result).toHaveProperty('generated_text');
      expect(result.ai_model).toBe('fallback-placeholder');
    });
  });

  describe('Service Availability', () => {
    it('should report availability status', () => {
      expect(typeof aiService.isAvailable()).toBe('boolean');
    });

    it('should test connection when available', async () => {
      if (aiService.isAvailable()) {
        const result = await aiService.testConnection();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
      }
    });
  });

  describe('Placeholder Content', () => {
    it('should generate appropriate placeholder content', () => {
      const routePlaceholder = aiService.generatePlaceholderContent('route_description');
      expect(routePlaceholder).toContain('proceed along');
      expect(routePlaceholder).toContain('Kandy');

      const localityPlaceholder = aiService.generatePlaceholderContent('locality_analysis');
      expect(localityPlaceholder).toContain('locality');
      expect(localityPlaceholder).toContain('infrastructure');

      const buildingPlaceholder = aiService.generatePlaceholderContent('building_description');
      expect(buildingPlaceholder).toContain('building');
      expect(buildingPlaceholder).toContain('condition');
    });
  });
});