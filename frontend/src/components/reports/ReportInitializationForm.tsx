import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../contexts/AuthContext';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface LocationAnalysis {
  location_intelligence: {
    section31_location: {
      village_name: string;
      district: string;
      province: string;
      formatted_address: string;
    };
  };
}

interface ReportFormData {
  report_type: string;
  valuation_purpose: string;
  client_information: {
    instruction_source: string;
    client_designation: string;
    client_organization: string;
    client_address: string;
    instruction_method: string;
    instruction_date: string;
  };
  inspection_details: {
    inspection_date: string;
    persons_present: string;
  };
  ai_enhancement: {
    enable_route_enhancement: boolean;
    enable_locality_analysis: boolean;
    enable_market_analysis: boolean;
    estimated_cost: number;
  };
}

interface ReportInitializationFormProps {
  locationAnalysis: LocationAnalysis;
  coordinates: LocationData | null;
  userProfile: UserProfile | null;
  onSubmit: (data: ReportFormData) => void;
  onBack: () => void;
}

const ReportInitializationForm: React.FC<ReportInitializationFormProps> = ({
  locationAnalysis,
  coordinates,
  userProfile,
  onSubmit,
  onBack
}) => {
  const [formData, setFormData] = useState<ReportFormData>({
    report_type: 'fair_value',
    valuation_purpose: 'Property valuation for client assessment',
    client_information: {
      instruction_source: '',
      client_designation: '',
      client_organization: '',
      client_address: '',
      instruction_method: 'Letter',
      instruction_date: new Date().toISOString().split('T')[0]
    },
    inspection_details: {
      inspection_date: new Date().toISOString().split('T')[0],
      persons_present: userProfile?.full_name || ''
    },
    ai_enhancement: {
      enable_route_enhancement: true,
      enable_locality_analysis: true,
      enable_market_analysis: true,
      estimated_cost: 0.02
    }
  });

  const [showAIPreview, setShowAIPreview] = useState(false);

  // Calculate AI costs based on selected enhancements
  useEffect(() => {
    let cost = 0;
    if (formData.ai_enhancement.enable_route_enhancement) cost += 0.003;
    if (formData.ai_enhancement.enable_locality_analysis) cost += 0.008;
    if (formData.ai_enhancement.enable_market_analysis) cost += 0.006;

    setFormData(prev => ({
      ...prev,
      ai_enhancement: {
        ...prev.ai_enhancement,
        estimated_cost: cost
      }
    }));
  }, [
    formData.ai_enhancement.enable_route_enhancement,
    formData.ai_enhancement.enable_locality_analysis,
    formData.ai_enhancement.enable_market_analysis
  ]);

  const handleInputChange = (section: keyof ReportFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' && prev[section] !== null
        ? { ...(prev[section] as Record<string, any>), [field]: value }
        : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getAutoPopulatedSummary = () => {
    const location = locationAnalysis.location_intelligence.section31_location;
    return {
      address: location.formatted_address,
      administrative: `${location.village_name}, ${location.district}, ${location.province}`,
      coordinates: coordinates ? `${coordinates.latitude}, ${coordinates.longitude}` : ''
    };
  };

  const autoPopulated = getAutoPopulatedSummary();

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Auto-Populated Data Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                80% Auto-Populated from Profile & Location Intelligence
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Property Address:</span>
                    <p className="text-xs">{autoPopulated.address}</p>
                  </div>
                  <div>
                    <span className="font-medium">Administrative:</span>
                    <p className="text-xs">{autoPopulated.administrative}</p>
                  </div>
                  {userProfile && (
                    <div>
                      <span className="font-medium">Valuer:</span>
                      <p className="text-xs">{userProfile.honorable} {userProfile.full_name}</p>
                      <p className="text-xs">{userProfile.professional_title}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Coordinates:</span>
                    <p className="text-xs">{autoPopulated.coordinates}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Report Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Report Information
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Basic details about the valuation report and its purpose.
            </p>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="report_type" className="block text-sm font-medium text-gray-700">
                  Report Type *
                </label>
                <select
                  id="report_type"
                  value={formData.report_type}
                  onChange={(e) => handleInputChange('report_type', '', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="fair_value">Fair Value Assessment</option>
                  <option value="mortgage">Mortgage Valuation</option>
                  <option value="insurance">Insurance Valuation</option>
                  <option value="investment">Investment Analysis</option>
                </select>
              </div>

              <div>
                <label htmlFor="valuation_purpose" className="block text-sm font-medium text-gray-700">
                  Valuation Purpose *
                </label>
                <input
                  type="text"
                  id="valuation_purpose"
                  value={formData.valuation_purpose}
                  onChange={(e) => handleInputChange('valuation_purpose', '', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Property valuation for mortgage approval"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Client Information
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details about the client who requested the valuation.
            </p>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="instruction_source" className="block text-sm font-medium text-gray-700">
                  Client Name & Title *
                </label>
                <input
                  type="text"
                  id="instruction_source"
                  value={formData.client_information.instruction_source}
                  onChange={(e) => handleInputChange('client_information', 'instruction_source', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Mr. John Silva, Manager"
                />
              </div>

              <div>
                <label htmlFor="client_organization" className="block text-sm font-medium text-gray-700">
                  Organization/Bank *
                </label>
                <input
                  type="text"
                  id="client_organization"
                  value={formData.client_information.client_organization}
                  onChange={(e) => handleInputChange('client_information', 'client_organization', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Commercial Bank of Ceylon PLC"
                />
              </div>

              <div>
                <label htmlFor="instruction_method" className="block text-sm font-medium text-gray-700">
                  Instruction Method
                </label>
                <select
                  id="instruction_method"
                  value={formData.client_information.instruction_method}
                  onChange={(e) => handleInputChange('client_information', 'instruction_method', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Letter">Letter</option>
                  <option value="Email">Email</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Meeting">Meeting</option>
                </select>
              </div>

              <div>
                <label htmlFor="instruction_date" className="block text-sm font-medium text-gray-700">
                  Instruction Date
                </label>
                <input
                  type="date"
                  id="instruction_date"
                  value={formData.client_information.instruction_date}
                  onChange={(e) => handleInputChange('client_information', 'instruction_date', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="client_address" className="block text-sm font-medium text-gray-700">
                Client Address
              </label>
              <textarea
                id="client_address"
                rows={3}
                value={formData.client_information.client_address}
                onChange={(e) => handleInputChange('client_information', 'client_address', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Complete address of the client organization"
              />
            </div>
          </div>
        </div>

        {/* Inspection Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Property Inspection
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details about the property inspection visit.
            </p>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="inspection_date" className="block text-sm font-medium text-gray-700">
                  Inspection Date *
                </label>
                <input
                  type="date"
                  id="inspection_date"
                  value={formData.inspection_details.inspection_date}
                  onChange={(e) => handleInputChange('inspection_details', 'inspection_date', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="persons_present" className="block text-sm font-medium text-gray-700">
                  Persons Present During Inspection
                </label>
                <input
                  type="text"
                  id="persons_present"
                  value={formData.inspection_details.persons_present}
                  onChange={(e) => handleInputChange('inspection_details', 'persons_present', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., John Silva (Valuer), Property Owner"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Enhancement Options */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  AI Enhancement Options
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Optional AI-powered content generation to enhance your report quality.
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Estimated Cost: ${formData.ai_enhancement.estimated_cost.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500">
                  Well within your $0.02 budget
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="enable_route_enhancement"
                    type="checkbox"
                    checked={formData.ai_enhancement.enable_route_enhancement}
                    onChange={(e) => handleInputChange('ai_enhancement', 'enable_route_enhancement', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="enable_route_enhancement" className="font-medium text-gray-700">
                    Route Description Enhancement ($0.003)
                  </label>
                  <p className="text-gray-500">
                    Convert basic GPS directions into professional route descriptions for Section 4.1
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="enable_locality_analysis"
                    type="checkbox"
                    checked={formData.ai_enhancement.enable_locality_analysis}
                    onChange={(e) => handleInputChange('ai_enhancement', 'enable_locality_analysis', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="enable_locality_analysis" className="font-medium text-gray-700">
                    Locality Analysis Enhancement ($0.008)
                  </label>
                  <p className="text-gray-500">
                    Generate professional locality descriptions and infrastructure analysis for Section 8.0
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="enable_market_analysis"
                    type="checkbox"
                    checked={formData.ai_enhancement.enable_market_analysis}
                    onChange={(e) => handleInputChange('ai_enhancement', 'enable_market_analysis', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="enable_market_analysis" className="font-medium text-gray-700">
                    Market Demand Analysis ($0.006)
                  </label>
                  <p className="text-gray-500">
                    Analyze market demand and investment potential based on location data for Section 8.0
                  </p>
                </div>
              </div>
            </div>

            {(formData.ai_enhancement.enable_route_enhancement ||
              formData.ai_enhancement.enable_locality_analysis ||
              formData.ai_enhancement.enable_market_analysis) && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      AI Enhancement Preview
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Selected AI features will process your location data to generate professional-quality content.
                        You can review and edit all AI-generated content before finalizing your report.
                      </p>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowAIPreview(!showAIPreview)}
                        className="text-sm font-medium text-blue-800 hover:text-blue-600"
                      >
                        {showAIPreview ? 'Hide' : 'Show'} Sample AI Output
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showAIPreview && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Sample AI-Enhanced Content:</h4>
                <div className="space-y-3 text-xs">
                  {formData.ai_enhancement.enable_route_enhancement && (
                    <div>
                      <span className="font-medium text-gray-700">Route Description:</span>
                      <p className="text-gray-600 italic">
                        "From Colombo Fort Railway Station, proceed along Galle Road (A2) for approximately
                        15.2km towards Mount Lavinia. Turn left at the Dehiwala Junction and proceed along
                        Belmont Road for about 800m. The subject property is located on the right side
                        of the road, clearly marked and accessible via a concrete driveway."
                      </p>
                    </div>
                  )}
                  {formData.ai_enhancement.enable_locality_analysis && (
                    <div>
                      <span className="font-medium text-gray-700">Locality Analysis:</span>
                      <p className="text-gray-600 italic">
                        "This is a well-developed residential locality with excellent infrastructure.
                        The area benefits from proximity to educational institutions, healthcare facilities,
                        and commercial establishments, making it highly desirable for residential purposes."
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Location
          </button>

          <button
            type="submit"
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Report
            <svg className="ml-2 -mr-1 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportInitializationForm;