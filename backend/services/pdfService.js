const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class PDFService {
  constructor() {
    this.browser = null;
  }

  async initializeBrowser() {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        });
        logger.info('PDF service browser initialized');
      } catch (error) {
        logger.error('Failed to initialize PDF browser:', error);
        throw error;
      }
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('PDF service browser closed');
    }
  }

  // ===============================================
  // Report HTML Template Generation
  // ===============================================

  generateReportHTML(report, userProfile, options = {}) {
    const { isDraft = true, includeImages = true } = options;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valuation Report - ${report.report_reference}</title>
    <style>
        ${this.getReportCSS(isDraft)}
    </style>
</head>
<body>
    ${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}

    <!-- Document Header -->
    <div class="document-header">
        ${this.generateDocumentHeader(userProfile, report)}
    </div>

    <!-- Main Title -->
    <div class="main-title">
        <h1>VALUATION REPORT</h1>
        <h2>OF</h2>
        <h3>The Property Depicted As Lot ${report.lot_number || '[LOT_NUMBER]'}
            In Plan No ${report.plan_number || '[PLAN_NUMBER]'}
            ${report.survey_date ? 'dated ' + this.formatDate(report.survey_date) : '[DATED]'}
            Made By ${report.licensed_surveyor || '[LICENSED_SURVEYOR_NAME]'}, Licensed Surveyor.</h3>
    </div>

    <!-- Report Sections -->
    ${this.generateSection1Preamble(report)}
    ${this.generateSection2ScopeOfWork(report, userProfile)}
    ${this.generateSection3PropertyIdentification(report)}
    ${this.generateSection4AccessAndAccessibility(report, includeImages)}
    ${this.generateSection5Boundaries(report)}
    ${this.generateSection6LandDescription(report, includeImages)}
    ${this.generateSection7BuildingDescription(report, includeImages)}
    ${this.generateSection8LocalityDescription(report)}
    ${this.generateSection9PlanningRegulations(report)}
    ${this.generateSection10EvidenceOfValue(report)}
    ${this.generateSection11ApproachToValuation(report)}
    ${this.generateSection12Valuation(report)}
    ${this.generateSection13Certification(report, userProfile)}

    <!-- Page Numbers -->
    <div class="page-numbers"></div>
</body>
</html>
    `.trim();
  }

  getReportCSS(isDraft) {
    return `
      @page {
        size: A4;
        margin: 25mm 20mm 25mm 30mm;
        @bottom-center {
          content: counter(page);
          font-family: 'Times New Roman', serif;
          font-size: 10pt;
        }
      }

      body {
        font-family: 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #000;
        margin: 0;
        padding: 0;
      }

      /* Draft Watermark */
      .draft-watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 72pt;
        color: rgba(255, 0, 0, 0.1);
        font-weight: bold;
        z-index: -1;
        pointer-events: none;
        display: ${isDraft ? 'block' : 'none'};
      }

      /* Document Header */
      .document-header {
        text-align: left;
        margin-bottom: 30px;
        font-size: 11pt;
      }

      .document-header .contact-info {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
      }

      .document-header .left-contact, .document-header .right-contact {
        flex: 1;
      }

      /* Main Title */
      .main-title {
        text-align: center;
        margin: 40px 0;
        page-break-after: avoid;
      }

      .main-title h1 {
        font-size: 14pt;
        font-weight: bold;
        margin: 0 0 10px 0;
        letter-spacing: 2px;
      }

      .main-title h2 {
        font-size: 12pt;
        font-weight: bold;
        margin: 0 0 10px 0;
      }

      .main-title h3 {
        font-size: 11pt;
        font-weight: normal;
        margin: 0;
        line-height: 1.6;
        max-width: 80%;
        margin-left: auto;
        margin-right: auto;
      }

      /* Section Styles */
      .section {
        margin: 25px 0;
        page-break-inside: avoid;
      }

      .section-title {
        font-size: 12pt;
        font-weight: bold;
        margin-bottom: 10px;
        color: #1f4e79;
      }

      .section-content {
        text-align: justify;
        margin-bottom: 15px;
      }

      .subsection {
        margin: 15px 0;
      }

      .subsection-title {
        font-size: 11pt;
        font-weight: bold;
        margin-bottom: 8px;
        text-decoration: underline;
      }

      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
        font-size: 10pt;
      }

      table, th, td {
        border: 1px solid #000;
      }

      th, td {
        padding: 6px 8px;
        text-align: left;
      }

      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }

      .number-cell {
        text-align: right;
      }

      /* Images */
      .image-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin: 15px 0;
        page-break-inside: avoid;
      }

      .property-image {
        width: 100%;
        height: auto;
        max-height: 150px;
        object-fit: cover;
        border: 1px solid #ccc;
      }

      .image-caption {
        text-align: center;
        font-size: 9pt;
        margin-top: 5px;
        font-style: italic;
      }

      /* Boundaries Box */
      .boundaries-box {
        border: 2px solid #000;
        padding: 15px;
        margin: 10px 0;
        text-align: center;
      }

      .boundaries-box .boundary-line {
        margin: 5px 0;
        font-weight: bold;
      }

      /* Valuation Tables */
      .valuation-table {
        margin: 20px 0;
        width: 100%;
      }

      .valuation-table td {
        padding: 8px;
        border: 1px solid #000;
      }

      .valuation-total {
        font-weight: bold;
        background-color: #f8f8f8;
      }

      /* Signature Section */
      .signature-section {
        margin-top: 40px;
        text-align: right;
      }

      .signature-line {
        border-bottom: 1px solid #000;
        width: 200px;
        margin: 40px 0 10px auto;
      }

      /* Page Breaks */
      .page-break {
        page-break-before: always;
      }

      /* Prevent orphans and widows */
      p {
        orphans: 3;
        widows: 3;
      }

      /* AI Enhancement Notes */
      .ai-note {
        font-size: 9pt;
        color: #666;
        font-style: italic;
        margin-top: 5px;
        border-left: 3px solid #4CAF50;
        padding-left: 8px;
      }

      /* Utilities */
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .underline { text-decoration: underline; }
      .mb-10 { margin-bottom: 10px; }
      .mb-15 { margin-bottom: 15px; }
      .mb-20 { margin-bottom: 20px; }
    `;
  }

  // ===============================================
  // Section Generation Methods
  // ===============================================

  generateDocumentHeader(userProfile, report) {
    return `
      <div class="header-content">
        <div style="text-align: center; font-weight: bold;">
          <div>${userProfile?.honorable || ''} ${userProfile?.full_name || '[VALUER_NAME]'}</div>
          <div>${userProfile?.professional_title || '[PROFESSIONAL_TITLE]'}</div>
          <div>${(userProfile?.qualifications_list || []).join(', ') || '[QUALIFICATIONS]'}</div>
          <div>${userProfile?.professional_status || '[PROFESSIONAL_STATUS]'}</div>
        </div>

        <div class="contact-info">
          <div class="left-contact">
            <div><strong>RESIDENCE :</strong> ${userProfile?.house_number || '[HOUSE_NUMBER]'}, ${userProfile?.street_name || '[STREET_NAME]'},</div>
            <div style="margin-left: 75px;">${userProfile?.area_name || '[AREA_NAME]'},</div>
            <div style="margin-left: 75px;">${userProfile?.city || '[CITY]'}, ${userProfile?.district || '[DISTRICT]'}</div>
          </div>
          <div class="right-contact">
            <div><strong>Telephone :</strong> ${userProfile?.phone_number || '[PHONE_NUMBER]'}</div>
            <div><strong>Mobile    :</strong> ${userProfile?.mobile_number || '[MOBILE_NUMBER]'}</div>
            <div><strong>E-mail    :</strong> ${userProfile?.email_address || '[EMAIL_ADDRESS]'}</div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <div style="display: flex; justify-content: space-between;">
            <div><strong>My Ref. :</strong> ${report.report_reference || '[VALUER_REFERENCE]'}</div>
            <div><strong>Date:</strong> ${this.formatDate(report.report_date) || '[REPORT_DATE]'}</div>
          </div>
        </div>
      </div>
    `;
  }

  generateSection1Preamble(report) {
    return `
      <div class="section">
        <div class="section-title">1.0 PREAMBLE</div>
        <div class="section-content">
          <p>This valuation report is prepared on the instructions given by ${report.instruction_source || '[INSTRUCTION_SOURCE]'},
          ${report.client_designation || '[CLIENT_DESIGNATION]'}, ${report.client_organization || '[CLIENT_ORGANIZATION]'},
          ${report.client_address || '[CLIENT_ADDRESS]'}, ${report.instruction_method || '[INSTRUCTION_METHOD]'}
          dated ${this.formatDate(report.instruction_date) || '[INSTRUCTION_DATE]'}, for the purpose of
          ${report.valuation_purpose || '[VALUATION_PURPOSE]'}.</p>

          <p>The property was inspected on ${this.formatDate(report.inspection_date) || '[INSPECTION_DATE]'}
          in the presence of ${report.persons_present || '[PERSONS_PRESENT]'}.</p>
        </div>
      </div>
    `;
  }

  generateSection2ScopeOfWork(report, userProfile) {
    const currentYear = new Date().getFullYear();
    const ricsYear = userProfile?.preferences?.default_rics_year || currentYear;

    return `
      <div class="section">
        <div class="section-title">2.0 SCOPE OF WORK</div>
        <div class="section-content">
          <p>This report is prepared in compliance with the SLFRS 13, International Valuation Standards
          incorporated in RICS Valuation – Professional Standards ${ricsYear}, commonly referred to as
          the 'Red Book' published by the Royal Institution of Chartered Surveyors, UK.</p>

          <p>I am independent in terms of the code of ethics of my profession, and there were no
          circumstances that impair or even appear to impair the objectivity of my work.</p>

          <p><strong>Fair Value:</strong> Fair value is the price that would be received to sell an asset or paid to transfer a liability in an orderly transaction between market participants at the measurement date under current market conditions.</p>

          <p><strong>Market Value:</strong> Market Value is the estimated amount for which an asset or liability should exchange on the valuation date between a willing buyer and a willing seller in an arm's length transaction, after proper marketing and where the parties had each acted knowledgeably, prudently and without compulsion.</p>
        </div>
      </div>
    `;
  }

  generateSection3PropertyIdentification(report) {
    return `
      <div class="section">
        <div class="section-title">3.0 PROPERTY IDENTIFICATION</div>

        <div class="subsection">
          <div class="subsection-title">3.1 Location</div>
          <p>The subject property is situated in the Village of ${report.village_name || '[VILLAGE_NAME]'} within the
          ${report.pradeshiya_sabha || '[PRADESHIYA_SABHA]'} in ${report.korale || '[KORALE]'} of
          ${report.hathpattu || '[HATHPATTU]'} in the District of ${report.district || '[DISTRICT]'},
          ${report.province || '[PROVINCE]'}.</p>

          ${report.latitude && report.longitude ?
            `<p>GPS Coordinates: Latitude ${report.latitude.toFixed(6)}, Longitude ${report.longitude.toFixed(6)}</p>`
            : '<p>GPS Coordinates: [LATITUDE], [LONGITUDE]</p>'
          }
        </div>

        <div class="subsection">
          <div class="subsection-title">3.2 Legal Description</div>
          <p>The property to be valued is identified as the land depicted as Lot ${report.lot_number || '[LOT_NUMBER]'}
          in Plan No: ${report.plan_number || '[PLAN_NUMBER]'} dated ${this.formatDate(report.survey_date) || '[SURVEY_DATE]'}
          made by ${report.licensed_surveyor || '[LICENSED_SURVEYOR]'}, Licensed Surveyor. This Survey Plan has been
          approved by the ${report.approving_authority || '[APPROVING_AUTHORITY]'} on
          ${this.formatDate(report.approval_date) || '[APPROVAL_DATE]'}.</p>
        </div>

        <div class="subsection">
          <div class="subsection-title">3.3 Ownership</div>
          <p>As per the documents available, by virtue of the Deed of Transfer No: ${report.deed_number || '[DEED_NUMBER]'}
          dated ${this.formatDate(report.deed_date) || '[DEED_DATE]'} attested by ${report.notary_public || '[NOTARY_PUBLIC]'},
          the subject property is presently owned by ${report.current_owner || '[CURRENT_OWNER]'}.</p>
        </div>

        <div class="subsection">
          <div class="subsection-title">3.4 Land Details</div>
          <p><strong>Name of Land:</strong> ${report.land_name || '[LAND_NAME]'}</p>
          <p><strong>Extent:</strong> Lot No: ${report.lot_number || '[LOT_NUMBER]'};
          ${report.acres || 0} A - ${report.roods || 0} R - ${report.perches || 0} P
          (${report.hectares ? report.hectares.toFixed(4) : '[HECTARES]'} Hectares)</p>
        </div>
      </div>
    `;
  }

  generateSection4AccessAndAccessibility(report, includeImages) {
    return `
      <div class="section">
        <div class="section-title">4.0 ACCESS AND ACCESSIBILITY</div>

        <div class="subsection">
          <div class="subsection-title">4.1 Route Description</div>
          <p>${report.ai_enhanced_route_description || report.route_description || '[ROUTE_DESCRIPTION - From nearest major city, proceed along main road for approximately X km, then turn onto access road. The subject property lies on the [left/right] side of the road fronting same.]'}</p>
          ${report.ai_enhanced_route_description ? '<p class="ai-note"><em>Route description enhanced with AI analysis</em></p>' : ''}
        </div>

        ${includeImages ? `
          <div class="subsection">
            <div class="subsection-title">4.2 Location Map</div>
            <div class="image-grid">
              ${report.images?.filter(img => img.category === 'location_maps').map(img => `
                <div>
                  <img src="${img.url || img.file_path}" alt="${img.caption}" class="property-image" />
                  <div class="image-caption">${img.caption || 'Location Map'}</div>
                </div>
              `).join('') || '<div style="text-align: center; padding: 40px; border: 1px dashed #ccc;">Location Map to be inserted</div>'}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  generateSection5Boundaries(report) {
    return `
      <div class="section">
        <div class="section-title">5.0 BOUNDARIES</div>
        <div class="section-content">
          <p>As per survey plan:</p>
          <div class="boundaries-box">
            <div class="boundary-line"><strong>North by:</strong> ${report.north_boundary || '[NORTH_BOUNDARY]'}</div>
            <div class="boundary-line"><strong>East by:</strong> ${report.east_boundary || '[EAST_BOUNDARY]'}</div>
            <div class="boundary-line"><strong>South by:</strong> ${report.south_boundary || '[SOUTH_BOUNDARY]'}</div>
            <div class="boundary-line"><strong>West by:</strong> ${report.west_boundary || '[WEST_BOUNDARY]'}</div>
          </div>
          <p>All boundaries were checked and identified by me on the ground and found correct.</p>
        </div>
      </div>
    `;
  }

  generateSection6LandDescription(report, includeImages) {
    return `
      <div class="section">
        <div class="section-title">6.0 DESCRIPTION OF LAND</div>

        <div class="subsection">
          <div class="subsection-title">6.1 Topography</div>
          <p>This is ${report.land_shape || '[LAND_SHAPE]'} shaped ${report.topography_type || '[TOPOGRAPHY_TYPE]'}
          block of land with ${report.land_use_type || '[LAND_USE_TYPE]'}, having a frontage of about
          ${report.frontage_measurement || '[FRONTAGE_MEASUREMENT]'} to the ${report.access_road_type || '[ACCESS_ROAD_TYPE]'}
          along the ${report.boundary_direction || '[BOUNDARY_DIRECTION]'} boundary.</p>
        </div>

        <div class="subsection">
          <div class="subsection-title">6.2 Soil & Water Table</div>
          <p>The soil is ${report.soil_type || '[SOIL_TYPE]'} and is suitable for ${report.suitable_use || '[SUITABLE_USE]'}.
          The water table is about ${report.water_table_depth || '[WATER_TABLE_DEPTH]'} feet below the ground level
          and the land is ${report.flood_status || '[FLOOD_STATUS]'}.</p>
        </div>

        <div class="subsection">
          <div class="subsection-title">6.3 Plantation</div>
          <p>The land contains ${report.plantation_description || '[PLANTATION_DESCRIPTION]'} with
          ${report.plantation_details || '[PLANTATION_DETAILS]'}.</p>
        </div>

        ${includeImages ? `
          <div class="subsection">
            <div class="subsection-title">6.4 Property Images</div>
            <div class="image-grid">
              ${report.images?.filter(img => img.category === 'land_views').slice(0, 4).map(img => `
                <div>
                  <img src="${img.file_path}" alt="${img.caption}" class="property-image" />
                  <div class="image-caption">${img.caption || 'Land View'}</div>
                </div>
              `).join('') || '<div style="text-align: center; padding: 40px; border: 1px dashed #ccc; grid-column: 1 / -1;">Property images to be inserted</div>'}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  generateSection7BuildingDescription(report, includeImages) {
    if (!report.building_type && !report.total_floor_area) {
      return ''; // Skip if no building information
    }

    return `
      <div class="section">
        <div class="section-title">7.0 DESCRIPTION OF BUILDINGS</div>

        <div class="subsection">
          <div class="subsection-title">7.1 Construction Details</div>
          ${report.ai_enhanced_building_description ? `
            <p>${report.ai_enhanced_building_description}</p>
            <p class="ai-note"><em>Building description enhanced with AI analysis</em></p>
          ` : `
            <p>${(report.building_type || '[BUILDING_TYPE]').replace('_', ' ')} type building in ${report.condition_grade || '[CONDITION_GRADE]'}
            condition, about ${report.building_age || '[BUILDING_AGE]'} years old.</p>

            <p><strong>Roof:</strong> ${report.roof_description || '[ROOF_DESCRIPTION]'}<br>
            <strong>Walls:</strong> ${report.wall_description || '[WALL_DESCRIPTION]'}<br>
            <strong>Floor:</strong> ${report.floor_description || '[FLOOR_DESCRIPTION]'}<br>
            <strong>Doors & Windows:</strong> ${report.doors_windows || '[DOORS_WINDOWS_DESCRIPTION]'}</p>
          `}
        </div>

        <div class="subsection">
          <div class="subsection-title">7.2 Accommodation</div>
          <p>${report.room_layout_description || '[ROOM_LAYOUT_DESCRIPTION]'}</p>
          <p><strong>Total Floor Area:</strong> ${report.total_floor_area || '[TOTAL_FLOOR_AREA]'} square feet</p>
          ${report.bedrooms ? `<p><strong>Bedrooms:</strong> ${report.bedrooms}</p>` : ''}
        </div>

        <div class="subsection">
          <div class="subsection-title">7.3 Conveniences</div>
          <p>${(report.building_conveniences || report.conveniences_list || ['[CONVENIENCES_LIST]']).join(', ')}</p>
        </div>

        ${includeImages ? `
          <div class="subsection">
            <div class="subsection-title">7.4 Building Images</div>
            <div class="image-grid">
              ${report.images?.filter(img => img.category === 'building_exterior' || img.category === 'building_interior').slice(0, 4).map(img => `
                <div>
                  <img src="${img.url || img.file_path}" alt="${img.caption}" class="property-image" />
                  <div class="image-caption">${img.caption || 'Building View'}</div>
                </div>
              `).join('') || '<div style="text-align: center; padding: 40px; border: 1px dashed #ccc; grid-column: 1 / -1;">Building images to be inserted</div>'}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  generateSection8LocalityDescription(report) {
    return `
      <div class="section">
        <div class="section-title">8.0 LOCALITY DESCRIPTION</div>
        <div class="section-content">
          ${report.ai_enhanced_locality_analysis ? `
            <p>${report.ai_enhanced_locality_analysis}</p>
            <p class="ai-note"><em>Locality analysis enhanced with AI analysis</em></p>
          ` : `
            <p>This is a ${report.locality_type || '[LOCALITY_TYPE]'} locality about
            ${report.distance_to_town || '[DISTANCE_TO_TOWN]'} away from ${report.nearest_town || '[NEAREST_TOWN]'}.
            The area is ${report.development_level || '[DEVELOPMENT_LEVEL]'} with
            ${report.infrastructure_description || '[INFRASTRUCTURE_DESCRIPTION]'}.</p>

            <p><strong>Nearby facilities include:</strong></p>
            <ul>
              ${(report.nearby_facilities_list || ['[NEARBY_FACILITIES_LIST]']).map(facility =>
                `<li>${facility}</li>`
              ).join('')}
            </ul>
          `}

          ${report.ai_enhanced_market_analysis ? `
            <div class="subsection">
              <div class="subsection-title">8.1 Market Analysis</div>
              <p>${report.ai_enhanced_market_analysis}</p>
              <p class="ai-note"><em>Market analysis enhanced with AI analysis</em></p>
            </div>
          ` : `
            <p>${report.market_demand_analysis || '[MARKET_DEMAND_ANALYSIS]'}</p>
          `}
        </div>
      </div>
    `;
  }

  generateSection9PlanningRegulations(report) {
    return `
      <div class="section">
        <div class="section-title">9.0 PLANNING REGULATIONS</div>

        <div class="subsection">
          <div class="subsection-title">9.1 Street Line & Building Limits</div>
          <p>The subject property is located within the ${report.local_authority || '[LOCAL_AUTHORITY]'} area and
          ${report.street_line_status || '[STREET_LINE_STATUS]'}.</p>
        </div>

        <div class="subsection">
          <div class="subsection-title">9.2 Other Regulatory Matters</div>
          <p>${report.regulatory_compliance_status || '[REGULATORY_COMPLIANCE_STATUS]'}</p>
        </div>
      </div>
    `;
  }

  generateSection10EvidenceOfValue(report) {
    return `
      <div class="section">
        <div class="section-title">10.0 EVIDENCE OF VALUE</div>

        <div class="subsection">
          <div class="subsection-title">10.1 Land Value Evidence</div>
          <p>${report.market_evidence_analysis || '[MARKET_EVIDENCE_ANALYSIS]'}</p>

          <p>Recent transactions in the locality indicate land values ranging from
          Rs. ${this.formatCurrency(report.min_rate) || '[MIN_RATE]'}/= to Rs. ${this.formatCurrency(report.max_rate) || '[MAX_RATE]'}/= per perch,
          depending on ${report.rate_factors || '[RATE_FACTORS]'}.</p>
        </div>
      </div>
    `;
  }

  generateSection11ApproachToValuation(report) {
    return `
      <div class="section">
        <div class="section-title">11.0 APPROACH TO VALUATION</div>

        <div class="subsection">
          <div class="subsection-title">11.1 Valuation Methodology</div>
          <p>${report.methodology_explanation || 'The valuation has been carried out using the Contractor\'s Method (Cost Approach), which determines value by calculating the current replacement cost of improvements, less depreciation, plus land value.'}</p>
        </div>

        <div class="subsection">
          <div class="subsection-title">11.2 Approach Selection</div>
          <p>${report.approach_justification || '[APPROACH_JUSTIFICATION]'}</p>

          <p>Taking into consideration the above facts and having regard to ${report.valuation_factors || '[VALUATION_FACTORS]'},
          I adopt a rate of Rs. ${this.formatCurrency(report.adopted_rate) || '[ADOPTED_RATE]'}/= per perch for the land.</p>
        </div>
      </div>
    `;
  }

  generateSection12Valuation(report) {
    return `
      <div class="section">
        <div class="section-title">12.0 VALUATION</div>

        <div class="subsection">
          <div class="subsection-title">12.1 Contractor's Method</div>
          <table class="valuation-table">
            <tr>
              <td><strong>LAND:</strong> Extent: ${report.land_extent || '[LAND_EXTENT]'} @ Rs. ${this.formatCurrency(report.land_rate) || '[LAND_RATE]'}/= per perch</td>
              <td class="number-cell"><strong>Rs. ${this.formatCurrency(report.land_value) || '[LAND_VALUE]'}/=</strong></td>
            </tr>
            ${report.building_value ? `
            <tr>
              <td><strong>BUILDING VALUE:</strong><br>
              ${report.building_type || '[BUILDING_DESCRIPTION]'} building<br>
              F.A. ${report.floor_area || '[FLOOR_AREA]'} sq. ft @ Rs. ${this.formatCurrency(report.building_rate) || '[BUILDING_RATE]'}/= per sq. ft.<br>
              Less ${report.depreciation_rate || '[DEPRECIATION_RATE]'}% for Depreciation</td>
              <td class="number-cell"><strong>Rs. ${this.formatCurrency(report.building_value) || '[BUILDING_VALUE]'}/=</strong></td>
            </tr>
            ` : ''}
            ${report.additional_components ? `
            <tr>
              <td>${report.additional_components}</td>
              <td class="number-cell"><strong>[ADDITIONAL_VALUE]</strong></td>
            </tr>
            ` : ''}
            <tr class="valuation-total">
              <td><strong>Total Market Value</strong></td>
              <td class="number-cell"><strong>Rs. ${this.formatCurrency(report.total_market_value || report.market_value) || '[TOTAL_MARKET_VALUE]'}/=</strong></td>
            </tr>
          </table>
        </div>

        <div class="subsection">
          <div class="subsection-title">12.2 Valuation Summary</div>
          <table class="valuation-table">
            <tr>
              <td>Market Value of the property</td>
              <td class="number-cell"><strong>Rs. ${this.formatCurrency(report.market_value) || '[MARKET_VALUE]'}/=</strong></td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: center; font-style: italic;">
                (${report.market_value_words || '[MARKET_VALUE_WORDS]'})
              </td>
            </tr>
            <tr>
              <td>Forced Sale Value of the property</td>
              <td class="number-cell"><strong>Rs. ${this.formatCurrency(report.forced_sale_value) || '[FORCED_SALE_VALUE]'}/=</strong></td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: center; font-style: italic;">
                (${report.forced_sale_value_words || '[FORCED_SALE_VALUE_WORDS]'})
              </td>
            </tr>
            ${report.insurance_value ? `
            <tr>
              <td>Insurance Value of building</td>
              <td class="number-cell"><strong>Rs. ${this.formatCurrency(report.insurance_value)}/=</strong></td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: center; font-style: italic;">
                (${report.insurance_value_words || '[INSURANCE_VALUE_WORDS]'})
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
      </div>
    `;
  }

  generateSection13Certification(report, userProfile) {
    return `
      <div class="section">
        <div class="section-title">13.0 CERTIFICATION AND DISCLAIMER</div>
        <div class="section-content">
          <p>I do hereby certify that the property depicted as Lot ${report.lot_number || '[LOT_NUMBER]'}
          in Plan No. ${report.plan_number || '[PLAN_NUMBER]'}, surveyed and partitioned on
          ${this.formatDate(report.survey_date) || '[SURVEY_DATE]'}, made by ${report.licensed_surveyor || '[LICENSED_SURVEYOR]'},
          Licensed Surveyor is valued at <strong>Rs. ${this.formatCurrency(report.final_value || report.market_value) || '[FINAL_VALUE]'}/=</strong>
          as at ${this.formatDate(report.valuation_date || report.report_date) || '[VALUATION_DATE]'}.</p>

          <p>I also certify that it is provided with ${report.access_certification || '[ACCESS_CERTIFICATION]'}.</p>

          <p>${report.standard_disclaimers || 'This valuation is based on the information provided and our inspection of the property. The valuation is subject to the assumptions and limiting conditions contained herein and is valid only for the stated purpose and date.'}</p>

          <div class="signature-section">
            <div class="signature-line"></div>
            <div style="margin-top: 10px;">
              <strong>${userProfile?.full_name || '[VALUER_NAME]'}</strong><br>
              ${userProfile?.professional_title || '[PROFESSIONAL_TITLE]'}<br>
              IVSL Reg. No: ${userProfile?.ivsl_registration || '[IVSL_REGISTRATION]'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ===============================================
  // PDF Generation Methods
  // ===============================================

  async generatePDF(report, userProfile, options = {}) {
    try {
      await this.initializeBrowser();
      const page = await this.browser.newPage();

      // Set page format to A4
      await page.setViewport({ width: 794, height: 1123 }); // A4 dimensions in pixels at 96 DPI

      const html = this.generateReportHTML(report, userProfile, options);

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '25mm',
          bottom: '25mm',
          left: '30mm',
          right: '20mm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>', // Empty header
        footerTemplate: `
          <div style="width: 100%; text-align: center; font-size: 10pt; font-family: 'Times New Roman', serif;">
            <span class="pageNumber"></span>
          </div>
        `,
        preferCSSPageSize: true
      });

      await page.close();

      logger.info(`PDF generated for report ${report.id}: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      logger.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  // ===============================================
  // Utility Methods
  // ===============================================

  formatDate(dateString) {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return as-is if invalid

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatCurrency(amount) {
    if (!amount || isNaN(amount)) return null;

    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Clean up resources
  async cleanup() {
    await this.closeBrowser();
  }
}

// Create singleton instance
const pdfService = new PDFService();

// Cleanup on process termination
process.on('SIGTERM', async () => {
  await pdfService.cleanup();
});

process.on('SIGINT', async () => {
  await pdfService.cleanup();
});

module.exports = pdfService;