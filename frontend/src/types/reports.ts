// Types for Valuation Reports System
// Based on report-structure.md and database schema

export interface UserProfile {
  id: number;
  user_id: string;

  // Personal Information (Document Header)
  honorable?: string; // Mr./Ms./Dr./Prof.
  full_name: string;
  professional_title?: string; // Chartered Valuation Surveyor
  qualifications_list?: string[]; // Array of qualifications
  professional_status?: string; // MRICS, FRICS, etc.

  // Contact Information
  house_number?: string;
  street_name?: string;
  area_name?: string;
  city?: string;
  district?: string;
  phone_number?: string;
  mobile_number?: string;
  email_address?: string;

  // Professional Details
  ivsl_registration?: string; // IVSL Reg. No
  default_valuer_reference?: string; // My Ref format

  // Preferences and Defaults
  preferences?: {
    default_rics_year?: number;
    default_report_type?: string;
    currency_format?: string;
    default_rates?: Record<string, number>;
    standard_disclaimers?: string;
  };

  created_at?: string;
  updated_at?: string;
}

export interface ValuationReport {
  id: number;
  user_id: string;

  // Report Metadata
  report_reference?: string;
  report_date?: string;
  valuation_date?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'finalized';
  report_type?: string; // mortgage, fair_value, insurance, etc.

  // Client Information (Section 1.0 PREAMBLE)
  instruction_source?: string;
  client_designation?: string;
  client_organization?: string;
  client_address?: string;
  instruction_method?: string; // letter, email, phone
  instruction_date?: string;
  valuation_purpose?: string;
  inspection_date?: string;
  persons_present?: string;

  // Property Identification (Section 3.0)
  // Location Details
  village_name?: string;
  pradeshiya_sabha?: string;
  korale?: string;
  hathpattu?: string;
  district?: string;
  province?: string;
  latitude?: number;
  longitude?: number;

  // Legal Description
  lot_number?: string;
  plan_number?: string;
  survey_date?: string;
  licensed_surveyor?: string;
  approving_authority?: string;
  approval_date?: string;

  // Ownership
  deed_number?: string;
  deed_date?: string;
  notary_public?: string;
  current_owner?: string;

  // Land Details
  land_name?: string;
  acres?: number;
  roods?: number;
  perches?: number;
  hectares?: number;

  // Access and Route (Section 4.0) - AI Enhanced
  route_description?: string;
  access_certification?: string;

  // Boundaries (Section 5.0)
  north_boundary?: string;
  east_boundary?: string;
  south_boundary?: string;
  west_boundary?: string;

  // Land Description (Section 6.0) - AI Enhanced
  land_shape?: string; // rectangular, irregular, etc.
  topography_type?: string; // level, sloping, etc.
  land_use_type?: string; // residential, commercial, agricultural
  frontage_measurement?: string;
  access_road_type?: string; // motorable road, gravel road
  boundary_direction?: string; // north, south, east, west

  // Soil & Environment
  soil_type?: string;
  suitable_use?: string;
  water_table_depth?: string;
  flood_status?: string;

  // Land Features
  land_features?: string;

  // Plantation
  plantation_description?: string;
  plantation_details?: string;

  // Building Description (Section 7.0) - AI Enhanced
  building_type?: string;
  condition_grade?: string; // excellent, good, fair, poor
  building_age?: number;
  roof_description?: string;
  wall_description?: string;
  floor_description?: string;
  doors_windows_description?: string;
  doors_windows?: string;
  room_layout_description?: string;
  total_floor_area?: number; // square feet
  bedrooms?: string;
  conveniences_list?: string[];
  building_conveniences?: string[];

  // Locality Description (Section 8.0) - AI Enhanced
  locality_type?: string;
  distance_to_town?: string;
  nearest_town?: string;
  development_level?: string;
  infrastructure_description?: string;
  nearby_facilities_list?: string[];
  market_demand_analysis?: string;

  // Planning Regulations (Section 9.0)
  local_authority?: string;
  street_line_status?: string;
  regulatory_compliance_status?: string;

  // Evidence of Value (Section 10.0) - AI Enhanced
  market_evidence_analysis?: string;
  min_rate?: number;
  max_rate?: number;
  rate_factors?: string;

  // Valuation (Section 11.0 & 12.0)
  methodology_explanation?: string;
  approach_justification?: string;
  valuation_factors?: string;
  adopted_rate?: number;

  // Contractor's Method Calculations
  land_extent?: string;
  total_extent?: string;
  land_rate?: number;
  land_value?: number;
  floor_area?: number;
  building_rate?: number;
  depreciation_rate?: number;
  building_value?: number;
  additional_components?: string;
  total_market_value?: number;

  // Final Values
  market_value?: number;
  market_value_words?: string;
  forced_sale_value?: number;
  forced_sale_value_words?: string;
  insurance_value?: number;
  insurance_value_words?: string;
  final_value?: number;

  // Certification (Section 13.0)
  standard_disclaimers?: string;

  // System Fields
  created_at?: string;
  updated_at?: string;
  completed_at?: string;

  // Additional computed fields
  images?: ReportImage[];
  location_summary?: string;
  valuer_name?: string;
  professional_title?: string;
}

export interface ReportImage {
  id: number;
  report_id: number;
  category: string; // land_views, building_exterior, boundaries, etc.
  filename: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  caption?: string;
  display_order: number;
  created_at?: string;
}

export interface ReportTemplate {
  id: number;
  template_name: string;
  template_category: string;
  template_content: string;
  is_default: boolean;
  user_id?: string;
}

export interface GeneratedContent {
  id: number;
  content_type: string;
  input_hash: string;
  input_data: any;
  generated_text: string;
  reuse_count: number;
  ai_model: string;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
  last_used_at: string;
}

export interface SriLankanLocation {
  name: string;
  type?: string;
  parent?: string;
  district?: string;
  province?: string;
}

// Form-related types
export interface ReportFormSection {
  id: string;
  title: string;
  description: string;
  fields: ReportFormField[];
  isComplete: boolean;
  isOptional?: boolean;
}

export interface ReportFormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'coordinates';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  aiEnhanced?: boolean;
  section?: string;
  helpText?: string;
}

// AI Content Generation
export interface AIContentRequest {
  content_type: 'route_description' | 'property_description' | 'market_analysis' | 'building_description' | 'quality_validation';
  input_data: any;
  use_cache?: boolean;
}

export interface AIContentResponse {
  generated_text: string;
  cached: boolean;
  tokens_used?: number;
  cost_usd?: number;
  model_used?: string;
  cost_saved?: number;
}

// Report validation
export interface ReportValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    section: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    section: string;
  }>;
  completeness_score: number;
}

// Analytics
export interface CostAnalytics {
  summary: {
    total_reports: number;
    total_cost: number;
    total_generations: number;
    savings?: number;
    savings_percentage?: number;
  };
  by_content_type: Array<{
    content_type: string;
    generations: number;
    actual_cost: number;
    cost_without_cache: number;
    avg_tokens: number;
  }>;
}

// Location Analysis Integration
export interface LocationAnalysisData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: {
    formatted_address: string;
  };
  points_of_interest: Array<{
    name: string;
    category: string;
    coordinates: { latitude: number; longitude: number };
    distance: string;
    address?: string;
    rating?: number;
  }>;
  nearest_city: {
    name: string;
    distance: string;
    coordinates: { latitude: number; longitude: number };
    country: string;
  };
}

// Report Builder State
export interface ReportBuilderState {
  currentSection: number;
  sections: ReportFormSection[];
  report: ValuationReport;
  isLoading: boolean;
  isSaving: boolean;
  validationErrors: Record<string, string>;
  unsavedChanges: boolean;
}

// PDF Generation Options
export interface PDFGenerationOptions {
  isDraft: boolean;
  includeImages: boolean;
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}