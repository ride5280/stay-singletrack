-- MTB Trail Conditions - Initial Schema
-- Run this migration in Supabase SQL Editor

-- Enable PostGIS extension for geographic queries (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- TRAILS TABLE
-- Enriched trail data populated via ETL
-- ============================================
CREATE TABLE IF NOT EXISTS trails (
  id SERIAL PRIMARY KEY,
  cotrex_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  system TEXT,
  manager TEXT,
  
  -- Geometry stored as GeoJSON for simplicity
  geometry JSONB NOT NULL,
  centroid_lat DECIMAL(10, 6) NOT NULL,
  centroid_lon DECIMAL(10, 6) NOT NULL,
  
  -- Enriched attributes (computed during ETL)
  elevation_min INTEGER,        -- meters
  elevation_max INTEGER,        -- meters
  elevation_gain INTEGER,       -- meters
  dominant_aspect TEXT,         -- N, NE, E, SE, S, SW, W, NW
  soil_drainage_class TEXT,     -- from SSURGO
  canopy_cover_pct INTEGER,     -- optional, from NLCD
  
  -- Trail metadata
  length_miles DECIMAL(5, 2),
  open_to_bikes BOOLEAN DEFAULT true,
  
  -- Dry time estimation (derived from soil/elevation/aspect)
  base_dry_hours INTEGER DEFAULT 48,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for geographic queries
CREATE INDEX IF NOT EXISTS idx_trails_centroid ON trails(centroid_lat, centroid_lon);

-- Index for searching by name
CREATE INDEX IF NOT EXISTS idx_trails_name ON trails(name);

-- Index for cotrex_id lookups
CREATE INDEX IF NOT EXISTS idx_trails_cotrex_id ON trails(cotrex_id);


-- ============================================
-- CONDITION REPORTS TABLE
-- User-submitted trail conditions
-- ============================================
CREATE TABLE IF NOT EXISTS condition_reports (
  id SERIAL PRIMARY KEY,
  trail_id INTEGER REFERENCES trails(id) ON DELETE CASCADE,
  condition TEXT NOT NULL CHECK (condition IN ('dry', 'tacky', 'muddy', 'snow')),
  notes TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,                 -- anonymous ID or null
  ip_hash TEXT                  -- for rate limiting
);

-- Index for finding reports by trail
CREATE INDEX IF NOT EXISTS idx_reports_trail_id ON condition_reports(trail_id);

-- Index for finding recent reports
CREATE INDEX IF NOT EXISTS idx_reports_reported_at ON condition_reports(reported_at DESC);


-- ============================================
-- WEATHER CACHE TABLE
-- Daily weather data by region
-- ============================================
CREATE TABLE IF NOT EXISTS weather_cache (
  id SERIAL PRIMARY KEY,
  region TEXT NOT NULL,         -- 'front_range', 'boulder', 'golden', etc.
  date DATE NOT NULL,
  precipitation_mm DECIMAL(5, 2),
  temp_max_c DECIMAL(4, 1),
  temp_min_c DECIMAL(4, 1),
  humidity_pct INTEGER,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint on region + date
  UNIQUE(region, date)
);

-- Index for weather lookups
CREATE INDEX IF NOT EXISTS idx_weather_region_date ON weather_cache(region, date DESC);


-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

-- Trails: public read
CREATE POLICY "Allow public read on trails"
  ON trails FOR SELECT
  USING (true);

-- Condition reports: public read
CREATE POLICY "Allow public read on condition_reports"
  ON condition_reports FOR SELECT
  USING (true);

-- Condition reports: public insert
CREATE POLICY "Allow public insert on condition_reports"
  ON condition_reports FOR INSERT
  WITH CHECK (true);

-- Weather cache: public read
CREATE POLICY "Allow public read on weather_cache"
  ON weather_cache FOR SELECT
  USING (true);


-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on trails
CREATE TRIGGER update_trails_updated_at
  BEFORE UPDATE ON trails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- View: Recent reports count per trail (last 24 hours)
CREATE OR REPLACE VIEW trail_recent_reports AS
SELECT 
  trail_id,
  COUNT(*) as report_count,
  mode() WITHIN GROUP (ORDER BY condition) as most_common_condition
FROM condition_reports
WHERE reported_at > NOW() - INTERVAL '24 hours'
GROUP BY trail_id;

-- View: Trails with their most recent report
CREATE OR REPLACE VIEW trails_with_reports AS
SELECT 
  t.*,
  r.report_count,
  r.most_common_condition as recent_user_condition
FROM trails t
LEFT JOIN trail_recent_reports r ON r.trail_id = t.id;
