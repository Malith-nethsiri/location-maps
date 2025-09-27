import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportsApi } from '../../services/reportsApi';
import { UserProfile, ValuationReport } from '../../types/reports';
import ImageUploadManager from './ImageUploadManager';

interface ReportBuilderProps {
  userProfile: UserProfile;
  onReportUpdate: (report: ValuationReport) => void;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ userProfile, onReportUpdate }) => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ValuationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Partial<ValuationReport>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const reportData = await reportsApi.getReport(parseInt(reportId!));
      setReport(reportData);
      setFormData(reportData);
    } catch (error: any) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
      navigate('/reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveSection = async (sectionName: string) => {
    if (!reportId) return;

    try {
      setIsSaving(true);
      const updatedReport = await reportsApi.updateReportSection(
        parseInt(reportId),
        sectionName,
        formData
      );
      setReport(updatedReport);
      onReportUpdate(updatedReport);
      toast.success('Section saved successfully');
    } catch (error: any) {
      console.error('Error saving section:', error);
      toast.error('Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    {
      id: 'basic_info',
      title: '1. Basic Information',
      description: 'Client details and report purpose'
    },
    {
      id: 'property_location',
      title: '2. Property Location',
      description: 'GPS coordinates and administrative details'
    },
    {
      id: 'legal_details',
      title: '3. Legal Description',
      description: 'Ownership and survey information'
    },
    {
      id: 'boundaries',
      title: '4. Property Boundaries',
      description: 'North, South, East, West boundaries'
    },
    {
      id: 'land_description',
      title: '5. Land Description',
      description: 'Topography, soil, and plantation details'
    },
    {
      id: 'building_details',
      title: '6. Building Details',
      description: 'Construction and accommodation details'
    },
    {
      id: 'property_images',
      title: '7. Property Images',
      description: 'Upload and organize property documentation photos'
    },
    {
      id: 'valuation',
      title: '8. Valuation',
      description: 'Market analysis and final valuation'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Report not found</p>
          <button
            onClick={() => navigate('/reports')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {report.report_reference || `Report #${report.id}`}
              </h1>
              <p className="text-sm text-gray-600">
                Status: <span className={`font-medium ${
                  report.status === 'completed' ? 'text-green-600' :
                  report.status === 'in_progress' ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {report.status.replace('_', ' ').toUpperCase()}
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/reports')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                ← Back to Reports
              </button>
              <button
                onClick={() => {
                  // Generate preview functionality would go here
                  toast.info('PDF preview functionality will be implemented');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Preview PDF
              </button>
              {report.status === 'completed' && (
                <button
                  onClick={() => {
                    // Finalize report functionality would go here
                    toast.info('Report finalization functionality will be implemented');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Finalize Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Section Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Sections</h3>
              <nav className="space-y-2">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(index)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      currentSection === index
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">{section.title}</div>
                    <div className="text-xs text-gray-500">{section.description}</div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(((currentSection + 1) / sections.length) * 100)}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Section Content */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {sections[currentSection].title}
                </h2>
                <p className="text-gray-600 mb-6">{sections[currentSection].description}</p>

                {/* Dynamic Section Content */}
                <div className="space-y-6">
                  {renderSectionContent(sections[currentSection].id, formData, handleInputChange, report?.id)}
                </div>
              </div>

              {/* Section Actions */}
              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                  disabled={currentSection === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>

                <div className="flex gap-4">
                  <button
                    onClick={() => saveSection(sections[currentSection].id)}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Section'}
                  </button>

                  <button
                    onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                    disabled={currentSection === sections.length - 1}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>

            {/* AI Enhancement Panel */}
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    AI Content Enhancement
                  </h3>
                  <p className="text-sm text-green-700">
                    Generate professional descriptions for route access, property features, and market analysis.
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Cost: ~$0.02 per report with intelligent caching
                  </p>
                </div>
                <button
                  onClick={() => {
                    toast.info('AI enhancement functionality will be implemented when OpenAI API is configured');
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Enhance with AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to render section-specific content
function renderSectionContent(
  sectionId: string,
  formData: Partial<ValuationReport>,
  handleInputChange: (field: string, value: any) => void,
  reportId?: number
) {
  switch (sectionId) {
    case 'basic_info':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              value={formData.instruction_source || ''}
              onChange={(e) => handleInputChange('instruction_source', e.target.value)}
              placeholder="Enter client name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Organization
            </label>
            <input
              type="text"
              value={formData.client_organization || ''}
              onChange={(e) => handleInputChange('client_organization', e.target.value)}
              placeholder="Bank, Company, or Individual"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valuation Purpose *
            </label>
            <textarea
              value={formData.valuation_purpose || ''}
              onChange={(e) => handleInputChange('valuation_purpose', e.target.value)}
              placeholder="e.g., Mortgage evaluation, Fair value assessment, Insurance purposes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );

    case 'property_location':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude || ''}
                onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                placeholder="7.8731"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude || ''}
                onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                placeholder="80.7718"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Village/Area
              </label>
              <input
                type="text"
                value={formData.village_name || ''}
                onChange={(e) => handleInputChange('village_name', e.target.value)}
                placeholder="Village name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District
              </label>
              <input
                type="text"
                value={formData.district || ''}
                onChange={(e) => handleInputChange('district', e.target.value)}
                placeholder="District name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province
              </label>
              <input
                type="text"
                value={formData.province || ''}
                onChange={(e) => handleInputChange('province', e.target.value)}
                placeholder="Province name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      );

    case 'legal_details':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lot Number *
            </label>
            <input
              type="text"
              value={formData.lot_number || ''}
              onChange={(e) => handleInputChange('lot_number', e.target.value)}
              placeholder="e.g., 15"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Number *
            </label>
            <input
              type="text"
              value={formData.plan_number || ''}
              onChange={(e) => handleInputChange('plan_number', e.target.value)}
              placeholder="e.g., 1234 dated 2023-01-15"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Licensed Surveyor
            </label>
            <input
              type="text"
              value={formData.licensed_surveyor || ''}
              onChange={(e) => handleInputChange('licensed_surveyor', e.target.value)}
              placeholder="Surveyor name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Owner *
            </label>
            <input
              type="text"
              value={formData.current_owner || ''}
              onChange={(e) => handleInputChange('current_owner', e.target.value)}
              placeholder="Property owner name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );

    case 'boundaries':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                North Boundary *
              </label>
              <input
                type="text"
                value={formData.north_boundary || ''}
                onChange={(e) => handleInputChange('north_boundary', e.target.value)}
                placeholder="e.g., Property of Mr. A.B. Silva"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                South Boundary *
              </label>
              <input
                type="text"
                value={formData.south_boundary || ''}
                onChange={(e) => handleInputChange('south_boundary', e.target.value)}
                placeholder="e.g., Property of Mrs. C.D. Fernando"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                East Boundary *
              </label>
              <input
                type="text"
                value={formData.east_boundary || ''}
                onChange={(e) => handleInputChange('east_boundary', e.target.value)}
                placeholder="e.g., Paddy land"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                West Boundary *
              </label>
              <input
                type="text"
                value={formData.west_boundary || ''}
                onChange={(e) => handleInputChange('west_boundary', e.target.value)}
                placeholder="e.g., 20 feet wide motorable road"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Extent *
              </label>
              <input
                type="text"
                value={formData.total_extent || ''}
                onChange={(e) => handleInputChange('total_extent', e.target.value)}
                placeholder="e.g., 35.5 perches"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frontage
              </label>
              <input
                type="text"
                value={formData.frontage_measurement || ''}
                onChange={(e) => handleInputChange('frontage_measurement', e.target.value)}
                placeholder="e.g., 60 feet"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Road Type
              </label>
              <select
                value={formData.access_road_type || ''}
                onChange={(e) => handleInputChange('access_road_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select road type</option>
                <option value="motorable_road">Motorable Road</option>
                <option value="gravel_road">Gravel Road</option>
                <option value="cart_track">Cart Track</option>
                <option value="footpath">Footpath</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'land_description':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Land Shape *
              </label>
              <select
                value={formData.land_shape || ''}
                onChange={(e) => handleInputChange('land_shape', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select shape</option>
                <option value="rectangular">Rectangular</option>
                <option value="square">Square</option>
                <option value="irregular">Irregular</option>
                <option value="triangular">Triangular</option>
                <option value="L_shaped">L-shaped</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topography Type *
              </label>
              <select
                value={formData.topography_type || ''}
                onChange={(e) => handleInputChange('topography_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select topography</option>
                <option value="fairly_level">Fairly Level</option>
                <option value="gently_sloping">Gently Sloping</option>
                <option value="moderately_sloping">Moderately Sloping</option>
                <option value="steeply_sloping">Steeply Sloping</option>
                <option value="undulating">Undulating</option>
                <option value="terraced">Terraced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Soil Type *
              </label>
              <select
                value={formData.soil_type || ''}
                onChange={(e) => handleInputChange('soil_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select soil type</option>
                <option value="red_earth">Red Earth</option>
                <option value="clay">Clay</option>
                <option value="sandy">Sandy</option>
                <option value="laterite">Laterite</option>
                <option value="alluvial">Alluvial</option>
                <option value="rocky">Rocky</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Land Use Type *
              </label>
              <select
                value={formData.land_use_type || ''}
                onChange={(e) => handleInputChange('land_use_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select land use</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="agricultural">Agricultural</option>
                <option value="industrial">Industrial</option>
                <option value="mixed_residential">Mixed Residential</option>
                <option value="plantation">Plantation</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plantation Description
            </label>
            <textarea
              value={formData.plantation_description || ''}
              onChange={(e) => handleInputChange('plantation_description', e.target.value)}
              placeholder="Describe any trees, crops, or vegetation on the property"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Land Features
            </label>
            <textarea
              value={formData.land_features || ''}
              onChange={(e) => handleInputChange('land_features', e.target.value)}
              placeholder="Wells, drainage, retaining walls, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );

    case 'building_details':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building Type
              </label>
              <select
                value={formData.building_type || ''}
                onChange={(e) => handleInputChange('building_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select building type</option>
                <option value="single_storied_house">Single Storied House</option>
                <option value="two_storied_house">Two Storied House</option>
                <option value="apartment">Apartment</option>
                <option value="commercial_building">Commercial Building</option>
                <option value="industrial_building">Industrial Building</option>
                <option value="warehouse">Warehouse</option>
                <option value="mixed_use">Mixed Use</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building Age (years)
              </label>
              <input
                type="number"
                value={formData.building_age || ''}
                onChange={(e) => handleInputChange('building_age', parseInt(e.target.value))}
                placeholder="15"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition Grade
              </label>
              <select
                value={formData.condition_grade || ''}
                onChange={(e) => handleInputChange('condition_grade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="very_good">Very Good</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="dilapidated">Dilapidated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Floor Area (sq ft)
              </label>
              <input
                type="number"
                value={formData.total_floor_area || ''}
                onChange={(e) => handleInputChange('total_floor_area', parseFloat(e.target.value))}
                placeholder="1500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Bedrooms
              </label>
              <input
                type="number"
                value={formData.bedrooms || ''}
                onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value))}
                placeholder="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roof Description
              </label>
              <input
                type="text"
                value={formData.roof_description || ''}
                onChange={(e) => handleInputChange('roof_description', e.target.value)}
                placeholder="AC sheets on timber rafters"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wall Description
              </label>
              <input
                type="text"
                value={formData.wall_description || ''}
                onChange={(e) => handleInputChange('wall_description', e.target.value)}
                placeholder="Cement block walls with cement plaster"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor Description
              </label>
              <input
                type="text"
                value={formData.floor_description || ''}
                onChange={(e) => handleInputChange('floor_description', e.target.value)}
                placeholder="Cement concrete floors with ceramic tiles"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doors & Windows
              </label>
              <input
                type="text"
                value={formData.doors_windows || ''}
                onChange={(e) => handleInputChange('doors_windows', e.target.value)}
                placeholder="Timber doors and windows with glass panels"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Layout Description
            </label>
            <textarea
              value={formData.room_layout_description || ''}
              onChange={(e) => handleInputChange('room_layout_description', e.target.value)}
              placeholder="Describe the layout: sitting room, dining room, kitchen, bedrooms, bathrooms, etc."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Conveniences
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                'Electricity', 'Water Supply', 'Telephone', 'Internet',
                'Sewerage', 'Solar Power', 'Generator', 'Security System'
              ].map((convenience) => (
                <label key={convenience} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.building_conveniences?.includes(convenience) || false}
                    onChange={(e) => {
                      const currentConveniences = formData.building_conveniences || [];
                      if (e.target.checked) {
                        handleInputChange('building_conveniences', [...currentConveniences, convenience]);
                      } else {
                        handleInputChange('building_conveniences', currentConveniences.filter(c => c !== convenience));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">{convenience}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );

    case 'valuation':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Land Rate (Rs. per perch) *
            </label>
            <input
              type="number"
              value={formData.land_rate || ''}
              onChange={(e) => handleInputChange('land_rate', parseFloat(e.target.value))}
              placeholder="450000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Value (Rs.) *
            </label>
            <input
              type="number"
              value={formData.market_value || ''}
              onChange={(e) => handleInputChange('market_value', parseFloat(e.target.value))}
              placeholder="15000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forced Sale Value (Rs.)
            </label>
            <input
              type="number"
              value={formData.forced_sale_value || ''}
              onChange={(e) => handleInputChange('forced_sale_value', parseFloat(e.target.value))}
              placeholder="12000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insurance Value (Rs.)
            </label>
            <input
              type="number"
              value={formData.insurance_value || ''}
              onChange={(e) => handleInputChange('insurance_value', parseFloat(e.target.value))}
              placeholder="8000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );

    case 'property_images':
      return reportId ? (
        <ImageUploadManager
          reportId={reportId}
          onImagesUpdate={(images) => {
            // Optional: Update form data with image information
            handleInputChange('images', images);
          }}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Report must be saved before uploading images</p>
        </div>
      );

    default:
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Section Under Development</h3>
          <p className="text-gray-600">
            This section's form fields will be implemented based on the report-structure.md specifications.
          </p>
        </div>
      );
  }
}

export default ReportBuilder;