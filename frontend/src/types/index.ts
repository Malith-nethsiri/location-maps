// Location and Coordinate Types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationAddress {
  formatted_address: string;
  address_components: {
    street_number?: string;
    route?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  place_id?: string;
  types?: string[];
}

// POI Types
export type POICategory =
  | 'school'
  | 'hospital'
  | 'government'
  | 'religious'
  | 'store'
  | 'restaurant'
  | 'gas_station'
  | 'bank'
  | 'pharmacy'
  | 'police';

export interface POI {
  place_id: string;
  name: string;
  category: POICategory;
  subcategory?: string;
  coordinates: Coordinates;
  address?: string;
  phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  opening_hours?: any;
  types?: string[];
  price_level?: number;
  distance_meters: number;
  photos?: any[];
}

// Navigation Types
export type TravelMode = 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';

export interface NavigationStep {
  step_number: number;
  instruction: string;
  distance?: {
    text: string;
    value: number;
  };
  duration?: {
    text: string;
    value: number;
  };
  maneuver?: string;
  start_location?: Coordinates;
  end_location?: Coordinates;
}

export interface Route {
  origin: Coordinates;
  destination: Coordinates;
  travel_mode: TravelMode;
  distance: {
    meters: number;
    text: string;
  };
  duration: {
    seconds: number;
    text: string;
  };
  polyline: string;
  steps: NavigationStep[];
  overview: string;
  cached?: boolean;
}

// City Types
export interface NearestCity {
  name: string;
  country: string;
  state?: string;
  coordinates: Coordinates;
  distance_km: number;
  population?: number;
  timezone?: string;
}

// Satellite Imagery Types
export interface SatelliteImagery {
  image_url: string;
  metadata: {
    center: Coordinates;
    zoom: number;
    size: string;
    maptype: string;
    marker: {
      color: string;
      position: Coordinates;
    };
  };
}

// Location Analysis Types
export interface LocationAnalysis {
  coordinates: Coordinates;
  address: LocationAddress;
  nearest_city: NearestCity | null;
  points_of_interest: POI[];
  satellite_imagery: SatelliteImagery;
  search_radius: number;
  total_pois_found: number;
  response_time_ms: number;
}

// API Request/Response Types
export interface LocationAnalysisRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  includeCategories?: POICategory[];
}

export interface NavigationRequest {
  origin: Coordinates;
  destination: Coordinates;
  travelMode?: TravelMode;
  units?: 'metric' | 'imperial';
}

export interface POISearchRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  categories?: POICategory[];
}

export interface DistanceMatrixRequest {
  origins: Coordinates[];
  destinations: Coordinates[];
  travelMode?: TravelMode;
  units?: 'metric' | 'imperial';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: any;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

// Map Component Types
export interface MapComponentProps {
  center: Coordinates;
  zoom?: number;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  onMapClick?: (coordinates: Coordinates) => void;
  satelliteView?: boolean;
  className?: string;
}

export interface MapMarker {
  position: Coordinates;
  title?: string;
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
  onClick?: () => void;
  info?: {
    name: string;
    category?: string;
    address?: string;
    rating?: number;
  };
}

export interface MapPolyline {
  path: Coordinates[];
  color?: string;
  weight?: number;
  opacity?: number;
}

// Form Types
export interface CoordinateInputForm {
  latitude: string;
  longitude: string;
  radius: number;
  categories: POICategory[];
}

export interface NavigationForm {
  origin: {
    latitude: string;
    longitude: string;
  };
  destination: {
    latitude: string;
    longitude: string;
  };
  travelMode: TravelMode;
  units: 'metric' | 'imperial';
}

// App State Types
export interface AppState {
  currentLocation: Coordinates | null;
  selectedLocation: Coordinates | null;
  locationAnalysis: LocationAnalysis | null;
  isLoading: boolean;
  error: string | null;
  mapCenter: Coordinates;
  mapZoom: number;
  selectedPOIs: POI[];
  activeRoute: Route | null;
}

// Hook Types
export interface UseLocationAnalysis {
  data: LocationAnalysis | null;
  isLoading: boolean;
  error: string | null;
  analyzeLocation: (request: LocationAnalysisRequest) => Promise<void>;
  clearData: () => void;
}

export interface UseNavigation {
  route: Route | null;
  isLoading: boolean;
  error: string | null;
  getDirections: (request: NavigationRequest) => Promise<void>;
  clearRoute: () => void;
}

export interface UsePOISearch {
  pois: POI[];
  isLoading: boolean;
  error: string | null;
  searchPOIs: (request: POISearchRequest) => Promise<void>;
  clearPOIs: () => void;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}