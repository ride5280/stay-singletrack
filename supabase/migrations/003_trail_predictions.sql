-- Trail Predictions Table
-- Stores daily AI-generated condition predictions

CREATE TABLE IF NOT EXISTS trail_predictions (
  id SERIAL PRIMARY KEY,
  trail_id INTEGER REFERENCES trails(id) ON DELETE CASCADE,
  cotrex_id TEXT NOT NULL,
  
  -- Prediction data
  condition TEXT NOT NULL CHECK (condition IN ('rideable', 'likely_rideable', 'likely_muddy', 'muddy', 'snow')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  hours_since_rain DECIMAL(6, 2),
  effective_dry_hours DECIMAL(6, 2),
  
  -- Factors that influenced the prediction
  factors JSONB,
  
  -- Timestamp
  predicted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint - one prediction per trail
  UNIQUE(cotrex_id)
);

-- Index for fast lookups by condition
CREATE INDEX IF NOT EXISTS idx_predictions_condition ON trail_predictions(condition);

-- Index for trail_id joins
CREATE INDEX IF NOT EXISTS idx_predictions_trail_id ON trail_predictions(trail_id);

-- Enable RLS
ALTER TABLE trail_predictions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read on trail_predictions"
  ON trail_predictions FOR SELECT
  USING (true);

-- Service role can upsert predictions
CREATE POLICY "Allow service role to manage predictions"
  ON trail_predictions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
