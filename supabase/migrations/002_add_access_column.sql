-- Add access column for seasonal closure data from COTREX
-- Values: null, 'no', 'seasonally', '5/1-11/30', etc.
ALTER TABLE trails ADD COLUMN IF NOT EXISTS access TEXT;

-- Create index for quick closure queries
CREATE INDEX IF NOT EXISTS idx_trails_access ON trails (access) WHERE access IS NOT NULL;
