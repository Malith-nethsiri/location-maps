const pdfService = require('../../services/pdfService');
const { testData } = require('../setup');

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setViewport: jest.fn(),
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}));

describe('PDF Service', () => {
  const mockReport = {
    id: 1,
    ...testData.validReport,
    ...testData.validCoordinates,
    report_reference: 'VR/2024/001',
    report_date: new Date('2024-01-15'),
    images: [
      {
        id: 1,
        category: 'land_views',
        filename: 'land_view_1.jpg',
        url: '/uploads/reports/land_views/land_view_1.jpg',
        caption: 'General land view'
      },
      {
        id: 2,
        category: 'building_exterior',
        filename: 'building_1.jpg',
        url: '/uploads/reports/building_exterior/building_1.jpg',
        caption: 'Building front view'
      }
    ]
  };

  const mockUserProfile = {
    ...testData.validUser,
    honorable: 'Mr.',
    phone_number: '0112345678'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HTML Generation', () => {
    it('should generate complete HTML report', () => {
      const html = pdfService.generateReportHTML(mockReport, mockUserProfile);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('VALUATION REPORT');
      expect(html).toContain(mockReport.report_reference);
      expect(html).toContain(mockUserProfile.full_name);
    });

    it('should include draft watermark for draft reports', () => {
      const html = pdfService.generateReportHTML(mockReport, mockUserProfile, { isDraft: true });

      expect(html).toContain('DRAFT');
      expect(html).toContain('draft-watermark');
    });

    it('should exclude draft watermark for final reports', () => {
      const html = pdfService.generateReportHTML(mockReport, mockUserProfile, { isDraft: false });

      expect(html).not.toContain('DRAFT');
      expect(html).toContain('display: none');
    });

    it('should include images when specified', () => {
      const html = pdfService.generateReportHTML(mockReport, mockUserProfile, { includeImages: true });

      expect(html).toContain('land_view_1.jpg');
      expect(html).toContain('building_1.jpg');
      expect(html).toContain('General land view');
    });

    it('should exclude images when specified', () => {
      const html = pdfService.generateReportHTML(mockReport, mockUserProfile, { includeImages: false });

      expect(html).not.toContain('land_view_1.jpg');
      expect(html).not.toContain('building_1.jpg');
    });
  });

  describe('Section Generation', () => {
    describe('Document Header', () => {
      it('should generate proper document header', () => {
        const header = pdfService.generateDocumentHeader(mockUserProfile, mockReport);

        expect(header).toContain(mockUserProfile.full_name);
        expect(header).toContain(mockUserProfile.professional_title);
        expect(header).toContain(mockUserProfile.house_number);
        expect(header).toContain(mockUserProfile.email_address);
        expect(header).toContain(mockReport.report_reference);
      });
    });

    describe('Section 1 - Preamble', () => {
      it('should generate preamble section', () => {
        const section = pdfService.generateSection1Preamble(mockReport);

        expect(section).toContain('1.0 PREAMBLE');
        expect(section).toContain(mockReport.instruction_source);
        expect(section).toContain(mockReport.valuation_purpose);
      });
    });

    describe('Section 2 - Scope of Work', () => {
      it('should generate scope of work section', () => {
        const section = pdfService.generateSection2ScopeOfWork(mockReport, mockUserProfile);

        expect(section).toContain('2.0 SCOPE OF WORK');
        expect(section).toContain('SLFRS 13');
        expect(section).toContain('RICS Valuation');
        expect(section).toContain('Fair Value');
        expect(section).toContain('Market Value');
      });
    });

    describe('Section 3 - Property Identification', () => {
      it('should generate property identification section', () => {
        const section = pdfService.generateSection3PropertyIdentification(mockReport);

        expect(section).toContain('3.0 PROPERTY IDENTIFICATION');
        expect(section).toContain('3.1 Location');
        expect(section).toContain('3.2 Legal Description');
        expect(section).toContain('3.3 Ownership');
        expect(section).toContain('3.4 Land Details');
        expect(section).toContain(mockReport.village_name);
        expect(section).toContain(mockReport.district);
        expect(section).toContain(mockReport.province);
        expect(section).toContain(mockReport.lot_number);
        expect(section).toContain(mockReport.plan_number);
      });

      it('should include GPS coordinates when available', () => {
        const section = pdfService.generateSection3PropertyIdentification(mockReport);

        expect(section).toContain('GPS Coordinates');
        expect(section).toContain(mockReport.latitude.toFixed(6));
        expect(section).toContain(mockReport.longitude.toFixed(6));
      });
    });

    describe('Section 4 - Access and Accessibility', () => {
      it('should generate access section', () => {
        const section = pdfService.generateSection4AccessAndAccessibility(mockReport, true);

        expect(section).toContain('4.0 ACCESS AND ACCESSIBILITY');
        expect(section).toContain('4.1 Route Description');
      });

      it('should include AI-enhanced route description when available', () => {
        const reportWithAI = {
          ...mockReport,
          ai_enhanced_route_description: 'AI-enhanced route description'
        };

        const section = pdfService.generateSection4AccessAndAccessibility(reportWithAI, false);

        expect(section).toContain('AI-enhanced route description');
        expect(section).toContain('Route description enhanced with AI analysis');
      });
    });

    describe('Section 5 - Boundaries', () => {
      it('should generate boundaries section', () => {
        const section = pdfService.generateSection5Boundaries(mockReport);

        expect(section).toContain('5.0 BOUNDARIES');
        expect(section).toContain('North by:');
        expect(section).toContain('East by:');
        expect(section).toContain('South by:');
        expect(section).toContain('West by:');
        expect(section).toContain(mockReport.north_boundary);
        expect(section).toContain(mockReport.south_boundary);
        expect(section).toContain(mockReport.east_boundary);
        expect(section).toContain(mockReport.west_boundary);
      });
    });

    describe('Section 6 - Land Description', () => {
      it('should generate land description section', () => {
        const section = pdfService.generateSection6LandDescription(mockReport, false);

        expect(section).toContain('6.0 DESCRIPTION OF LAND');
        expect(section).toContain('6.1 Topography');
        expect(section).toContain('6.2 Soil & Water Table');
        expect(section).toContain('6.3 Plantation');
        expect(section).toContain(mockReport.land_shape);
        expect(section).toContain(mockReport.topography_type);
        expect(section).toContain(mockReport.soil_type);
      });
    });

    describe('Section 7 - Building Description', () => {
      it('should generate building description section', () => {
        const section = pdfService.generateSection7BuildingDescription(mockReport, false);

        expect(section).toContain('7.0 DESCRIPTION OF BUILDINGS');
        expect(section).toContain('7.1 Construction Details');
        expect(section).toContain('7.2 Accommodation');
        expect(section).toContain('7.3 Conveniences');
        expect(section).toContain(mockReport.building_type);
        expect(section).toContain(mockReport.building_age.toString());
        expect(section).toContain(mockReport.condition_grade);
      });

      it('should skip building section when no building data', () => {
        const reportWithoutBuilding = { ...mockReport };
        delete reportWithoutBuilding.building_type;
        delete reportWithoutBuilding.total_floor_area;

        const section = pdfService.generateSection7BuildingDescription(reportWithoutBuilding, false);

        expect(section).toBe('');
      });

      it('should include AI-enhanced building description when available', () => {
        const reportWithAI = {
          ...mockReport,
          ai_enhanced_building_description: 'AI-enhanced building description'
        };

        const section = pdfService.generateSection7BuildingDescription(reportWithAI, false);

        expect(section).toContain('AI-enhanced building description');
        expect(section).toContain('Building description enhanced with AI analysis');
      });
    });

    describe('Section 8 - Locality Description', () => {
      it('should generate locality description section', () => {
        const section = pdfService.generateSection8LocalityDescription(mockReport);

        expect(section).toContain('8.0 LOCALITY DESCRIPTION');
      });

      it('should include AI-enhanced locality analysis when available', () => {
        const reportWithAI = {
          ...mockReport,
          ai_enhanced_locality_analysis: 'AI-enhanced locality analysis',
          ai_enhanced_market_analysis: 'AI-enhanced market analysis'
        };

        const section = pdfService.generateSection8LocalityDescription(reportWithAI);

        expect(section).toContain('AI-enhanced locality analysis');
        expect(section).toContain('AI-enhanced market analysis');
        expect(section).toContain('8.1 Market Analysis');
      });
    });

    describe('Section 12 - Valuation', () => {
      it('should generate valuation section', () => {
        const section = pdfService.generateSection12Valuation(mockReport);

        expect(section).toContain('12.0 VALUATION');
        expect(section).toContain('12.1 Contractor\'s Method');
        expect(section).toContain('12.2 Valuation Summary');
        expect(section).toContain(mockReport.land_rate);
        expect(section).toContain(mockReport.market_value);
      });
    });

    describe('Section 13 - Certification', () => {
      it('should generate certification section', () => {
        const section = pdfService.generateSection13Certification(mockReport, mockUserProfile);

        expect(section).toContain('13.0 CERTIFICATION AND DISCLAIMER');
        expect(section).toContain(mockUserProfile.full_name);
        expect(section).toContain(mockUserProfile.professional_title);
        expect(section).toContain(mockReport.lot_number);
        expect(section).toContain(mockReport.plan_number);
      });
    });
  });

  describe('CSS Generation', () => {
    it('should generate appropriate CSS for draft reports', () => {
      const css = pdfService.getReportCSS(true);

      expect(css).toContain('@page');
      expect(css).toContain('Times New Roman');
      expect(css).toContain('.draft-watermark');
      expect(css).toContain('display: block');
    });

    it('should generate appropriate CSS for final reports', () => {
      const css = pdfService.getReportCSS(false);

      expect(css).toContain('display: none');
    });

    it('should include professional styling', () => {
      const css = pdfService.getReportCSS(false);

      expect(css).toContain('.section');
      expect(css).toContain('.boundaries-box');
      expect(css).toContain('.valuation-table');
      expect(css).toContain('.signature-section');
      expect(css).toContain('.ai-note');
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF buffer', async () => {
      const pdfBuffer = await pdfService.generatePDF(mockReport, mockUserProfile);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.toString()).toContain('mock-pdf-content');
    });

    it('should handle PDF generation with options', async () => {
      const options = { isDraft: false, includeImages: true };
      const pdfBuffer = await pdfService.generatePDF(mockReport, mockUserProfile, options);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle PDF generation errors', async () => {
      // Mock puppeteer to throw an error
      const puppeteer = require('puppeteer');
      puppeteer.launch.mockRejectedValueOnce(new Error('Browser launch failed'));

      await expect(
        pdfService.generatePDF(mockReport, mockUserProfile)
      ).rejects.toThrow('Failed to generate PDF');
    });
  });

  describe('Utility Methods', () => {
    describe('Date Formatting', () => {
      it('should format valid dates correctly', () => {
        const date = '2024-01-15';
        const formatted = pdfService.formatDate(date);

        expect(formatted).toBe('15/01/2024');
      });

      it('should handle invalid dates', () => {
        const invalid = 'invalid-date';
        const formatted = pdfService.formatDate(invalid);

        expect(formatted).toBe(invalid);
      });

      it('should handle null dates', () => {
        const formatted = pdfService.formatDate(null);

        expect(formatted).toBe(null);
      });
    });

    describe('Currency Formatting', () => {
      it('should format currency correctly', () => {
        const amount = 1500000;
        const formatted = pdfService.formatCurrency(amount);

        expect(formatted).toBe('1,500,000');
      });

      it('should handle invalid amounts', () => {
        const formatted = pdfService.formatCurrency('invalid');

        expect(formatted).toBe(null);
      });

      it('should handle null amounts', () => {
        const formatted = pdfService.formatCurrency(null);

        expect(formatted).toBe(null);
      });
    });
  });

  describe('Browser Management', () => {
    it('should initialize browser', async () => {
      await pdfService.initializeBrowser();

      const puppeteer = require('puppeteer');
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should handle browser cleanup', async () => {
      await pdfService.cleanup();

      // Should not throw any errors
    });
  });
});