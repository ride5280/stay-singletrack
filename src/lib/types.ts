// Trail condition types
export type TrailCondition = 'rideable' | 'likely_rideable' | 'likely_muddy' | 'muddy' | 'snow' | 'closed' | 'unknown';

// Soil drainage classes from SSURGO
export type DrainageClass = 
  | 'Excessively drained'
  | 'Well drained'
  | 'Moderately well drained'
  | 'Somewhat poorly drained'
  | 'Poorly drained'
  | 'Very poorly drained';

// Cardinal directions for aspect
export type Aspect = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

// GeoJSON types for trail geometry
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString';
  coordinates: [number, number][][];
}

export type TrailGeometry = GeoJSONLineString | GeoJSONMultiLineString;

// Trail from database
export interface Trail {
  id: number;
  cotrex_id: string;
  name: string;
  system: string | null;
  manager: string | null;
  geometry: TrailGeometry;
  centroid_lat: number;
  centroid_lon: number;
  elevation_min: number | null;
  elevation_max: number | null;
  elevation_gain: number | null;
  dominant_aspect: Aspect | null;
  soil_drainage_class: DrainageClass | null;
  canopy_cover_pct: number | null;
  length_miles: number | null;
  open_to_bikes: boolean;
  base_dry_hours: number | null;
  created_at: string;
  updated_at: string;
}

// Condition report from users
export interface ConditionReport {
  id: number;
  trail_id: number;
  condition: 'dry' | 'tacky' | 'muddy' | 'snow';
  reported_at: string;
  user_id: string | null;
}

// Weather data from cache
export interface WeatherDay {
  date: string;
  precipitation_mm: number;
  temp_max_c: number;
  temp_min_c: number;
  humidity_pct: number;
}

export interface WeatherCache {
  id: number;
  region: string;
  date: string;
  precipitation_mm: number;
  temp_max_c: number;
  temp_min_c: number;
  humidity_pct: number;
  fetched_at: string;
}

// Prediction output
export interface TrailPrediction {
  id: number;
  cotrex_id: string;
  name: string;
  centroid_lat: number;
  centroid_lon: number;
  condition: TrailCondition;
  confidence: number;
  hours_since_rain: number;
  effective_dry_hours: number;
  factors: {
    soil: DrainageClass | null;
    aspect: Aspect | null;
    elevation_min: number | null;
    elevation_max: number | null;
    recent_precip_mm: number;
    base_dry_hours: number;
  };
  geometry?: TrailGeometry;
}

export interface PredictionsData {
  generated_at: string;
  region: string;
  total_trails: number;
  summary?: Record<TrailCondition, number>;
  trails: TrailPrediction[];
}

// API response types
export interface ReportConditionRequest {
  trail_id: number;
  condition: 'dry' | 'tacky' | 'muddy' | 'snow';
  notes?: string;
}

export interface ReportConditionResponse {
  success: boolean;
  message?: string;
}

// Condition color mapping
export const CONDITION_COLORS: Record<TrailCondition, string> = {
  rideable: '#22c55e',      // green-500
  likely_rideable: '#84cc16', // lime-500
  likely_muddy: '#f97316',   // orange-500
  muddy: '#ef4444',          // red-500
  snow: '#60a5fa',           // blue-400
  closed: '#9ca3af',         // gray-400
  unknown: '#6b7280',        // gray-500
};

// Condition labels for display
export const CONDITION_LABELS: Record<TrailCondition, string> = {
  rideable: 'Good',
  likely_rideable: 'Likely Good',
  likely_muddy: 'Likely Muddy',
  muddy: 'Muddy',
  snow: 'Snow/Ice',
  closed: 'Seasonally Closed',
  unknown: 'Unknown',
};

// Base dry hours by drainage class
export const BASE_DRY_HOURS: Record<DrainageClass, number> = {
  'Excessively drained': 6,
  'Well drained': 24,
  'Moderately well drained': 48,
  'Somewhat poorly drained': 72,
  'Poorly drained': 120,
  'Very poorly drained': 168,
};

// Aspect modifiers for drying time
export const ASPECT_MODIFIERS: Record<Aspect, number> = {
  'S': 0.6,
  'SE': 0.7,
  'SW': 0.7,
  'E': 0.85,
  'W': 0.85,
  'NE': 1.1,
  'NW': 1.1,
  'N': 1.3,
};
