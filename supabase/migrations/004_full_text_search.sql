-- PostgreSQL full-text search for trails (name, system, manager)
-- Enables "search by trail name" in the app and API.

-- ============================================
-- FTS column and index on trails
-- ============================================
ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS name_search tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' || coalesce(system, '') || ' ' || coalesce(manager, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_trails_name_search ON trails USING GIN (name_search);

-- ============================================
-- RPC: search_predictions
-- Same filters as the API, plus full-text search on trail name/system/manager.
-- ============================================
CREATE OR REPLACE FUNCTION search_predictions(
  search_query text,
  conditions_filter text[] DEFAULT NULL,
  min_lat decimal DEFAULT NULL,
  max_lat decimal DEFAULT NULL,
  min_lon decimal DEFAULT NULL,
  max_lon decimal DEFAULT NULL,
  lim int DEFAULT 1000,
  off int DEFAULT 0
)
RETURNS TABLE (
  id int,
  cotrex_id text,
  condition text,
  confidence int,
  hours_since_rain decimal,
  effective_dry_hours decimal,
  factors jsonb,
  predicted_at timestamptz,
  name text,
  centroid_lat decimal,
  centroid_lon decimal,
  geometry jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.cotrex_id,
    p.condition,
    p.confidence,
    p.hours_since_rain,
    p.effective_dry_hours,
    p.factors,
    p.predicted_at,
    t.name,
    t.centroid_lat,
    t.centroid_lon,
    t.geometry
  FROM trail_predictions p
  JOIN trails t ON t.id = p.trail_id
  WHERE t.name_search @@ plainto_tsquery('english', search_query)
    AND (conditions_filter IS NULL OR cardinality(conditions_filter) = 0 OR p.condition = ANY (conditions_filter))
    AND (min_lat IS NULL OR t.centroid_lat >= min_lat)
    AND (max_lat IS NULL OR t.centroid_lat <= max_lat)
    AND (min_lon IS NULL OR t.centroid_lon >= min_lon)
    AND (max_lon IS NULL OR t.centroid_lon <= max_lon)
  ORDER BY ts_rank(t.name_search, plainto_tsquery('english', search_query)) DESC
  LIMIT lim
  OFFSET off;
$$;

-- Allow public to call the function (read-only)
GRANT EXECUTE ON FUNCTION search_predictions(text, text[], decimal, decimal, decimal, decimal, int, int) TO anon;
GRANT EXECUTE ON FUNCTION search_predictions(text, text[], decimal, decimal, decimal, decimal, int, int) TO authenticated;
