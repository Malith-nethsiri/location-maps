const { Pool } = require('pg');
const pool = require('../config/database');
const logger = require('../utils/logger');
const locationReportService = require('./locationReportService');

class ReportsService {
  // ===============================================
  // User Profile Management
  // ===============================================

  async getUserProfile(userId) {
    try {
      const query = `
        SELECT * FROM user_profiles
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        // Create default profile if doesn't exist
        return await this.createDefaultProfile(userId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async createDefaultProfile(userId) {
    try {
      const query = `
        INSERT INTO user_profiles (user_id, full_name, preferences)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const defaultPreferences = {
        default_rics_year: new Date().getFullYear(),
        default_report_type: 'fair_value',
        currency_format: 'LKR'
      };

      const result = await pool.query(query, [
        userId,
        'New User', // User should update this
        JSON.stringify(defaultPreferences)
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating default profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  async updateUserProfile(userId, profileData) {
    try {
      // Build dynamic update query
      const setFields = [];
      const values = [];
      let paramCount = 1;

      // Map of allowed fields to update
      const allowedFields = [
        'honorable', 'full_name', 'professional_title', 'qualifications_list',
        'professional_status', 'house_number', 'street_name', 'area_name',
        'city', 'district', 'phone_number', 'mobile_number', 'email_address',
        'ivsl_registration', 'default_valuer_reference', 'preferences'
      ];

      for (const [key, value] of Object.entries(profileData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          setFields.push(`${key} = $${paramCount}`);
          // Handle JSON fields
          if (key === 'preferences' || key === 'qualifications_list') {
            values.push(typeof value === 'string' ? value : JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramCount++;
        }
      }

      if (setFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE user_profiles
        SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramCount}
        RETURNING *
      `;
      values.push(userId);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('User profile not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  // ===============================================
  // Report Management
  // ===============================================

  async createReport(reportData) {
    try {
      // Generate report reference
      const reportRef = await this.generateReportReference(
        reportData.user_id,
        reportData.report_date || new Date()
      );

      // Extract coordinates if provided
      let coordinates = null;
      if (reportData.coordinates) {
        coordinates = `POINT(${reportData.coordinates.longitude} ${reportData.coordinates.latitude})`;
      }

      const query = `
        INSERT INTO valuation_reports (
          user_id, report_reference, report_date, report_type,
          valuation_purpose, coordinates, latitude, longitude,
          status
        )
        VALUES ($1, $2, $3, $4, $5, ${coordinates ? 'ST_GeogFromText($6)' : 'NULL'}, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        reportData.user_id,
        reportRef,
        reportData.report_date || new Date(),
        reportData.report_type || 'fair_value',
        reportData.valuation_purpose || 'Property valuation for client assessment',
        ...(coordinates ? [coordinates] : []),
        reportData.coordinates?.latitude || null,
        reportData.coordinates?.longitude || null,
        'draft'
      ];

      // Adjust query if no coordinates
      const finalQuery = coordinates ? query : query.replace(', ST_GeogFromText($6)', ', NULL');
      const finalValues = coordinates ? values : values.filter((_, i) => i !== 5);

      const result = await pool.query(finalQuery, finalValues);
      const report = result.rows[0];

      // If coordinates provided, automatically trigger location intelligence analysis
      if (reportData.coordinates) {
        try {
          logger.info(`Triggering location analysis for report ${report.id} at coordinates: ${reportData.coordinates.latitude}, ${reportData.coordinates.longitude}`);

          const locationAnalysis = await locationReportService.analyzeLocationForReport({
            latitude: reportData.coordinates.latitude,
            longitude: reportData.coordinates.longitude
          });

          if (locationAnalysis.success) {
            // Store location context in database
            await this.saveLocationContext(report.id, locationAnalysis);

            // Auto-populate report sections with location data
            await this.autoPopulateFromLocationAnalysis(report.id, locationAnalysis.location_intelligence);

            logger.info(`Location analysis completed for report ${report.id}`);
          }
        } catch (locationError) {
          logger.warn(`Location analysis failed for report ${report.id}:`, locationError);
          // Continue without location analysis - don't fail report creation
        }
      }

      // Legacy support: If location context provided manually, use it
      if (reportData.location_context && !reportData.coordinates) {
        await this.autoFillFromLocationContext(report.id, reportData.location_context);
      }

      logger.info(`Report created: ${report.id} - ${reportRef}`);
      return report;
    } catch (error) {
      logger.error('Error creating report:', error);
      throw new Error('Failed to create report');
    }
  }

  async generateReportReference(userId, reportDate) {
    try {
      // Get user's default reference prefix or use user_id
      const profileQuery = 'SELECT default_valuer_reference FROM user_profiles WHERE user_id = $1';
      const profileResult = await pool.query(profileQuery, [userId]);

      const prefix = profileResult.rows[0]?.default_valuer_reference ||
                    `VR/${userId.slice(-4).toUpperCase()}`;

      // Count reports for this year
      const year = reportDate.getFullYear();
      const countQuery = `
        SELECT COUNT(*) as count
        FROM valuation_reports
        WHERE user_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
      `;
      const countResult = await pool.query(countQuery, [userId, year]);
      const reportCount = parseInt(countResult.rows[0].count) + 1;

      return `${prefix}/${year}/${reportCount.toString().padStart(3, '0')}`;
    } catch (error) {
      logger.error('Error generating report reference:', error);
      throw new Error('Failed to generate report reference');
    }
  }

  async getReport(reportId) {
    try {
      const query = `
        SELECT vr.*, up.full_name as valuer_name, up.professional_title
        FROM valuation_reports vr
        LEFT JOIN user_profiles up ON vr.user_id = up.user_id
        WHERE vr.id = $1
      `;

      const result = await pool.query(query, [reportId]);

      if (result.rows.length === 0) {
        return null;
      }

      // Also get report images
      const imagesQuery = 'SELECT * FROM report_images WHERE report_id = $1 ORDER BY category, display_order';
      const imagesResult = await pool.query(imagesQuery, [reportId]);

      const report = result.rows[0];
      report.images = imagesResult.rows;

      return report;
    } catch (error) {
      logger.error('Error fetching report:', error);
      throw new Error('Failed to fetch report');
    }
  }

  async getUserReports(userId, options = {}) {
    try {
      let whereClause = 'WHERE user_id = $1';
      let values = [userId];
      let paramCount = 2;

      if (options.status) {
        whereClause += ` AND status = $${paramCount}`;
        values.push(options.status);
        paramCount++;
      }

      const query = `
        SELECT id, report_reference, report_date, valuation_date, status,
               report_type, valuation_purpose, created_at, updated_at,
               COALESCE(market_value, 0) as market_value,
               COALESCE(village_name || ', ' || district, 'Location not set') as location_summary
        FROM valuation_reports
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      values.push(options.limit || 20, options.offset || 0);

      const result = await pool.query(query, values);

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM valuation_reports ${whereClause}`;
      const countResult = await pool.query(countQuery, values.slice(0, paramCount - 2));

      return {
        reports: result.rows,
        total: parseInt(countResult.rows[0].total)
      };
    } catch (error) {
      logger.error('Error fetching user reports:', error);
      throw new Error('Failed to fetch user reports');
    }
  }

  async updateReportSection(reportId, section, data) {
    try {
      // Map section names to database fields
      const sectionFieldMap = {
        'basic_info': ['instruction_source', 'client_designation', 'client_organization', 'client_address'],
        'property_location': ['village_name', 'pradeshiya_sabha', 'district', 'province', 'coordinates'],
        'legal_details': ['lot_number', 'plan_number', 'survey_date', 'licensed_surveyor'],
        'boundaries': ['north_boundary', 'east_boundary', 'south_boundary', 'west_boundary'],
        'land_description': ['land_shape', 'topography_type', 'soil_type', 'plantation_description'],
        'building_details': ['building_type', 'condition_grade', 'building_age', 'total_floor_area'],
        'valuation': ['land_rate', 'building_rate', 'market_value', 'forced_sale_value']
      };

      const fieldsToUpdate = sectionFieldMap[section];
      if (!fieldsToUpdate) {
        throw new Error(`Invalid section: ${section}`);
      }

      // Build update query
      const setFields = [];
      const values = [];
      let paramCount = 1;

      for (const field of fieldsToUpdate) {
        if (data[field] !== undefined) {
          setFields.push(`${field} = $${paramCount}`);
          values.push(data[field]);
          paramCount++;
        }
      }

      if (setFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE valuation_reports
        SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;
      values.push(reportId);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating report section:', error);
      throw error;
    }
  }

  async updateReportStatus(reportId, status) {
    try {
      let additionalFields = '';
      const values = [status, reportId];

      // Set completed_at timestamp when status changes to completed or finalized
      if (status === 'completed' || status === 'finalized') {
        additionalFields = ', completed_at = CURRENT_TIMESTAMP';
      }

      const query = `
        UPDATE valuation_reports
        SET status = $1, updated_at = CURRENT_TIMESTAMP ${additionalFields}
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating report status:', error);
      throw error;
    }
  }

  // ===============================================
  // Location Integration
  // ===============================================

  async getLocationData(coordinates) {
    try {
      // Use existing location service to get POI and city data
      const locationService = require('./optimizedLocationService');

      const analysis = await locationService.analyzeLocation({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius: 5000,
        includeCategories: ['school', 'hospital', 'government', 'religious', 'store']
      });

      return analysis;
    } catch (error) {
      logger.warn('Could not fetch location data:', error.message);
      return null;
    }
  }

  async autoFillFromLocationContext(reportId, locationContext) {
    try {
      const updateData = {};

      // Extract administrative details from address
      if (locationContext.address) {
        const addressParts = locationContext.address.formatted_address.split(',');
        if (addressParts.length >= 2) {
          updateData.district = addressParts[addressParts.length - 2].trim();
          updateData.province = addressParts[addressParts.length - 1].trim();
        }
      }

      // Set nearest city information
      if (locationContext.nearest_city) {
        updateData.nearest_town = locationContext.nearest_city.name;
        updateData.distance_to_town = `${locationContext.nearest_city.distance}km`;
      }

      // Generate locality description from POI data
      if (locationContext.points_of_interest && locationContext.points_of_interest.length > 0) {
        const facilities = locationContext.points_of_interest
          .slice(0, 5)
          .map(poi => `${poi.name} (${poi.distance}km)`)
          .join(', ');

        updateData.nearby_facilities_list = `{${facilities}}`;
        updateData.market_demand_analysis = this.generateMarketAnalysisFromPOI(locationContext.points_of_interest);
      }

      if (Object.keys(updateData).length > 0) {
        await this.updateReportSection(reportId, 'location_context', updateData);
      }
    } catch (error) {
      logger.warn('Could not auto-fill from location context:', error.message);
    }
  }

  generateMarketAnalysisFromPOI(pois) {
    const categories = {};
    pois.forEach(poi => {
      categories[poi.category] = (categories[poi.category] || 0) + 1;
    });

    const analysis = [];
    if (categories.school) analysis.push(`${categories.school} educational facilities nearby`);
    if (categories.hospital) analysis.push(`${categories.hospital} healthcare facilities nearby`);
    if (categories.store || categories.commercial) analysis.push('good commercial accessibility');
    if (categories.government) analysis.push('proximity to government services');

    const developmentLevel = Object.keys(categories).length > 3 ? 'well-developed' :
                            Object.keys(categories).length > 1 ? 'moderately developed' : 'developing';

    return `This is a ${developmentLevel} locality with ${analysis.join(', ')}. The area shows good infrastructure development and accessibility to essential services.`;
  }

  // ===============================================
  // Templates and Reference Data
  // ===============================================

  async getTemplates(category) {
    try {
      const query = `
        SELECT template_name, template_content, is_default
        FROM report_templates
        WHERE template_category = $1
        ORDER BY is_default DESC, template_name ASC
      `;

      const result = await pool.query(query, [category]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching templates:', error);
      throw new Error('Failed to fetch templates');
    }
  }

  async getSriLankanLocations(type, parent) {
    try {
      let query = 'SELECT DISTINCT name FROM sri_lankan_cities';
      const values = [];

      if (type === 'province') {
        query = 'SELECT DISTINCT province as name FROM sri_lankan_cities WHERE province IS NOT NULL ORDER BY province';
      } else if (type === 'district') {
        query = 'SELECT DISTINCT district as name FROM sri_lankan_cities WHERE district IS NOT NULL';
        if (parent) {
          query += ' AND province = $1';
          values.push(parent);
        }
        query += ' ORDER BY district';
      } else if (type === 'city') {
        query = 'SELECT name FROM sri_lankan_cities WHERE 1=1';
        if (parent) {
          query += ' AND district = $1';
          values.push(parent);
        }
        query += ' ORDER BY population DESC, name';
      }

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching Sri Lankan locations:', error);
      throw new Error('Failed to fetch location data');
    }
  }

  // ===============================================
  // PDF Generation (Placeholder - will implement with puppeteer)
  // ===============================================

  async generateReportHTML(report) {
    try {
      const pdfService = require('./pdfService');

      // Get user profile for header information
      const userProfile = await this.getUserProfile(report.user_id);

      return pdfService.generateReportHTML(report, userProfile, { isDraft: true, includeImages: true });
    } catch (error) {
      logger.error('Error generating report HTML:', error);
      throw new Error('Failed to generate report HTML');
    }
  }

  async generateReportPDF(report, options = {}) {
    try {
      const pdfService = require('./pdfService');

      // Get user profile for header information
      const userProfile = await this.getUserProfile(report.user_id);

      return await pdfService.generatePDF(report, userProfile, options);
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  async validateReport(report) {
    const errors = [];
    const warnings = [];

    // Required fields validation based on report-structure.md
    const requiredFields = [
      { field: 'instruction_source', section: 'Basic Information' },
      { field: 'valuation_purpose', section: 'Basic Information' },
      { field: 'lot_number', section: 'Property Identification' },
      { field: 'plan_number', section: 'Property Identification' },
      { field: 'current_owner', section: 'Ownership' },
      { field: 'land_rate', section: 'Valuation' },
      { field: 'market_value', section: 'Valuation' }
    ];

    requiredFields.forEach(({ field, section }) => {
      if (!report[field] || report[field].toString().trim() === '') {
        errors.push(`${section}: ${field} is required`);
      }
    });

    // Business logic validations
    if (report.building_age && report.building_age > 200) {
      warnings.push('Building age seems unusually high');
    }

    if (report.land_rate && report.market_value) {
      const calculatedLandValue = report.land_rate * (report.perches || 0);
      if (Math.abs(calculatedLandValue - report.market_value) > report.market_value * 0.1) {
        warnings.push('Land value calculation may be inconsistent with market value');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ===============================================
  // Image Management
  // ===============================================

  async saveReportImage(reportId, imageData) {
    try {
      const query = `
        INSERT INTO report_images (
          report_id, category, filename, file_path, file_size, mime_type, caption
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        reportId,
        imageData.category,
        imageData.filename,
        imageData.file_path,
        imageData.file_size,
        imageData.mime_type,
        imageData.caption
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving report image:', error);
      throw new Error('Failed to save image');
    }
  }

  async getReportImages(reportId, category = null) {
    try {
      let query = 'SELECT * FROM report_images WHERE report_id = $1';
      const values = [reportId];

      if (category) {
        query += ' AND category = $2';
        values.push(category);
      }

      query += ' ORDER BY category, display_order, created_at';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching report images:', error);
      throw new Error('Failed to fetch images');
    }
  }

  async deleteReportImage(reportId, imageId) {
    try {
      const { deleteFile } = require('../middleware/upload');

      // Get image info first
      const imageQuery = 'SELECT * FROM report_images WHERE id = $1 AND report_id = $2';
      const imageResult = await pool.query(imageQuery, [imageId, reportId]);

      if (imageResult.rows.length === 0) {
        return false;
      }

      const image = imageResult.rows[0];

      // Delete from database
      const deleteQuery = 'DELETE FROM report_images WHERE id = $1 AND report_id = $2';
      await pool.query(deleteQuery, [imageId, reportId]);

      // Delete file from disk
      await deleteFile(image.file_path);

      return true;
    } catch (error) {
      logger.error('Error deleting report image:', error);
      throw new Error('Failed to delete image');
    }
  }

  async updateImageOrder(reportId, imageOrders) {
    try {
      // imageOrders is an array of { id, display_order }
      for (const { id, display_order } of imageOrders) {
        await pool.query(
          'UPDATE report_images SET display_order = $1 WHERE id = $2 AND report_id = $3',
          [display_order, id, reportId]
        );
      }

      return true;
    } catch (error) {
      logger.error('Error updating image order:', error);
      throw new Error('Failed to update image order');
    }
  }

  // ===============================================
  // Analytics and Cost Tracking
  // ===============================================

  async getCostAnalytics(userId, dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;

      let query = `
        SELECT
          COUNT(DISTINCT report_id) as reports_generated,
          SUM(cost_usd) as total_ai_cost,
          AVG(cost_usd) as avg_cost_per_generation,
          content_type,
          COUNT(*) as generations_count
        FROM generated_content gc
        JOIN valuation_reports vr ON vr.id::text LIKE '%' || gc.id::text || '%'
        WHERE vr.user_id = $1
      `;

      const values = [userId];
      let paramCount = 2;

      if (start_date) {
        query += ` AND gc.created_at >= $${paramCount}`;
        values.push(start_date);
        paramCount++;
      }

      if (end_date) {
        query += ` AND gc.created_at <= $${paramCount}`;
        values.push(end_date);
        paramCount++;
      }

      query += ' GROUP BY content_type ORDER BY total_ai_cost DESC';

      const result = await pool.query(query, values);

      return {
        summary: result.rows.reduce((acc, row) => ({
          total_reports: acc.total_reports + parseInt(row.reports_generated),
          total_cost: acc.total_cost + parseFloat(row.total_ai_cost),
          total_generations: acc.total_generations + parseInt(row.generations_count)
        }), { total_reports: 0, total_cost: 0, total_generations: 0 }),
        by_content_type: result.rows
      };
    } catch (error) {
      logger.error('Error fetching cost analytics:', error);
      throw new Error('Failed to fetch cost analytics');
    }
  }

  // ===============================================
  // Location Intelligence Integration
  // ===============================================

  async saveLocationContext(reportId, locationAnalysis) {
    try {
      const { location_intelligence, coordinates } = locationAnalysis;

      // Save main location context
      const locationContextQuery = `
        INSERT INTO report_location_context (
          report_id, latitude, longitude,
          village_name, pradeshiya_sabha, korale, hathpattu, district, province,
          formatted_address, nearest_major_city, route_instructions,
          route_distance_km, route_duration, route_quality,
          satellite_image_url, hybrid_image_url, terrain_image_url,
          locality_type, distance_to_town_km, nearest_town,
          development_level, infrastructure_description, nearby_facilities,
          raw_poi_data, raw_route_data, raw_administrative_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING id
      `;

      const locationValues = [
        reportId,
        coordinates.latitude,
        coordinates.longitude,
        location_intelligence.section31_location.village_name,
        location_intelligence.section31_location.pradeshiya_sabha,
        location_intelligence.section31_location.korale,
        location_intelligence.section31_location.hathpattu,
        location_intelligence.section31_location.district,
        location_intelligence.section31_location.province,
        location_intelligence.section31_location.formatted_address,
        location_intelligence.section41_route_data.nearest_major_city,
        location_intelligence.section41_route_data.route_instructions,
        location_intelligence.section41_route_data.distance_km,
        location_intelligence.section41_route_data.estimated_time,
        location_intelligence.section41_route_data.route_quality,
        location_intelligence.section42_location_map.satellite_image_url,
        location_intelligence.section42_location_map.hybrid_image_url,
        location_intelligence.section42_location_map.terrain_image_url,
        location_intelligence.section80_locality_data.locality_type,
        location_intelligence.section80_locality_data.distance_to_town,
        location_intelligence.section80_locality_data.nearest_town,
        location_intelligence.section80_locality_data.development_level,
        location_intelligence.section80_locality_data.infrastructure_description,
        JSON.stringify(location_intelligence.section80_locality_data.nearby_facilities),
        JSON.stringify(location_intelligence.raw_data.poi_analysis),
        JSON.stringify(location_intelligence.raw_data.route_analysis),
        JSON.stringify(location_intelligence.raw_data.administrative_hierarchy)
      ];

      const locationResult = await pool.query(locationContextQuery, locationValues);

      // Save detailed POI analysis
      if (location_intelligence.raw_data.poi_analysis) {
        await this.savePOIAnalysis(reportId, location_intelligence.raw_data.poi_analysis);
      }

      logger.info(`Location context saved for report ${reportId}`);
      return locationResult.rows[0];

    } catch (error) {
      logger.error('Error saving location context:', error);
      throw error;
    }
  }

  async savePOIAnalysis(reportId, poiData) {
    try {
      const poiInsertPromises = [];

      Object.entries(poiData).forEach(([category, facilities]) => {
        facilities.forEach(facility => {
          const poiQuery = `
            INSERT INTO report_poi_analysis (
              report_id, category, facility_name, facility_type,
              distance_km, address, rating, place_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;

          const poiValues = [
            reportId,
            category,
            facility.name,
            facility.type,
            facility.distance,
            facility.address,
            facility.rating,
            facility.place_id
          ];

          poiInsertPromises.push(pool.query(poiQuery, poiValues));
        });
      });

      await Promise.all(poiInsertPromises);
      logger.info(`POI analysis saved for report ${reportId}: ${poiInsertPromises.length} facilities`);

    } catch (error) {
      logger.error('Error saving POI analysis:', error);
      throw error;
    }
  }

  async autoPopulateFromLocationAnalysis(reportId, locationIntelligence) {
    try {
      // Auto-populate specific report sections with location data
      const updates = [];

      // Section 3.1: Property Identification - Location
      if (locationIntelligence.section31_location) {
        const section31Data = locationIntelligence.section31_location;
        updates.push({
          section: 'property_identification',
          field: 'village_name',
          value: section31Data.village_name
        });
        updates.push({
          section: 'property_identification',
          field: 'district',
          value: section31Data.district
        });
        updates.push({
          section: 'property_identification',
          field: 'province',
          value: section31Data.province
        });
      }

      // Section 8.0: Locality Description
      if (locationIntelligence.section80_locality_data) {
        const section80Data = locationIntelligence.section80_locality_data;
        updates.push({
          section: 'locality_description',
          field: 'locality_type',
          value: section80Data.locality_type
        });
        updates.push({
          section: 'locality_description',
          field: 'development_level',
          value: section80Data.development_level
        });
        updates.push({
          section: 'locality_description',
          field: 'infrastructure_description',
          value: section80Data.infrastructure_description
        });
      }

      // Apply updates to the report
      for (const update of updates) {
        await this.updateReportSection(reportId, update.section, {
          [update.field]: update.value
        });
      }

      logger.info(`Auto-populated ${updates.length} fields for report ${reportId} from location analysis`);

    } catch (error) {
      logger.error('Error auto-populating from location analysis:', error);
      throw error;
    }
  }

  async getLocationContext(reportId) {
    try {
      const query = `
        SELECT * FROM report_location_context
        WHERE report_id = $1
      `;

      const result = await pool.query(query, [reportId]);

      if (result.rows.length === 0) {
        return null;
      }

      const locationContext = result.rows[0];

      // Also get POI analysis
      const poiQuery = `
        SELECT * FROM report_poi_analysis
        WHERE report_id = $1
        ORDER BY category, distance_km
      `;

      const poiResult = await pool.query(poiQuery, [reportId]);

      return {
        ...locationContext,
        poi_analysis: poiResult.rows
      };

    } catch (error) {
      logger.error('Error fetching location context:', error);
      throw error;
    }
  }

  async regenerateLocationAnalysis(reportId) {
    try {
      // Get report coordinates
      const reportQuery = `
        SELECT latitude, longitude FROM valuation_reports
        WHERE id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      `;

      const reportResult = await pool.query(reportQuery, [reportId]);

      if (reportResult.rows.length === 0) {
        throw new Error('Report not found or does not have coordinates');
      }

      const { latitude, longitude } = reportResult.rows[0];

      // Trigger fresh location analysis
      const locationAnalysis = await locationReportService.analyzeLocationForReport({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });

      if (locationAnalysis.success) {
        // Delete existing location context
        await pool.query('DELETE FROM report_location_context WHERE report_id = $1', [reportId]);
        await pool.query('DELETE FROM report_poi_analysis WHERE report_id = $1', [reportId]);

        // Save new location context
        await this.saveLocationContext(reportId, locationAnalysis);

        // Auto-populate report sections
        await this.autoPopulateFromLocationAnalysis(reportId, locationAnalysis.location_intelligence);

        logger.info(`Location analysis regenerated for report ${reportId}`);
        return locationAnalysis;
      }

      throw new Error('Location analysis failed');

    } catch (error) {
      logger.error('Error regenerating location analysis:', error);
      throw error;
    }
  }

  async createReportFromCoordinates(userId, coordinates, initialData = {}) {
    try {
      // Create report with coordinates
      const reportData = {
        user_id: userId,
        coordinates: coordinates,
        report_type: initialData.report_type || 'fair_value',
        valuation_purpose: initialData.valuation_purpose || 'Property valuation for client assessment',
        ...initialData
      };

      const report = await this.createReport(reportData);

      // Location analysis will be triggered automatically in createReport method

      logger.info(`Report created from coordinates for user ${userId}: ${report.id}`);
      return report;

    } catch (error) {
      logger.error('Error creating report from coordinates:', error);
      throw error;
    }
  }

  // ===============================================
  // Dashboard and Analytics Methods
  // ===============================================

  async getDashboardData(userId) {
    try {
      const [
        reportsData,
        aiUsageData,
        activityData,
        recentReports
      ] = await Promise.all([
        this.getReportsSummary(userId),
        this.getAIUsageSummary(userId),
        this.getActivitySummary(userId),
        this.getRecentReports(userId)
      ]);

      return {
        reports: reportsData,
        ai_usage: aiUsageData,
        activity: activityData,
        recent_reports: recentReports
      };
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  async getReportsSummary(userId) {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as this_month
        FROM valuation_reports
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      return {
        total: parseInt(result.rows[0].total),
        draft: parseInt(result.rows[0].draft),
        completed: parseInt(result.rows[0].completed),
        this_month: parseInt(result.rows[0].this_month)
      };
    } catch (error) {
      logger.error('Error fetching reports summary:', error);
      throw error;
    }
  }

  async getAIUsageSummary(userId) {
    try {
      const query = `
        SELECT
          COUNT(*) as total_requests,
          COALESCE(SUM(cost_usd), 0) as total_cost,
          COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN cost_usd ELSE 0 END), 0) as cost_this_month
        FROM generated_content gc
        JOIN valuation_reports vr ON gc.report_id = vr.id
        WHERE vr.user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      return {
        total_requests: parseInt(result.rows[0].total_requests),
        total_cost: parseFloat(result.rows[0].total_cost),
        cost_this_month: parseFloat(result.rows[0].cost_this_month)
      };
    } catch (error) {
      logger.error('Error fetching AI usage summary:', error);
      return { total_requests: 0, total_cost: 0, cost_this_month: 0 };
    }
  }

  async getActivitySummary(userId) {
    try {
      const query = `
        SELECT
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as reports_created_today,
          MAX(updated_at) as last_activity
        FROM valuation_reports
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      return {
        last_login: result.rows[0].last_activity,
        reports_created_today: parseInt(result.rows[0].reports_created_today),
        pdf_generations_today: 0 // TODO: Add actual PDF generation tracking
      };
    } catch (error) {
      logger.error('Error fetching activity summary:', error);
      throw error;
    }
  }

  async getRecentReports(userId, limit = 5) {
    try {
      const query = `
        SELECT
          id, report_reference, status, created_at,
          CONCAT(village_name, ', ', district) as location
        FROM valuation_reports
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching recent reports:', error);
      throw error;
    }
  }

  async getAnalyticsData(userId, timeframe = 'month') {
    try {
      const [
        monthlyReports,
        locationDistribution,
        reportTypes,
        aiUsageTrend,
        valueRanges
      ] = await Promise.all([
        this.getMonthlyReports(userId, timeframe),
        this.getLocationDistribution(userId),
        this.getReportTypes(userId),
        this.getAIUsageTrend(userId, timeframe),
        this.getValueRanges(userId)
      ]);

      return {
        monthly_reports: monthlyReports,
        location_distribution: locationDistribution,
        report_types: reportTypes,
        ai_usage_trend: aiUsageTrend,
        value_ranges: valueRanges
      };
    } catch (error) {
      logger.error('Error fetching analytics data:', error);
      throw error;
    }
  }

  async getMonthlyReports(userId, timeframe) {
    try {
      let dateFormat, dateInterval;
      switch (timeframe) {
        case 'week':
          dateFormat = 'YYYY-MM-DD';
          dateInterval = "date_trunc('day', created_at)";
          break;
        case 'quarter':
          dateFormat = 'YYYY-MM';
          dateInterval = "date_trunc('month', created_at)";
          break;
        case 'year':
          dateFormat = 'YYYY-MM';
          dateInterval = "date_trunc('month', created_at)";
          break;
        default:
          dateFormat = 'YYYY-MM';
          dateInterval = "date_trunc('month', created_at)";
      }

      const query = `
        SELECT
          to_char(${dateInterval}, '${dateFormat}') as month,
          COUNT(*) as count
        FROM valuation_reports
        WHERE user_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY ${dateInterval}
        ORDER BY ${dateInterval}
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching monthly reports:', error);
      throw error;
    }
  }

  async getLocationDistribution(userId) {
    try {
      const query = `
        SELECT district, COUNT(*) as count
        FROM valuation_reports
        WHERE user_id = $1 AND district IS NOT NULL
        GROUP BY district
        ORDER BY count DESC
        LIMIT 10
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching location distribution:', error);
      throw error;
    }
  }

  async getReportTypes(userId) {
    try {
      const query = `
        SELECT
          report_type as type,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM valuation_reports
        WHERE user_id = $1 AND report_type IS NOT NULL
        GROUP BY report_type
        ORDER BY count DESC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching report types:', error);
      throw error;
    }
  }

  async getAIUsageTrend(userId, timeframe) {
    try {
      const query = `
        SELECT
          DATE(gc.created_at) as date,
          COUNT(*) as requests,
          COALESCE(SUM(gc.cost_usd), 0) as cost
        FROM generated_content gc
        JOIN valuation_reports vr ON gc.report_id = vr.id
        WHERE vr.user_id = $1
        AND gc.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(gc.created_at)
        ORDER BY date
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching AI usage trend:', error);
      return [];
    }
  }

  async getValueRanges(userId) {
    try {
      const query = `
        SELECT
          CASE
            WHEN market_value < 5000000 THEN 'Under 5M'
            WHEN market_value < 10000000 THEN '5M - 10M'
            WHEN market_value < 25000000 THEN '10M - 25M'
            WHEN market_value < 50000000 THEN '25M - 50M'
            ELSE 'Over 50M'
          END as range,
          COUNT(*) as count
        FROM valuation_reports
        WHERE user_id = $1 AND market_value IS NOT NULL
        GROUP BY
          CASE
            WHEN market_value < 5000000 THEN 'Under 5M'
            WHEN market_value < 10000000 THEN '5M - 10M'
            WHEN market_value < 25000000 THEN '10M - 25M'
            WHEN market_value < 50000000 THEN '25M - 50M'
            ELSE 'Over 50M'
          END
        ORDER BY
          CASE range
            WHEN 'Under 5M' THEN 1
            WHEN '5M - 10M' THEN 2
            WHEN '10M - 25M' THEN 3
            WHEN '25M - 50M' THEN 4
            ELSE 5
          END
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching value ranges:', error);
      throw error;
    }
  }

  async getUserDistricts(userId) {
    try {
      const query = `
        SELECT DISTINCT district
        FROM valuation_reports
        WHERE user_id = $1 AND district IS NOT NULL
        ORDER BY district
      `;

      const result = await pool.query(query, [userId]);
      return result.rows.map(row => row.district);
    } catch (error) {
      logger.error('Error fetching user districts:', error);
      throw error;
    }
  }

  async getReportsWithPagination(filters) {
    try {
      const {
        userId,
        page = 1,
        limit = 10,
        search = '',
        status = null,
        district = null,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = filters;

      let whereClause = 'WHERE user_id = $1';
      let values = [userId];
      let paramCount = 2;

      // Add search filter
      if (search) {
        whereClause += ` AND (
          report_reference ILIKE $${paramCount} OR
          instruction_source ILIKE $${paramCount} OR
          village_name ILIKE $${paramCount}
        )`;
        values.push(`%${search}%`);
        paramCount++;
      }

      // Add status filter
      if (status) {
        whereClause += ` AND status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      // Add district filter
      if (district) {
        whereClause += ` AND district = $${paramCount}`;
        values.push(district);
        paramCount++;
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM valuation_reports ${whereClause}`;
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get reports
      const reportsQuery = `
        SELECT
          id, report_reference, status, instruction_source, valuation_purpose,
          village_name, district, province, market_value, created_at, updated_at,
          CASE
            WHEN status = 'draft' THEN
              COALESCE(
                (CASE WHEN village_name IS NOT NULL THEN 10 ELSE 0 END) +
                (CASE WHEN building_type IS NOT NULL THEN 20 ELSE 0 END) +
                (CASE WHEN market_value IS NOT NULL THEN 30 ELSE 0 END) +
                40, -- Base completion
                40
              )
            ELSE 100
          END as completion_percentage
        FROM valuation_reports
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      values.push(limit, offset);
      const reportsResult = await pool.query(reportsQuery, values);

      const totalPages = Math.ceil(total / limit);

      return {
        reports: reportsResult.rows,
        currentPage: page,
        totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      logger.error('Error fetching reports with pagination:', error);
      throw error;
    }
  }

  async deleteReport(reportId) {
    try {
      // Delete in order due to foreign key constraints
      await pool.query('DELETE FROM report_poi_analysis WHERE report_id = $1', [reportId]);
      await pool.query('DELETE FROM report_location_context WHERE report_id = $1', [reportId]);
      await pool.query('DELETE FROM report_images WHERE report_id = $1', [reportId]);
      await pool.query('DELETE FROM generated_content WHERE report_id = $1', [reportId]);
      await pool.query('DELETE FROM valuation_reports WHERE id = $1', [reportId]);

      logger.info(`Report ${reportId} deleted successfully`);
      return true;
    } catch (error) {
      logger.error('Error deleting report:', error);
      throw error;
    }
  }
}

module.exports = new ReportsService();