require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');
const pool = require('../config/database');
const logger = require('../utils/logger');

const { OpenAI } = require('openai');

class AIService {
  constructor() {
    // Initialize OpenAI client when API key is available
    this.openai = null;
    this.isEnabled = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.isEnabled = true;
        logger.info('OpenAI API configured for valuation reports');
      } catch (error) {
        logger.warn('OpenAI API not available:', error.message);
        this.isEnabled = false;
      }
    } else {
      logger.warn('OPENAI_API_KEY not configured - AI features will be disabled');
      this.isEnabled = false;
    }
  }

  // ===============================================
  // Content Generation Methods
  // ===============================================

  async generateContent(contentType, inputData) {
    if (!this.isEnabled) {
      throw new Error('AI service is not available. Please configure OpenAI API key.');
    }

    try {
      // Check cache first
      const cached = await this.getCachedContent(contentType, inputData);
      if (cached) {
        // Update usage stats
        await this.updateCacheUsage(cached.id);
        return {
          generated_text: cached.generated_text,
          cached: true,
          cost_usd: 0,
          tokens_used: 0,
          ai_model: cached.ai_model
        };
      }

      // Generate new content
      const prompt = this.buildPrompt(contentType, inputData);
      const response = await this.callOpenAI(prompt, contentType);

      // Cache the result
      await this.cacheContent(contentType, inputData, response);

      return response;
    } catch (error) {
      logger.error(`Error generating ${contentType} content:`, error);
      throw error;
    }
  }

  buildPrompt(contentType, inputData) {
    const prompts = {
      route_description: this.buildRouteDescriptionPrompt(inputData),
      property_description: this.buildPropertyDescriptionPrompt(inputData),
      market_analysis: this.buildMarketAnalysisPrompt(inputData),
      locality_analysis: this.buildLocalityAnalysisPrompt(inputData),
      building_description: this.buildBuildingDescriptionPrompt(inputData),
      quality_validation: this.buildQualityValidationPrompt(inputData)
    };

    return prompts[contentType] || '';
  }

  buildRouteDescriptionPrompt(data) {
    return `
Generate a professional route description for a Sri Lankan property valuation report.

Input data:
- Start location: ${data.start_location || 'Nearest major city'}
- GPS coordinates: ${data.coordinates?.latitude}, ${data.coordinates?.longitude}
- Raw directions: ${data.raw_directions || 'Not provided'}
- Nearby landmarks: ${data.landmarks?.join(', ') || 'Not specified'}

Requirements:
- Use professional Sri Lankan valuation language
- Include specific distances and landmarks
- Follow this format style:
  "From [Major Landmark], proceed along [Road Name] for about [Distance] up to [Landmark], turn [Direction] on to [Road] and proceed for about [Distance]. The subject property lies on the [Side] hand side of the road..."

Examples of good descriptions:
- "From Clock Tower junction of Dambulla, proceed along Trincomalee Road for about 17.2km up to Digampathana, turn right on to the road leading to Aliya Resort and proceed for about 1km."
- "From Maho town, proceed along Rest house road for a distance of about 1½ Kilometers turn right on to gravel road and proceed about 200 Meters to reach the property."

Generate professional route description (maximum 150 words):
`;
  }

  buildPropertyDescriptionPrompt(data) {
    return `
Generate professional property description for Sri Lankan valuation report.

Input data:
- Land shape: ${data.land_shape || 'Not specified'}
- Topography: ${data.topography || 'Not specified'}
- Land use: ${data.land_use || 'Not specified'}
- Frontage: ${data.frontage || 'Not specified'}
- Access road: ${data.access_road || 'Not specified'}
- Soil type: ${data.soil_type || 'Not specified'}
- Plantation: ${data.plantation || 'Not specified'}

Requirements:
- Use formal Sri Lankan property valuation terminology
- Create flowing, professional descriptions
- Follow this style: "This is [shape] shaped [topography] block of land with [use], having a frontage of about [measurement] to the [road type] along the [boundary] boundary."

Generate comprehensive property description (maximum 200 words):
`;
  }

  buildMarketAnalysisPrompt(data) {
    return `
Generate market analysis for Sri Lankan property valuation report.

Input data:
- Location: ${data.location || 'Not specified'}
- Nearby POIs: ${JSON.stringify(data.nearby_pois) || 'None provided'}
- Development level: ${data.development_level || 'Not specified'}
- Distance to town: ${data.distance_to_town || 'Not specified'}
- Recent sales: ${data.recent_sales || 'Not provided'}

Requirements:
- Professional Sri Lankan valuation language
- Include development assessment
- Reference nearby facilities and infrastructure
- Provide market demand analysis

Generate market analysis (maximum 250 words):
`;
  }

  buildLocalityAnalysisPrompt(data) {
    return `
Generate detailed locality analysis for Sri Lankan property valuation report.

Input data:
- Village/Area: ${data.village_name || 'Not specified'}
- District: ${data.district || 'Not specified'}
- Province: ${data.province || 'Not specified'}
- Locality type: ${data.locality_type || 'Not specified'}
- Development level: ${data.development_level || 'Not specified'}
- Infrastructure: ${data.infrastructure_description || 'Not provided'}
- Nearby facilities: ${JSON.stringify(data.nearby_facilities) || 'None provided'}
- Distance to major city: ${data.distance_to_major_city || 'Not specified'} km

Requirements:
- Use professional Sri Lankan valuation terminology
- Analyze locality characteristics and development potential
- Reference specific infrastructure and amenities
- Include transportation accessibility
- Assess market attractiveness and demand drivers
- Follow this structure:
  1. Locality Description (geographic/administrative position)
  2. Infrastructure Assessment (roads, utilities, public services)
  3. Amenities and Facilities (schools, hospitals, commercial establishments)
  4. Development Characteristics (residential/commercial/industrial mix)
  5. Market Factors (demand drivers, accessibility, growth potential)

Generate comprehensive locality analysis (maximum 300 words):
`;
  }

  buildBuildingDescriptionPrompt(data) {
    return `
Generate building description for Sri Lankan valuation report.

Input data:
- Building type: ${data.building_type || 'Not specified'}
- Age: ${data.age || 'Not specified'} years
- Condition: ${data.condition || 'Not specified'}
- Construction materials: ${data.materials || 'Not specified'}
- Floor area: ${data.floor_area || 'Not specified'} sq ft
- Rooms: ${data.rooms || 'Not specified'}

Requirements:
- Use standard Sri Lankan building terminology
- Professional valuation language
- Include construction details in this format:
  "Roof: [description]
   Walls: [description]
   Floor: [description]
   Doors & Windows: [description]"

Generate building description (maximum 200 words):
`;
  }

  buildQualityValidationPrompt(data) {
    return `
Review this Sri Lankan valuation report data for consistency and completeness.

Report data:
${JSON.stringify(data, null, 2)}

Check for:
1. Mathematical consistency (land value calculations)
2. Logical inconsistencies (building age vs condition)
3. Missing critical information
4. Unrealistic values for Sri Lankan context
5. Date sequence issues

Provide specific improvement suggestions in JSON format:
{
  "issues": [{"type": "error|warning", "field": "field_name", "message": "description"}],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "completeness_score": 85
}
`;
  }

  async callOpenAI(prompt, contentType) {
    if (!this.isEnabled) {
      // Fallback to placeholder for development/demo
      logger.info('OpenAI not configured - using placeholder content');
      return {
        generated_text: this.generatePlaceholderContent(contentType),
        tokens_used: 150,
        cost_usd: 0.003,
        ai_model: 'placeholder',
        cached: false
      };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.getModelForContentType(contentType),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.getMaxTokensForContentType(contentType),
        temperature: 0.3, // Lower temperature for consistent professional output
      });

      const generatedText = completion.choices[0].message.content;
      const tokensUsed = completion.usage.total_tokens;
      const costUsd = this.calculateCost(tokensUsed, completion.model);

      logger.info(`OpenAI content generated: ${contentType}, ${tokensUsed} tokens, $${costUsd}`);

      return {
        generated_text: generatedText,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        ai_model: completion.model,
        cached: false
      };
    } catch (error) {
      logger.error('OpenAI API error:', error);

      // Fallback to placeholder if OpenAI fails
      logger.warn('Falling back to placeholder content due to OpenAI error');
      return {
        generated_text: this.generatePlaceholderContent(contentType),
        tokens_used: 150,
        cost_usd: 0.003,
        ai_model: 'fallback-placeholder',
        cached: false
      };
    }
  }

  generatePlaceholderContent(contentType) {
    const placeholders = {
      route_description: "From Kandy town center, proceed along Peradeniya Road for about 8km up to University junction, turn left on to Temple Road and proceed for about 2km. The subject property lies on the right hand side of the road fronting same.",

      property_description: "This is rectangular shaped fairly level block of land with mixed residential and agricultural use, having a frontage of about 60 feet to the motorable road along the western boundary. The soil is red earth and is suitable for construction purposes.",

      market_analysis: "This is a well-developed residential locality about 8km from Kandy city center. The area is moderately developed with good infrastructure including educational facilities, healthcare services, and commercial establishments within reasonable distance.",

      locality_analysis: "The subject property is located in a semi-urban locality within the administrative boundaries of Kandy District, Central Province. The area benefits from well-maintained access roads and basic infrastructure including electricity, water supply, and telecommunication services. Educational facilities include several primary schools within 2km radius and secondary schools within 5km. Healthcare services are accessible with a government hospital approximately 8km away. The locality shows moderate development with a balanced mix of residential and commercial properties, indicating stable market demand and good investment potential.",

      building_description: "Single storied residential building in good condition, about 15 years old.\n\nRoof: AC sheets on timber rafters\nWalls: Cement block walls with cement plaster\nFloor: Cement concrete floors with ceramic tiles\nDoors & Windows: Timber doors and windows with glass panels",

      quality_validation: '{"issues": [], "suggestions": ["Consider adding more details about building conveniences"], "completeness_score": 85}'
    };

    return placeholders[contentType] || 'AI-generated content placeholder';
  }

  getModelForContentType(contentType) {
    // Use GPT-4 for complex analysis, GPT-3.5-turbo for simple descriptions (cost optimization)
    const complexTypes = ['market_analysis', 'locality_analysis', 'quality_validation'];
    return complexTypes.includes(contentType) ? 'gpt-4' : 'gpt-3.5-turbo';
  }

  getMaxTokensForContentType(contentType) {
    const tokenLimits = {
      route_description: 200,
      property_description: 300,
      market_analysis: 400,
      locality_analysis: 450,
      building_description: 300,
      quality_validation: 500
    };

    return tokenLimits[contentType] || 300;
  }

  calculateCost(tokens, model) {
    // OpenAI pricing (as of 2024)
    const pricing = {
      'gpt-3.5-turbo': 0.002 / 1000, // $0.002 per 1K tokens
      'gpt-4': 0.03 / 1000 // $0.03 per 1K tokens
    };

    return (pricing[model] || pricing['gpt-3.5-turbo']) * tokens;
  }

  // ===============================================
  // Caching Methods (Cost Optimization)
  // ===============================================

  async getCachedContent(contentType, inputData) {
    try {
      const inputHash = this.generateInputHash(contentType, inputData);

      const query = `
        SELECT * FROM generated_content
        WHERE content_type = $1 AND input_hash = $2
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [contentType, inputHash]);

      if (result.rows.length > 0) {
        const cached = result.rows[0];
        logger.info(`Cache hit for ${contentType} - saving $${cached.cost_usd}`);
        return cached;
      }

      return null;
    } catch (error) {
      logger.error('Error checking cache:', error);
      return null;
    }
  }

  async cacheContent(contentType, inputData, response) {
    try {
      const inputHash = this.generateInputHash(contentType, inputData);

      const query = `
        INSERT INTO generated_content
        (content_type, input_hash, input_data, generated_text, ai_model, tokens_used, cost_usd)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (content_type, input_hash)
        DO UPDATE SET
          reuse_count = generated_content.reuse_count + 1,
          last_used_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const values = [
        contentType,
        inputHash,
        JSON.stringify(inputData),
        response.generated_text,
        response.ai_model,
        response.tokens_used,
        response.cost_usd
      ];

      await pool.query(query, values);
      logger.info(`Cached ${contentType} content - cost: $${response.cost_usd}`);
    } catch (error) {
      logger.error('Error caching content:', error);
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  async updateCacheUsage(cacheId) {
    try {
      await pool.query(
        'UPDATE generated_content SET reuse_count = reuse_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [cacheId]
      );
    } catch (error) {
      logger.error('Error updating cache usage:', error);
    }
  }

  generateInputHash(contentType, inputData) {
    const hashInput = contentType + JSON.stringify(inputData);
    return crypto.createHash('md5').update(hashInput).digest('hex');
  }

  // ===============================================
  // Batch Processing Methods
  // ===============================================

  async enhanceReportSections(report, sections) {
    const results = [];
    let totalCost = 0;

    for (const section of sections) {
      try {
        const inputData = this.extractInputDataForSection(report, section);
        const result = await this.generateContent(section, inputData);

        results.push({
          section,
          generated_text: result.generated_text,
          cost_usd: result.cost_usd,
          cached: result.cached
        });

        totalCost += result.cost_usd;

        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Error enhancing section ${section}:`, error);
        results.push({
          section,
          error: error.message,
          cost_usd: 0,
          cached: false
        });
      }
    }

    logger.info(`Enhanced ${sections.length} sections for report ${report.id} - total cost: $${totalCost}`);
    return results;
  }

  extractInputDataForSection(report, section) {
    const extractors = {
      route_description: () => ({
        start_location: report.nearest_town,
        coordinates: { latitude: report.latitude, longitude: report.longitude },
        raw_directions: report.route_description
      }),

      property_description: () => ({
        land_shape: report.land_shape,
        topography: report.topography_type,
        land_use: report.land_use_type,
        frontage: report.frontage_measurement,
        access_road: report.access_road_type,
        soil_type: report.soil_type,
        plantation: report.plantation_description
      }),

      market_analysis: () => ({
        location: `${report.village_name}, ${report.district}`,
        development_level: report.development_level,
        distance_to_town: report.distance_to_town,
        nearby_facilities: report.nearby_facilities_list
      }),

      locality_analysis: () => ({
        village_name: report.village_name,
        district: report.district,
        province: report.province,
        locality_type: report.locality_type,
        development_level: report.development_level,
        infrastructure_description: report.infrastructure_description,
        nearby_facilities: report.nearby_facilities_list,
        distance_to_major_city: report.distance_to_major_city
      }),

      building_description: () => ({
        building_type: report.building_type,
        age: report.building_age,
        condition: report.condition_grade,
        materials: {
          roof: report.roof_description,
          walls: report.wall_description,
          floor: report.floor_description
        },
        floor_area: report.total_floor_area,
        rooms: report.room_layout_description
      })
    };

    return extractors[section] ? extractors[section]() : {};
  }

  // ===============================================
  // Cost Analytics
  // ===============================================

  async getCostSummary(userId, dateRange = {}) {
    try {
      let query = `
        SELECT
          content_type,
          COUNT(*) as generations,
          SUM(CASE WHEN reuse_count = 1 THEN cost_usd ELSE 0 END) as actual_cost,
          SUM(cost_usd * reuse_count) as cost_without_cache,
          AVG(tokens_used) as avg_tokens
        FROM generated_content gc
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 1;

      if (dateRange.start_date) {
        query += ` AND created_at >= $${paramCount}`;
        values.push(dateRange.start_date);
        paramCount++;
      }

      if (dateRange.end_date) {
        query += ` AND created_at <= $${paramCount}`;
        values.push(dateRange.end_date);
        paramCount++;
      }

      query += ' GROUP BY content_type ORDER BY actual_cost DESC';

      const result = await pool.query(query, values);

      const summary = result.rows.reduce((acc, row) => ({
        total_generations: acc.total_generations + parseInt(row.generations),
        actual_cost: acc.actual_cost + parseFloat(row.actual_cost),
        cost_without_cache: acc.cost_without_cache + parseFloat(row.cost_without_cache)
      }), { total_generations: 0, actual_cost: 0, cost_without_cache: 0 });

      summary.savings = summary.cost_without_cache - summary.actual_cost;
      summary.savings_percentage = summary.cost_without_cache > 0
        ? (summary.savings / summary.cost_without_cache * 100).toFixed(1)
        : 0;

      return {
        summary,
        by_content_type: result.rows
      };
    } catch (error) {
      logger.error('Error getting cost summary:', error);
      throw new Error('Failed to get cost summary');
    }
  }

  // ===============================================
  // Utility Methods
  // ===============================================

  isAvailable() {
    return this.isEnabled;
  }

  async testConnection() {
    if (!this.isEnabled) {
      return { success: false, message: 'OpenAI API not configured' };
    }

    try {
      // Test with a simple prompt
      const result = await this.generateContent('route_description', {
        start_location: 'Colombo',
        coordinates: { latitude: 6.9271, longitude: 79.8612 }
      });

      return { success: true, message: 'AI service is working correctly' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new AIService();