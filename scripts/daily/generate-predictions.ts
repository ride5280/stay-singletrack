/**
 * Generate trail condition predictions
 * 
 * Combines trail data (soil, aspect, elevation) with recent weather
 * to predict current trail conditions. Outputs predictions.json.
 * 
 * Usage: npx tsx scripts/daily/generate-predictions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Output path
const OUTPUT_FILE = path.join(__dirname, '../../public/data/predictions.json');

// Types
type TrailCondition = 'rideable' | 'likely_rideable' | 'likely_muddy' | 'muddy' | 'snow' | 'unknown';
type Aspect = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
type DrainageClass = 
  | 'Excessively drained'
  | 'Well drained'
  | 'Moderately well drained'
  | 'Somewhat poorly drained'
  | 'Poorly drained'
  | 'Very poorly drained';

interface Trail {
  id: number;
  cotrex_id: string;
  name: string;
  centroid_lat: number;
  centroid_lon: number;
  elevation_min: number | null;
  elevation_max: number | null;
  dominant_aspect: Aspect | null;
  soil_drainage_class: DrainageClass | null;
  base_dry_hours: number | null;
  geometry: object;
}

interface WeatherDay {
  date: string;
  precipitation_mm: number;
  temp_max_c: number;
  temp_min_c: number;
  humidity_pct: number;
}

interface TrailPrediction {
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
  geometry: object;
}

// Prediction constants
const BASE_DRY_HOURS: Record<string, number> = {
  'Excessively drained': 6,
  'Well drained': 24,
  'Moderately well drained': 48,
  'Somewhat poorly drained': 72,
  'Poorly drained': 120,
  'Very poorly drained': 168,
};

const ASPECT_MODIFIERS: Record<Aspect, number> = {
  'S': 0.6,
  'SE': 0.7,
  'SW': 0.7,
  'E': 0.85,
  'W': 0.85,
  'NE': 1.1,
  'NW': 1.1,
  'N': 1.3,
};

const PRECIP_THRESHOLD_MM = 2.5; // Significant rain threshold

// Create Supabase client
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  return createClient(url, key);
}

// Get nearest region for a trail based on coordinates
function getNearestRegion(lat: number, lon: number): string {
  const regions: Record<string, { lat: number; lon: number }> = {
    front_range: { lat: 39.75, lon: -105.2 },
    boulder: { lat: 40.015, lon: -105.27 },
    golden: { lat: 39.75, lon: -105.22 },
    denver: { lat: 39.74, lon: -104.99 },
    colorado_springs: { lat: 38.83, lon: -104.82 },
    fort_collins: { lat: 40.58, lon: -105.08 },
  };

  let nearest = 'front_range';
  let minDist = Infinity;

  for (const [regionId, center] of Object.entries(regions)) {
    const dist = Math.sqrt(
      Math.pow(lat - center.lat, 2) + Math.pow(lon - center.lon, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = regionId;
    }
  }

  return nearest;
}

// Calculate hours since significant precipitation
function calculateHoursSinceRain(weather: WeatherDay[]): number {
  const now = new Date();
  
  // Sort by date descending (most recent first)
  const sorted = [...weather].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  for (const day of sorted) {
    if (day.precipitation_mm >= PRECIP_THRESHOLD_MM) {
      const rainDate = new Date(day.date);
      // Assume rain fell at noon on that day
      rainDate.setHours(12, 0, 0, 0);
      const hoursSince = (now.getTime() - rainDate.getTime()) / (1000 * 60 * 60);
      return Math.max(0, Math.round(hoursSince));
    }
  }
  
  // No significant rain in history - return days * 24
  return weather.length * 24;
}

// Calculate average temperature over last N days
function calculateAvgTemp(weather: WeatherDay[], days: number = 3): number {
  const recent = weather.slice(0, days);
  if (recent.length === 0) return 15; // Default to moderate temp
  
  const avgMax = recent.reduce((sum, d) => sum + d.temp_max_c, 0) / recent.length;
  return avgMax;
}

// Calculate total recent precipitation
function calculateRecentPrecip(weather: WeatherDay[], days: number = 7): number {
  const recent = weather.slice(0, days);
  return recent.reduce((sum, d) => sum + d.precipitation_mm, 0);
}

// Main prediction algorithm
function predictTrailCondition(
  trail: Trail,
  weather: WeatherDay[]
): { condition: TrailCondition; confidence: number; hours_since_rain: number; effective_dry_hours: number } {
  // Base dry time from soil
  const baseDryHours = trail.base_dry_hours || 
    (trail.soil_drainage_class ? BASE_DRY_HOURS[trail.soil_drainage_class] : 48);
  
  // Aspect modifier (south-facing dries faster)
  const aspectMod = trail.dominant_aspect 
    ? ASPECT_MODIFIERS[trail.dominant_aspect] || 1.0
    : 1.0;
  
  // Elevation modifier (>8000ft / 2438m = slower drying)
  const elevMod = (trail.elevation_min && trail.elevation_min > 2438) ? 1.2 : 1.0;
  
  // Temperature modifier
  const avgTemp = calculateAvgTemp(weather, 3);
  let tempMod: number;
  if (avgTemp > 20) {
    tempMod = 0.7;  // Hot = fast drying
  } else if (avgTemp > 10) {
    tempMod = 1.0;  // Moderate
  } else if (avgTemp > 0) {
    tempMod = 1.5;  // Cold = slow drying
  } else {
    tempMod = 3.0;  // Freezing = snow/ice conditions
  }
  
  // Calculate effective dry time
  const effectiveDryHours = Math.round(baseDryHours * aspectMod * elevMod * tempMod);
  
  // Hours since significant precipitation
  const hoursSinceRain = calculateHoursSinceRain(weather);
  
  // Determine condition
  let condition: TrailCondition;
  
  if (avgTemp < 0) {
    condition = 'snow';
  } else if (hoursSinceRain > effectiveDryHours * 1.5) {
    condition = 'rideable';
  } else if (hoursSinceRain > effectiveDryHours) {
    condition = 'likely_rideable';
  } else if (hoursSinceRain > effectiveDryHours * 0.5) {
    condition = 'likely_muddy';
  } else {
    condition = 'muddy';
  }
  
  // Calculate confidence
  let confidence = 50; // Base
  if (trail.soil_drainage_class) confidence += 25;
  if (trail.dominant_aspect) confidence += 10;
  if (trail.elevation_min !== null) confidence += 10;
  // Could add user report boost here
  confidence = Math.min(confidence, 100);
  
  return { condition, confidence, hours_since_rain: hoursSinceRain, effective_dry_hours: effectiveDryHours };
}

// Main function
async function generatePredictions(): Promise<void> {
  console.log('🔮 Prediction Generator');
  console.log('=======================\n');

  const supabase = createSupabaseClient();
  console.log('Connected to Supabase\n');

  // Fetch all trails
  console.log('Fetching trails...');
  const { data: trails, error: trailsError } = await supabase
    .from('trails')
    .select('*')
    .eq('open_to_bikes', true);

  if (trailsError || !trails) {
    console.error('Error fetching trails:', trailsError?.message);
    process.exit(1);
  }
  console.log(`Loaded ${trails.length} trails\n`);

  // Fetch weather data (last 7 days for all regions)
  console.log('Fetching weather...');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: weather, error: weatherError } = await supabase
    .from('weather_cache')
    .select('*')
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (weatherError) {
    console.error('Error fetching weather:', weatherError.message);
    process.exit(1);
  }
  console.log(`Loaded ${weather?.length || 0} weather records\n`);

  // Group weather by region
  const weatherByRegion: Record<string, WeatherDay[]> = {};
  for (const w of weather || []) {
    if (!weatherByRegion[w.region]) {
      weatherByRegion[w.region] = [];
    }
    weatherByRegion[w.region].push({
      date: w.date,
      precipitation_mm: w.precipitation_mm,
      temp_max_c: w.temp_max_c,
      temp_min_c: w.temp_min_c,
      humidity_pct: w.humidity_pct,
    });
  }

  // Generate predictions
  console.log('Generating predictions...');
  const predictions: TrailPrediction[] = [];
  const conditionCounts: Record<TrailCondition, number> = {
    rideable: 0,
    likely_rideable: 0,
    likely_muddy: 0,
    muddy: 0,
    snow: 0,
    unknown: 0,
  };

  for (const trail of trails) {
    const region = getNearestRegion(trail.centroid_lat, trail.centroid_lon);
    const regionWeather = weatherByRegion[region] || weatherByRegion['front_range'] || [];
    
    const prediction = predictTrailCondition(trail, regionWeather);
    
    predictions.push({
      id: trail.id,
      cotrex_id: trail.cotrex_id,
      name: trail.name,
      centroid_lat: trail.centroid_lat,
      centroid_lon: trail.centroid_lon,
      condition: prediction.condition,
      confidence: prediction.confidence,
      hours_since_rain: prediction.hours_since_rain,
      effective_dry_hours: prediction.effective_dry_hours,
      factors: {
        soil: trail.soil_drainage_class,
        aspect: trail.dominant_aspect,
        elevation_min: trail.elevation_min,
        elevation_max: trail.elevation_max,
        recent_precip_mm: calculateRecentPrecip(regionWeather, 7),
        base_dry_hours: trail.base_dry_hours || 48,
      },
      geometry: trail.geometry,
    });
    
    conditionCounts[prediction.condition]++;
  }

  // Create output
  const output = {
    generated_at: new Date().toISOString(),
    region: 'Colorado',
    total_trails: predictions.length,
    summary: conditionCounts,
    trails: predictions,
  };

  // Write to file
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('\n=======================');
  console.log('✅ Predictions generated!');
  console.log(`\nResults:`);
  console.log(`  Total trails: ${predictions.length}`);
  console.log(`\nCondition breakdown:`);
  for (const [condition, count] of Object.entries(conditionCounts)) {
    if (count > 0) {
      const pct = ((count / predictions.length) * 100).toFixed(1);
      const emoji = {
        rideable: '🟢',
        likely_rideable: '🟡',
        likely_muddy: '🟠',
        muddy: '🔴',
        snow: '❄️',
        unknown: '⚪',
      }[condition] || '⚪';
      console.log(`  ${emoji} ${condition}: ${count} (${pct}%)`);
    }
  }
  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

// Run
generatePredictions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
