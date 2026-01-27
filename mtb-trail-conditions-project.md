# MTB Trail Conditions — Project Plan

## Overview

**Project Name:** MTB Trail Conditions (working title: "TrailDry" or "IsItRideable")

**Type:** Passion project — optimize for zero ongoing cost, not revenue

**Problem:** Mountain bikers in Colorado constantly ask Facebook groups "is X trail dry?" after rain. The answers are inconsistent, hard to search, and buried in noise.

**Solution:** An AI-powered trail conditions predictor that combines free government data (soil drainage, elevation, aspect) with weather data to predict trail ridability — no crowdsourcing required for baseline predictions.

**Target User:** Front Range Colorado mountain bikers who want to know if trails are rideable before driving to them.

**Why This Works Technically:**
- COTREX provides 40,000+ miles of Colorado trail data for free
- USDA SSURGO provides soil drainage classification for free
- Weather APIs are free
- The prediction is deterministic math, not expensive ML inference

**Why This Doesn't Work as a Business:**
- Target users (including the founder) wouldn't pay for it
- Trail conditions feels like weather — should be free
- Low stakes problem (worst case: drive to muddy trail, turn around)

**Goal:** Build it, ship it, let it run forever at $0/month.

---

## Architecture: The "Walk Away" Design

Design principles:
1. **Precompute everything possible** — static data served from CDN
2. **No backend server** — serverless functions only
3. **Free tier everything** — Vercel, Supabase, GitHub Actions
4. **Minimal moving parts** — if you stop touching it, it keeps working

```
┌─────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   COTREX    │     │   SSURGO    │     │  USGS DEM   │       │
│  │  (trails)   │     │   (soil)    │     │ (elevation) │       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘       │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                    │
│                   ┌─────────────────┐                           │
│                   │  ONE-TIME ETL   │  ← Run once, store forever│
│                   │  (enrich trails)│                           │
│                   └────────┬────────┘                           │
│                            ▼                                     │
│                   ┌─────────────────┐                           │
│                   │    Supabase     │  ← Free tier: 500MB      │
│                   │   (Postgres)    │                           │
│                   └────────┬────────┘                           │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │   Vercel    │   │GitHub Action│   │  Open-Meteo │          │
│  │  (frontend) │   │(daily cron) │   │  (weather)  │          │
│  └─────────────┘   └──────┬──────┘   └─────────────┘          │
│         ▲                 │                                     │
│         │                 ▼                                     │
│         │        ┌─────────────────┐                           │
│         │        │ predictions.json│  ← Regenerated daily      │
│         │        │   (static CDN)  │                           │
│         │        └────────┬────────┘                           │
│         │                 │                                     │
│         └─────────────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Daily Flow:**
1. GitHub Action triggers at 6am
2. Fetches weather from Open-Meteo for Front Range
3. Runs prediction algorithm against static trail data
4. Outputs `predictions.json` to Vercel static hosting
5. Frontend reads static JSON — no database queries at runtime

---

## Data Sources

### 1. COTREX (Trail Geometry)

**What:** Official Colorado trail data from 230+ land managers
**URL:** https://geodata.colorado.gov/datasets/CPW::cotrex-trails
**Format:** GeoJSON / Shapefile
**Cost:** Free
**Update Frequency:** Download once, update quarterly if desired

**Key Fields:**
- `geometry` — trail path (LineString)
- `name` — trail name
- `manager` — land manager
- `system` — trail system
- `open_to` — allowed uses (bike, horse, hike, etc.)

**How to Get:**
```bash
# Download GeoJSON directly
curl -o cotrex_trails.geojson "https://opendata.arcgis.com/datasets/XXXXX.geojson"

# Or use the ArcGIS REST API
# https://services5.arcgis.com/ttNGmDvKQA3mYSuG/arcgis/rest/services/COTREX_Trails/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson
```

### 2. USDA SSURGO (Soil Drainage)

**What:** Soil survey data including drainage classification
**URL:** https://sdmdataaccess.nrcs.usda.gov/
**Format:** REST API (SQL queries)
**Cost:** Free
**Update Frequency:** Static (soil doesn't change)

**Key Field:** `drainagecl` (drainage class)
- "Excessively drained" → dries in hours
- "Well drained" → dries in 24-48 hours
- "Moderately well drained" → dries in 48-72 hours
- "Somewhat poorly drained" → dries in 72-96 hours
- "Poorly drained" → stays wet for days
- "Very poorly drained" → perpetually wet

**How to Query:**
```sql
-- Query drainage class for a point (lat/lon)
SELECT mu.mukey, mu.muname, c.drainagecl
FROM mapunit mu
INNER JOIN component c ON c.mukey = mu.mukey
WHERE mu.mukey IN (
  SELECT mukey FROM SDA_Get_Mukey_from_intersection_with_WktWgs84(
    'POINT(-105.2705 39.9619)'
  )
)
AND c.majcompflag = 'Yes'
```

**REST Endpoint:**
```
POST https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest
Content-Type: application/x-www-form-urlencoded

query=SELECT...&format=JSON
```

### 3. USGS Elevation (DEM)

**What:** Digital Elevation Model for elevation and aspect calculation
**URL:** https://epqs.nationalmap.gov/v1/json
**Format:** REST API
**Cost:** Free
**Update Frequency:** Static

**How to Query:**
```bash
# Get elevation for a point
curl "https://epqs.nationalmap.gov/v1/json?x=-105.2705&y=39.9619&units=Meters&wkid=4326"
```

**Response:**
```json
{
  "value": 1609.34,
  "unit": "Meters"
}
```

### 4. Open-Meteo (Weather)

**What:** Free weather API — no API key required
**URL:** https://open-meteo.com/
**Format:** REST API
**Cost:** Free (10,000 requests/day)
**Update Frequency:** Query daily

**Key Fields:**
- `precipitation_sum` — daily precipitation (mm)
- `temperature_2m_max/min` — temperature range
- `relative_humidity_2m` — humidity

**How to Query:**
```bash
# Get last 7 days of weather for Boulder, CO
curl "https://api.open-meteo.com/v1/forecast?latitude=40.015&longitude=-105.2705&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&past_days=7&timezone=America/Denver"
```

---

## Database Schema

Using Supabase (Postgres) for storage. Minimal schema — most data is static.

```sql
-- Enriched trail data (populated once via ETL)
CREATE TABLE trails (
  id SERIAL PRIMARY KEY,
  cotrex_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  system TEXT,
  manager TEXT,
  
  -- Geometry (stored as GeoJSON for simplicity)
  geometry JSONB NOT NULL,
  centroid_lat DECIMAL(10, 6),
  centroid_lon DECIMAL(10, 6),
  
  -- Enriched attributes (computed once)
  elevation_min INTEGER,        -- meters
  elevation_max INTEGER,        -- meters
  elevation_gain INTEGER,       -- meters
  dominant_aspect TEXT,         -- N, NE, E, SE, S, SW, W, NW
  soil_drainage_class TEXT,     -- from SSURGO
  canopy_cover_pct INTEGER,     -- optional, from NLCD
  
  -- Metadata
  length_miles DECIMAL(5, 2),
  open_to_bikes BOOLEAN DEFAULT true,
  
  -- Dry time estimation (derived from attributes)
  base_dry_hours INTEGER,       -- estimated hours to dry in neutral conditions
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for geographic queries
CREATE INDEX idx_trails_centroid ON trails(centroid_lat, centroid_lon);

-- User condition reports (optional — for calibration)
CREATE TABLE condition_reports (
  id SERIAL PRIMARY KEY,
  trail_id INTEGER REFERENCES trails(id),
  condition TEXT NOT NULL,      -- 'dry', 'tacky', 'muddy', 'snow'
  reported_at TIMESTAMP DEFAULT NOW(),
  user_id TEXT                  -- anonymous ID or null
);

-- Weather cache (updated daily by cron)
CREATE TABLE weather_cache (
  id SERIAL PRIMARY KEY,
  region TEXT NOT NULL,         -- 'front_range', 'summit_county', etc.
  date DATE NOT NULL,
  precipitation_mm DECIMAL(5, 2),
  temp_max_c DECIMAL(4, 1),
  temp_min_c DECIMAL(4, 1),
  humidity_pct INTEGER,
  fetched_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(region, date)
);
```

---

## Prediction Algorithm

### Core Logic

```python
def predict_trail_condition(trail, weather_history):
    """
    Predict trail condition based on soil, aspect, elevation, and recent weather.
    
    Returns: 'rideable', 'likely_muddy', 'muddy', 'unknown'
    """
    
    # Base dry time from soil drainage class
    BASE_DRY_HOURS = {
        'Excessively drained': 6,
        'Well drained': 24,
        'Moderately well drained': 48,
        'Somewhat poorly drained': 72,
        'Poorly drained': 120,
        'Very poorly drained': 168,
    }
    
    base_hours = BASE_DRY_HOURS.get(trail.soil_drainage_class, 48)
    
    # Aspect modifier (south-facing dries faster)
    ASPECT_MODIFIERS = {
        'S': 0.6, 'SE': 0.7, 'SW': 0.7,
        'E': 0.85, 'W': 0.85,
        'NE': 1.1, 'NW': 1.1, 'N': 1.3,
    }
    aspect_mod = ASPECT_MODIFIERS.get(trail.dominant_aspect, 1.0)
    
    # Elevation modifier (higher = slower drying in shoulder seasons)
    # Above 8000ft, add 20% to dry time
    elevation_mod = 1.2 if trail.elevation_min > 2438 else 1.0  # 8000ft in meters
    
    # Temperature modifier (warmer = faster drying)
    avg_temp = sum(w.temp_max_c for w in weather_history[-3:]) / 3
    if avg_temp > 20:      # >68°F
        temp_mod = 0.7
    elif avg_temp > 10:    # >50°F
        temp_mod = 1.0
    elif avg_temp > 0:     # >32°F
        temp_mod = 1.5
    else:                  # freezing
        temp_mod = 3.0     # snow/ice conditions
    
    # Calculate effective dry time
    effective_dry_hours = base_hours * aspect_mod * elevation_mod * temp_mod
    
    # Calculate hours since last significant precipitation
    hours_since_precip = calculate_hours_since_precip(weather_history, threshold_mm=2.5)
    
    # Calculate total recent precipitation
    recent_precip_mm = sum(w.precipitation_mm for w in weather_history[-7:])
    
    # Determine condition
    if hours_since_precip > effective_dry_hours * 1.5:
        return 'rideable'
    elif hours_since_precip > effective_dry_hours:
        return 'likely_rideable'
    elif hours_since_precip > effective_dry_hours * 0.5:
        return 'likely_muddy'
    else:
        return 'muddy'


def calculate_hours_since_precip(weather_history, threshold_mm=2.5):
    """Find hours since last precipitation above threshold."""
    hours = 0
    for day in reversed(weather_history):
        if day.precipitation_mm >= threshold_mm:
            return hours
        hours += 24
    return hours  # No significant precip in history
```

### Confidence Score

```python
def calculate_confidence(trail, has_user_reports):
    """
    Return confidence level for prediction.
    
    Factors:
    - Soil data available
    - Recent user reports corroborate
    - Trail is well-known (more data points)
    """
    score = 50  # Base confidence
    
    if trail.soil_drainage_class:
        score += 25
    if trail.dominant_aspect:
        score += 10
    if has_user_reports:
        score += 15
    
    return min(score, 100)
```

---

## Project Structure

```
mtb-trail-conditions/
├── README.md
├── package.json
├── .env.example
├── .github/
│   └── workflows/
│       └── daily-predictions.yml    # Cron job for daily updates
│
├── scripts/
│   ├── etl/
│   │   ├── fetch-cotrex.ts          # Download trail data
│   │   ├── enrich-soil.ts           # Add SSURGO data
│   │   ├── enrich-elevation.ts      # Add elevation/aspect
│   │   └── seed-database.ts         # Load into Supabase
│   │
│   └── daily/
│       ├── fetch-weather.ts         # Get weather from Open-Meteo
│       ├── generate-predictions.ts  # Run prediction algorithm
│       └── output-static.ts         # Write predictions.json
│
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Home page (map view)
│   │   ├── trail/[id]/page.tsx      # Trail detail page
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── TrailMap.tsx             # Mapbox/Leaflet map
│   │   ├── TrailCard.tsx            # Trail summary card
│   │   ├── ConditionBadge.tsx       # Rideable/Muddy badge
│   │   └── WeatherSummary.tsx       # Recent weather display
│   │
│   ├── lib/
│   │   ├── predictions.ts           # Load static predictions
│   │   ├── supabase.ts              # Supabase client
│   │   └── types.ts                 # TypeScript types
│   │
│   └── data/
│       └── predictions.json         # Static predictions (generated daily)
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
└── public/
    └── trails/                      # Static trail GeoJSON files
```

---

## Build Prompts

Use these prompts sequentially with an AI coding agent (Claude, Cursor, etc.) to build the project.

---

### Prompt 1: Project Setup

```
Create a new Next.js 14 project with the following setup:

1. Initialize with: npx create-next-app@latest mtb-trail-conditions --typescript --tailwind --app --src-dir

2. Install dependencies:
   - @supabase/supabase-js (database)
   - leaflet react-leaflet (maps)
   - date-fns (date handling)
   - @turf/turf (geospatial calculations)

3. Create .env.example with:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (for ETL scripts only)

4. Set up the folder structure as specified in the project plan.

5. Create a basic layout.tsx with:
   - Dark theme (bg-gray-900, text-white)
   - Simple header with project name
   - Responsive container

Don't build any features yet — just the scaffolding.
```

---

### Prompt 2: Database Schema

```
Create the Supabase database schema for the MTB Trail Conditions app.

1. Create a new Supabase project (or use existing)

2. Create migration file: supabase/migrations/001_initial_schema.sql

3. Include these tables:
   - trails: id, cotrex_id, name, system, manager, geometry (JSONB), centroid_lat, centroid_lon, elevation_min, elevation_max, elevation_gain, dominant_aspect, soil_drainage_class, canopy_cover_pct, length_miles, open_to_bikes, base_dry_hours, created_at, updated_at
   
   - condition_reports: id, trail_id (FK), condition (enum: dry/tacky/muddy/snow), reported_at, user_id
   
   - weather_cache: id, region, date, precipitation_mm, temp_max_c, temp_min_c, humidity_pct, fetched_at, UNIQUE(region, date)

4. Add indexes for geographic queries on centroid_lat, centroid_lon

5. Add RLS policies:
   - trails: public read
   - condition_reports: public read, public insert
   - weather_cache: public read

Output the complete SQL migration file.
```

---

### Prompt 3: ETL Script — Fetch COTREX Trails

```
Create a TypeScript ETL script to fetch Colorado trail data from COTREX.

File: scripts/etl/fetch-cotrex.ts

Requirements:
1. Fetch trail data from the COTREX ArcGIS REST API:
   https://services5.arcgis.com/ttNGmDvKQA3mYSuG/arcgis/rest/services/COTREX_Trails/FeatureServer/0/query

2. Query parameters:
   - where: 1=1 (all trails) OR filter to Front Range region
   - outFields: * (all fields)
   - f: geojson
   - Use pagination (resultOffset, resultRecordCount) since there are 40k+ trails

3. Filter for MTB-relevant trails:
   - open_to contains "bike" or similar field

4. For each trail, calculate:
   - Centroid (lat/lon) from geometry using turf.js
   - Length in miles from geometry

5. Save raw data to: data/raw/cotrex_trails.json

6. Log progress (fetched X of Y trails)

Make it idempotent — can be re-run safely.
Include error handling and retry logic.
```

---

### Prompt 4: ETL Script — Enrich with Soil Data

```
Create a TypeScript ETL script to enrich trails with USDA SSURGO soil drainage data.

File: scripts/etl/enrich-soil.ts

Requirements:
1. Load trails from: data/raw/cotrex_trails.json

2. For each trail centroid, query SSURGO REST API:
   POST https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest
   
   Query template:
   SELECT mu.mukey, c.drainagecl
   FROM mapunit mu
   INNER JOIN component c ON c.mukey = mu.mukey
   WHERE mu.mukey IN (
     SELECT mukey FROM SDA_Get_Mukey_from_intersection_with_WktWgs84(
       'POINT({lon} {lat})'
     )
   )
   AND c.majcompflag = 'Yes'
   LIMIT 1

3. Map drainage class to base_dry_hours:
   - 'Excessively drained': 6
   - 'Well drained': 24
   - 'Moderately well drained': 48
   - 'Somewhat poorly drained': 72
   - 'Poorly drained': 120
   - 'Very poorly drained': 168
   - null/unknown: 48 (default)

4. Rate limit: Max 1 request per second (SSURGO is slow)

5. Save enriched data to: data/enriched/trails_with_soil.json

6. Include progress logging and ability to resume from last position.

Handle errors gracefully — if SSURGO fails for a trail, log it and continue.
```

---

### Prompt 5: ETL Script — Enrich with Elevation

```
Create a TypeScript ETL script to add elevation and aspect data to trails.

File: scripts/etl/enrich-elevation.ts

Requirements:
1. Load trails from: data/enriched/trails_with_soil.json

2. For each trail, sample elevation at multiple points along the geometry:
   - Sample every 500 meters along the trail
   - Use USGS Elevation API: https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Meters&wkid=4326

3. Calculate:
   - elevation_min: lowest point
   - elevation_max: highest point  
   - elevation_gain: sum of positive elevation changes

4. Calculate dominant aspect:
   - For each segment, calculate bearing/direction
   - Determine which direction the trail predominantly faces
   - Simplify to 8 directions: N, NE, E, SE, S, SW, W, NW

5. Rate limit: Max 5 requests per second (USGS is faster)

6. Save to: data/enriched/trails_complete.json

Include progress logging. Can be run incrementally.
```

---

### Prompt 6: ETL Script — Seed Database

```
Create a TypeScript script to load enriched trail data into Supabase.

File: scripts/etl/seed-database.ts

Requirements:
1. Load trails from: data/enriched/trails_complete.json

2. Connect to Supabase using service role key (not anon key)

3. Upsert trails into the trails table:
   - Use cotrex_id as the unique identifier
   - Update existing records if they exist

4. Batch inserts (100 at a time) for performance

5. Log: "Seeded X trails into database"

6. Verify by querying count: SELECT COUNT(*) FROM trails

Make it safe to re-run multiple times.
```

---

### Prompt 7: Daily Script — Fetch Weather

```
Create a TypeScript script to fetch daily weather data.

File: scripts/daily/fetch-weather.ts

Requirements:
1. Define regions with their center coordinates:
   - front_range: lat 39.75, lon -105.2
   - boulder: lat 40.015, lon -105.27
   - golden: lat 39.75, lon -105.22
   (Add more as needed)

2. For each region, fetch from Open-Meteo:
   https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean&past_days=7&timezone=America/Denver

3. Parse response and upsert into weather_cache table:
   - One row per region per date
   - Update if exists (ON CONFLICT)

4. Log: "Updated weather for X regions, Y days"

This script will be called by GitHub Actions daily.
```

---

### Prompt 8: Daily Script — Generate Predictions

```
Create a TypeScript script to generate trail condition predictions.

File: scripts/daily/generate-predictions.ts

Requirements:
1. Load all trails from Supabase

2. Load weather history from weather_cache (last 7 days)

3. For each trail, run the prediction algorithm:

   function predictCondition(trail, weatherHistory) {
     // Base dry time from soil
     const baseDryHours = trail.base_dry_hours || 48;
     
     // Aspect modifier
     const aspectMods = { S: 0.6, SE: 0.7, SW: 0.7, E: 0.85, W: 0.85, NE: 1.1, NW: 1.1, N: 1.3 };
     const aspectMod = aspectMods[trail.dominant_aspect] || 1.0;
     
     // Elevation modifier (>8000ft = slower)
     const elevMod = trail.elevation_min > 2438 ? 1.2 : 1.0;
     
     // Temperature modifier
     const avgTemp = average of last 3 days max temp;
     const tempMod = avgTemp > 20 ? 0.7 : avgTemp > 10 ? 1.0 : avgTemp > 0 ? 1.5 : 3.0;
     
     // Effective dry time
     const effectiveDryHours = baseDryHours * aspectMod * elevMod * tempMod;
     
     // Hours since significant rain (>2.5mm)
     const hoursSinceRain = calculate from weatherHistory;
     
     // Determine condition
     if (hoursSinceRain > effectiveDryHours * 1.5) return 'rideable';
     if (hoursSinceRain > effectiveDryHours) return 'likely_rideable';
     if (hoursSinceRain > effectiveDryHours * 0.5) return 'likely_muddy';
     return 'muddy';
   }

4. Calculate confidence score (50 base + 25 if soil data + 10 if aspect + 15 if user reports)

5. Output predictions to: public/data/predictions.json
   Format:
   {
     "generated_at": "2026-01-12T06:00:00Z",
     "trails": [
       {
         "id": 123,
         "cotrex_id": "...",
         "name": "Apex Trail",
         "condition": "rideable",
         "confidence": 85,
         "hours_since_rain": 72,
         "effective_dry_hours": 36,
         "factors": {
           "soil": "Well drained",
           "aspect": "S",
           "recent_precip_mm": 5.2
         }
       }
     ]
   }

6. Log: "Generated predictions for X trails"
```

---

### Prompt 9: GitHub Actions Workflow

```
Create a GitHub Actions workflow to run predictions daily.

File: .github/workflows/daily-predictions.yml

Requirements:
1. Run daily at 6am Mountain Time (12:00 UTC in winter, 13:00 UTC in summer)

2. Steps:
   a. Checkout repository
   b. Setup Node.js 20
   c. Install dependencies
   d. Run: npx ts-node scripts/daily/fetch-weather.ts
   e. Run: npx ts-node scripts/daily/generate-predictions.ts
   f. Commit and push predictions.json if changed

3. Environment variables (from GitHub Secrets):
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

4. Also allow manual trigger (workflow_dispatch)

5. Notify on failure (optional: add Slack/Discord webhook)

Make sure the workflow has write permissions to push commits.
```

---

### Prompt 10: Frontend — Map View

```
Create the main map view for the MTB Trail Conditions app.

File: src/app/page.tsx and src/components/TrailMap.tsx

Requirements:
1. Full-screen map using react-leaflet
   - Center on Boulder, CO (40.015, -105.27)
   - Default zoom: 10

2. Load predictions from /data/predictions.json (static file)

3. Display trails as colored lines:
   - Green: rideable
   - Yellow: likely_rideable  
   - Orange: likely_muddy
   - Red: muddy

4. On trail click, show popup with:
   - Trail name
   - Condition badge (colored)
   - Confidence percentage
   - "Last rain: X hours ago"
   - Link to detail page

5. Filter controls (top right):
   - Show only: [x] Rideable [ ] Likely Rideable [ ] Muddy
   - Region dropdown: All / Boulder / Golden / etc.

6. Header shows:
   - "Updated: {generated_at}"
   - Total trails: X rideable, Y muddy

7. Mobile responsive:
   - Map takes full viewport
   - Filters collapse into hamburger menu

Use Tailwind for styling. Dark theme.
```

---

### Prompt 11: Frontend — Trail Detail Page

```
Create the trail detail page.

File: src/app/trail/[id]/page.tsx

Requirements:
1. Load trail from predictions.json by ID

2. Display:
   - Trail name (large heading)
   - Condition badge (large, colored)
   - Confidence: X% with explanation

3. "Why this prediction" section:
   - Soil drainage: {soil_drainage_class}
   - Dominant aspect: {aspect} (explain: "South-facing trails dry faster")
   - Elevation: {elevation_min} - {elevation_max}m
   - Base dry time: {base_dry_hours} hours
   - Effective dry time (with modifiers): {effective_dry_hours} hours

4. Weather summary:
   - Last 7 days of precipitation
   - Simple bar chart or list
   - "Last significant rain: X hours ago"

5. Mini map showing just this trail

6. "Report Current Conditions" button:
   - Opens modal with 4 options: Dry, Tacky, Muddy, Snow
   - Submits to condition_reports table
   - Shows "Thanks!" confirmation

7. Link to COTREX for official info

8. Back to map button

Styling: Clean, readable, mobile-first.
```

---

### Prompt 12: Condition Reporting

```
Add user condition reporting functionality.

Files: 
- src/components/ReportConditionModal.tsx
- src/app/api/report/route.ts

Requirements:
1. Modal component with:
   - "How's the trail right now?"
   - 4 big buttons: 🏜️ Dry | 👌 Tacky | 💧 Muddy | ❄️ Snow
   - Optional: "Any notes?" text field
   - Submit button
   - Cancel button

2. API route (POST /api/report):
   - Accepts: { trail_id, condition, notes? }
   - Inserts into condition_reports table
   - Returns: { success: true }
   - Rate limit: 1 report per trail per hour per IP (simple)

3. After submit:
   - Close modal
   - Show toast: "Thanks! Your report helps other riders."

4. Display recent reports on trail detail page:
   - "Recent reports: 2 riders said Dry in the last 24 hours"
   - Only show if reports exist

Don't require authentication — keep it simple.
```

---

### Prompt 13: Deployment

```
Set up deployment for the MTB Trail Conditions app.

Requirements:
1. Vercel deployment:
   - Connect GitHub repo to Vercel
   - Configure environment variables:
     - NEXT_PUBLIC_SUPABASE_URL
     - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Set up automatic deploys from main branch

2. Custom domain (optional):
   - Configure in Vercel dashboard
   - Add to .env: NEXT_PUBLIC_SITE_URL

3. Verify GitHub Actions has:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - Repository write permissions for committing predictions.json

4. Test the full flow:
   - Manually trigger GitHub Action
   - Verify predictions.json is updated
   - Verify site shows new predictions

5. Add basic monitoring:
   - Vercel Analytics (free)
   - Console logging for errors

Document the deployment process in README.md.
```

---

### Prompt 14: README Documentation

```
Write comprehensive README.md for the MTB Trail Conditions project.

Include:
1. Project overview
   - What it does
   - Why it exists
   - Link to live site

2. Architecture diagram (ASCII)

3. Data sources with links:
   - COTREX
   - SSURGO
   - USGS Elevation
   - Open-Meteo

4. How the prediction works (simplified)

5. Development setup:
   - Clone repo
   - Install dependencies
   - Set up Supabase
   - Configure .env
   - Run ETL scripts
   - Start dev server

6. Deployment:
   - Vercel setup
   - GitHub Actions setup
   - Environment variables needed

7. Cost breakdown:
   - Vercel: Free tier
   - Supabase: Free tier
   - APIs: All free
   - Total: $0/month

8. Contributing guidelines

9. License: MIT

10. Acknowledgments:
    - Colorado Parks & Wildlife for COTREX
    - USDA for SSURGO
    - Open-Meteo

Keep it clear and scannable.
```

---

## Cost Verification

| Service | Free Tier Limits | Expected Usage | Cost |
|---------|------------------|----------------|------|
| Vercel | 100GB bandwidth, 100K function invocations | ~1GB/mo, ~1K invocations | $0 |
| Supabase | 500MB database, 50K MAU | ~50MB, ~500 MAU | $0 |
| GitHub Actions | 2,000 minutes/mo | ~30 min/mo (daily cron) | $0 |
| Open-Meteo | 10,000 requests/day | ~10 requests/day | $0 |
| USGS Elevation | Unlimited | ETL only | $0 |
| SSURGO | Unlimited | ETL only | $0 |
| **Total** | | | **$0/mo** |

**Scaling thresholds:**
- If you exceed 50K monthly users: Supabase Pro (~$25/mo)
- If you exceed 100GB bandwidth: Vercel Pro (~$20/mo)
- But at that point, you have a popular product — good problem

---

## Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| Week 1 | Project setup, database schema, ETL scripts for COTREX | 5-8 hours |
| Week 2 | ETL scripts for soil/elevation, seed database | 5-8 hours |
| Week 3 | Daily scripts, GitHub Actions, predictions algorithm | 5-8 hours |
| Week 4 | Frontend map view, basic UI | 5-8 hours |
| Week 5 | Trail detail page, condition reporting | 5-8 hours |
| Week 6 | Testing, polish, deploy, documentation | 5-8 hours |

**Total: ~30-48 hours over 6 weeks** (nights/weekends pace)

---

## Success Criteria

This is a passion project, not a business. Success means:

1. ✅ It works — predictions load, map renders
2. ✅ It's useful — you actually check it before rides
3. ✅ It costs nothing — runs on free tiers indefinitely
4. ✅ It's low maintenance — GitHub Action runs daily without intervention
5. ✅ Others find it helpful — share in MTB Facebook groups, get some users

**Non-goals:**
- Revenue
- Large user base
- Feature completeness
- Competing with Trailforks

---

## Future Ideas (If You Want)

Only pursue these if the base product works and you're having fun:

- [ ] Mobile app wrapper (Capacitor)
- [ ] SMS alerts for favorite trails
- [ ] Integration with Strava (show conditions on ride planning)
- [ ] Expand to other states (where trail data is available)
- [ ] Snow depth predictions for winter
- [ ] Trail advocacy dashboard (aggregate data for land managers)

---

*Last updated: January 2026*
