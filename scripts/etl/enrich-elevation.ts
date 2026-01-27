/**
 * Enrich trails with USGS elevation and aspect data
 * 
 * Uses the USGS Elevation Point Query Service to sample elevation
 * along trails and calculate min/max/gain and dominant aspect.
 * 
 * Usage: npx tsx scripts/etl/enrich-elevation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';

// USGS Elevation API endpoint
const USGS_ELEVATION_URL = 'https://epqs.nationalmap.gov/v1/json';

// File paths
const INPUT_FILE = path.join(__dirname, '../../data/enriched/trails_with_soil.json');
const OUTPUT_FILE = path.join(__dirname, '../../data/enriched/trails_complete.json');
const PROGRESS_FILE = path.join(__dirname, '../../data/enriched/elevation_progress.json');

// Configuration
const SAMPLE_INTERVAL_METERS = 500; // Sample every 500m along trail
const RATE_LIMIT_MS = 200; // 5 requests per second
const MAX_RETRIES = 3;
const MAX_SAMPLES_PER_TRAIL = 20; // Limit samples for very long trails

type Aspect = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

interface TrailData {
  cotrex_id: string;
  name: string;
  system: string | null;
  manager: string | null;
  surface: string | null;
  open_to: string | null;
  open_to_bikes: boolean;
  length_miles: number | null;
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
  centroid_lat: number;
  centroid_lon: number;
  soil_drainage_class: string | null;
  base_dry_hours: number | null;
  // Elevation fields
  elevation_min?: number | null;
  elevation_max?: number | null;
  elevation_gain?: number | null;
  dominant_aspect?: Aspect | null;
}

interface EnrichedTrailsData {
  fetched_at: string;
  source: string;
  source_url: string;
  enriched_at: string;
  enrichment: string;
  total_trails: number;
  trails: TrailData[];
}

interface Progress {
  lastProcessedIndex: number;
  processedCount: number;
  errorCount: number;
  lastRunTime: string;
}

// Query elevation for a single point
async function getElevation(lat: number, lon: number): Promise<number | null> {
  const url = `${USGS_ELEVATION_URL}?x=${lon}&y=${lat}&units=Meters&wkid=4326`;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.value !== undefined && data.value !== -1000000) {
        return Math.round(data.value);
      }
      
      return null;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  return null;
}

// Sample points along a LineString or MultiLineString
function samplePoints(geometry: TrailData['geometry']): [number, number][] {
  try {
    // Convert to a single LineString if MultiLineString
    let line: GeoJSON.Feature<GeoJSON.LineString>;
    
    if (geometry.type === 'MultiLineString') {
      // Combine all parts into one line for sampling
      const allCoords: number[][] = [];
      for (const part of geometry.coordinates as number[][][]) {
        allCoords.push(...part);
      }
      line = turf.lineString(allCoords);
    } else {
      line = turf.lineString(geometry.coordinates as number[][]);
    }
    
    const lengthKm = turf.length(line, { units: 'kilometers' });
    const lengthMeters = lengthKm * 1000;
    
    // Calculate number of samples
    const numSamples = Math.min(
      Math.ceil(lengthMeters / SAMPLE_INTERVAL_METERS) + 1,
      MAX_SAMPLES_PER_TRAIL
    );
    
    // Always include start and end points
    const samples: [number, number][] = [];
    
    for (let i = 0; i < numSamples; i++) {
      const fraction = i / (numSamples - 1);
      const distance = fraction * lengthKm;
      const point = turf.along(line, distance, { units: 'kilometers' });
      samples.push([
        point.geometry.coordinates[1], // lat
        point.geometry.coordinates[0], // lon
      ]);
    }
    
    return samples;
  } catch (error) {
    console.error('Error sampling points:', error);
    return [];
  }
}

// Calculate dominant aspect from bearing changes along a line
function calculateDominantAspect(geometry: TrailData['geometry']): Aspect | null {
  try {
    let coords: number[][];
    
    if (geometry.type === 'MultiLineString') {
      coords = (geometry.coordinates as number[][][]).flat();
    } else {
      coords = geometry.coordinates as number[][];
    }
    
    if (coords.length < 2) return null;
    
    // Calculate bearings for each segment
    const bearings: number[] = [];
    
    for (let i = 0; i < coords.length - 1; i++) {
      const bearing = turf.bearing(
        turf.point(coords[i]),
        turf.point(coords[i + 1])
      );
      bearings.push(bearing);
    }
    
    if (bearings.length === 0) return null;
    
    // Average bearing (handling the 0/360 wrap)
    let sinSum = 0;
    let cosSum = 0;
    for (const b of bearings) {
      sinSum += Math.sin((b * Math.PI) / 180);
      cosSum += Math.cos((b * Math.PI) / 180);
    }
    
    const avgBearing = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
    const normalizedBearing = (avgBearing + 360) % 360;
    
    // The aspect is the direction the trail faces (perpendicular to travel direction)
    // We'll use the direction the slope generally faces
    // For simplicity, we'll use cardinal direction buckets
    return bearingToAspect(normalizedBearing);
  } catch (error) {
    console.error('Error calculating aspect:', error);
    return null;
  }
}

// Convert bearing to aspect direction
function bearingToAspect(bearing: number): Aspect {
  // Normalize to 0-360
  const b = ((bearing % 360) + 360) % 360;
  
  if (b >= 337.5 || b < 22.5) return 'N';
  if (b >= 22.5 && b < 67.5) return 'NE';
  if (b >= 67.5 && b < 112.5) return 'E';
  if (b >= 112.5 && b < 157.5) return 'SE';
  if (b >= 157.5 && b < 202.5) return 'S';
  if (b >= 202.5 && b < 247.5) return 'SW';
  if (b >= 247.5 && b < 292.5) return 'W';
  return 'NW';
}

// Calculate elevation stats for a trail
async function processTrailElevation(
  trail: TrailData
): Promise<{
  elevation_min: number | null;
  elevation_max: number | null;
  elevation_gain: number | null;
}> {
  const samplePoints_ = samplePoints(trail.geometry);
  
  if (samplePoints_.length === 0) {
    return { elevation_min: null, elevation_max: null, elevation_gain: null };
  }
  
  const elevations: number[] = [];
  
  for (const [lat, lon] of samplePoints_) {
    const elev = await getElevation(lat, lon);
    if (elev !== null) {
      elevations.push(elev);
    }
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }
  
  if (elevations.length === 0) {
    return { elevation_min: null, elevation_max: null, elevation_gain: null };
  }
  
  const elevation_min = Math.min(...elevations);
  const elevation_max = Math.max(...elevations);
  
  // Calculate total elevation gain (sum of positive changes)
  let elevation_gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      elevation_gain += diff;
    }
  }
  
  return { elevation_min, elevation_max, elevation_gain: Math.round(elevation_gain) };
}

// Load/save progress
function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (error) {
    console.log('No progress file found');
  }
  return {
    lastProcessedIndex: -1,
    processedCount: 0,
    errorCount: 0,
    lastRunTime: new Date().toISOString(),
  };
}

function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function saveTrails(trails: TrailData[], originalData: EnrichedTrailsData): void {
  const output = {
    ...originalData,
    elevation_enriched_at: new Date().toISOString(),
    trails,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
}

// Main function
async function enrichTrailsWithElevation(): Promise<void> {
  console.log('⛰️  USGS Elevation Enrichment');
  console.log('============================\n');

  // Check for input file (try soil-enriched first, then raw)
  let inputPath = INPUT_FILE;
  if (!fs.existsSync(INPUT_FILE)) {
    const rawFile = path.join(__dirname, '../../data/raw/cotrex_trails.json');
    if (fs.existsSync(rawFile)) {
      console.log('Soil-enriched file not found, using raw trails...');
      inputPath = rawFile;
    } else {
      console.error('No input file found. Run fetch-cotrex.ts first.');
      process.exit(1);
    }
  }

  const rawData: EnrichedTrailsData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`Loaded ${rawData.trails.length} trails`);

  // Load progress
  let progress = loadProgress();
  const startIndex = progress.lastProcessedIndex + 1;
  
  if (startIndex > 0) {
    console.log(`Resuming from trail ${startIndex}...`);
    if (fs.existsSync(OUTPUT_FILE)) {
      const enrichedData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      rawData.trails = enrichedData.trails;
    }
  }

  const trails = rawData.trails;
  const total = trails.length;
  
  console.log(`Processing trails ${startIndex} to ${total - 1}...\n`);

  for (let i = startIndex; i < total; i++) {
    const trail = trails[i];
    
    // Skip if already has elevation data
    if (trail.elevation_min !== undefined && trail.elevation_max !== undefined) {
      continue;
    }
    
    const shortName = trail.name.substring(0, 35).padEnd(35);
    process.stdout.write(`[${i + 1}/${total}] ${shortName} `);
    
    try {
      // Get elevation stats
      const elevStats = await processTrailElevation(trail);
      trail.elevation_min = elevStats.elevation_min;
      trail.elevation_max = elevStats.elevation_max;
      trail.elevation_gain = elevStats.elevation_gain;
      
      // Calculate aspect
      trail.dominant_aspect = calculateDominantAspect(trail.geometry);
      
      if (elevStats.elevation_min !== null) {
        const minFt = Math.round((elevStats.elevation_min || 0) * 3.28084);
        const maxFt = Math.round((elevStats.elevation_max || 0) * 3.28084);
        console.log(`✓ ${minFt}-${maxFt}ft, ${trail.dominant_aspect || '?'}`);
        progress.processedCount++;
      } else {
        console.log('⚠ No elevation data');
      }
    } catch (error) {
      console.log(`✗ Error: ${error}`);
      trail.elevation_min = null;
      trail.elevation_max = null;
      trail.elevation_gain = null;
      trail.dominant_aspect = null;
      progress.errorCount++;
    }
    
    // Update progress
    progress.lastProcessedIndex = i;
    progress.lastRunTime = new Date().toISOString();
    
    // Save every 25 trails
    if ((i + 1) % 25 === 0) {
      console.log('\n  Saving checkpoint...\n');
      saveTrails(trails, rawData);
      saveProgress(progress);
    }
  }

  // Final save
  saveTrails(trails, rawData);
  
  // Clean up progress
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  // Stats
  const withElevation = trails.filter((t) => t.elevation_min !== null).length;
  const aspectCounts: Record<string, number> = {};
  for (const trail of trails) {
    const key = trail.dominant_aspect || 'Unknown';
    aspectCounts[key] = (aspectCounts[key] || 0) + 1;
  }
  
  // Elevation ranges
  const elevations = trails
    .filter((t) => t.elevation_min !== null)
    .map((t) => t.elevation_min!);
  const avgElevation = elevations.length > 0 
    ? Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length)
    : 0;

  console.log('\n✅ Elevation enrichment complete!');
  console.log(`\nStats:`);
  console.log(`  Trails with elevation: ${withElevation} / ${total}`);
  console.log(`  Average min elevation: ${avgElevation}m (${Math.round(avgElevation * 3.28084)}ft)`);
  console.log(`  Errors: ${progress.errorCount}`);
  console.log(`\nAspect distribution:`);
  for (const [asp, count] of Object.entries(aspectCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${asp}: ${count} (${pct}%)`);
  }
  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

// Run
enrichTrailsWithElevation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
