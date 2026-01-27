/**
 * Fetch Colorado trail data from COTREX (Colorado Trail Explorer)
 * 
 * COTREX provides official trail data from 230+ land managers across Colorado.
 * Data is accessed via ArcGIS REST API.
 * 
 * Usage: npx tsx scripts/etl/fetch-cotrex.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';

// COTREX ArcGIS REST API endpoint
const COTREX_API_URL = 'https://services5.arcgis.com/ttNGmDvKQA3mYSuG/arcgis/rest/services/COTREX_Trails/FeatureServer/0/query';

// Output paths
const OUTPUT_DIR = path.join(__dirname, '../../data/raw');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'cotrex_trails.json');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'fetch_progress.json');

// Configuration
const BATCH_SIZE = 1000; // Records per request (max is usually 1000-2000)
const DELAY_MS = 500; // Delay between requests to be nice to the API

interface COTREXFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
  properties: {
    OBJECTID: number;
    SYSTEMNAME?: string;
    SYSTEM?: string;
    TRAILNAME?: string;
    NAME?: string;
    MANAGER?: string;
    MANAGER_NA?: string;
    SURFACE?: string;
    OPEN_TO?: string;
    SHARED_USE?: string;
    BIKE?: string;
    HIKING?: string;
    Miles?: number;
    MILES?: number;
    Shape__Length?: number;
    // ... other fields
    [key: string]: unknown;
  };
}

interface ProcessedTrail {
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
}

interface Progress {
  offset: number;
  totalFetched: number;
  lastFetchTime: string;
}

// Helper to check if trail is open to bikes
function isOpenToBikes(feature: COTREXFeature): boolean {
  const props = feature.properties;
  
  // Check various fields that indicate bike access
  if (props.BIKE === 'Yes' || props.BIKE === 'Y') return true;
  if (props.OPEN_TO?.toLowerCase().includes('bike')) return true;
  if (props.OPEN_TO?.toLowerCase().includes('cycling')) return true;
  if (props.SHARED_USE?.toLowerCase().includes('bike')) return true;
  
  // If no explicit bike field, include it (we'll filter later if needed)
  return true;
}

// Calculate centroid of a geometry
function calculateCentroid(geometry: COTREXFeature['geometry']): { lat: number; lon: number } {
  try {
    const feature = turf.feature(geometry as GeoJSON.Geometry);
    const centroid = turf.centroid(feature);
    return {
      lon: centroid.geometry.coordinates[0],
      lat: centroid.geometry.coordinates[1],
    };
  } catch (error) {
    console.error('Error calculating centroid:', error);
    // Return Colorado center as fallback
    return { lat: 39.5501, lon: -105.7821 };
  }
}

// Calculate trail length in miles
function calculateLength(geometry: COTREXFeature['geometry']): number {
  try {
    const feature = turf.feature(geometry as GeoJSON.Geometry);
    const lengthKm = turf.length(feature, { units: 'kilometers' });
    return Math.round(lengthKm * 0.621371 * 100) / 100; // Convert to miles, round to 2 decimals
  } catch (error) {
    console.error('Error calculating length:', error);
    return 0;
  }
}

// Fetch a batch of trails from the API
async function fetchBatch(offset: number): Promise<{ features: COTREXFeature[]; exceededTransferLimit: boolean }> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    f: 'geojson',
    resultOffset: offset.toString(),
    resultRecordCount: BATCH_SIZE.toString(),
  });

  const url = `${COTREX_API_URL}?${params}`;
  console.log(`Fetching offset ${offset}...`);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    features: data.features || [],
    exceededTransferLimit: data.exceededTransferLimit || false,
  };
}

// Process a feature into our internal format
function processFeature(feature: COTREXFeature): ProcessedTrail | null {
  const props = feature.properties;
  
  // Skip features without geometry
  if (!feature.geometry || !feature.geometry.coordinates) {
    return null;
  }

  // Get trail name
  const name = props.TRAILNAME || props.NAME || props.SYSTEMNAME || 'Unknown Trail';
  
  // Calculate centroid
  const centroid = calculateCentroid(feature.geometry);
  
  // Calculate length (use provided value or calculate from geometry)
  const providedLength = props.Miles || props.MILES || props.Shape__Length;
  const calculatedLength = calculateLength(feature.geometry);
  const length_miles = providedLength 
    ? (typeof providedLength === 'number' ? providedLength : parseFloat(providedLength as string))
    : calculatedLength;

  return {
    cotrex_id: `cotrex_${props.OBJECTID}`,
    name,
    system: props.SYSTEMNAME || props.SYSTEM || null,
    manager: props.MANAGER || props.MANAGER_NA || null,
    surface: props.SURFACE || null,
    open_to: props.OPEN_TO || null,
    open_to_bikes: isOpenToBikes(feature),
    length_miles: Math.round(length_miles * 100) / 100,
    geometry: feature.geometry,
    centroid_lat: centroid.lat,
    centroid_lon: centroid.lon,
  };
}

// Load progress from file
function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('No progress file found, starting fresh');
  }
  return { offset: 0, totalFetched: 0, lastFetchTime: new Date().toISOString() };
}

// Save progress to file
function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Main fetch function
async function fetchAllTrails(): Promise<void> {
  console.log('🚴 COTREX Trail Fetcher');
  console.log('=======================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load existing data if resuming
  let allTrails: ProcessedTrail[] = [];
  let progress = loadProgress();

  if (progress.offset > 0) {
    console.log(`Resuming from offset ${progress.offset}...`);
    if (fs.existsSync(OUTPUT_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      allTrails = existingData.trails || [];
    }
  }

  let hasMore = true;
  let offset = progress.offset;
  let batchCount = 0;

  while (hasMore) {
    try {
      const { features, exceededTransferLimit } = await fetchBatch(offset);
      
      if (features.length === 0) {
        console.log('No more features to fetch');
        break;
      }

      // Process features
      let processedCount = 0;
      let skippedCount = 0;

      for (const feature of features) {
        const processed = processFeature(feature);
        if (processed) {
          allTrails.push(processed);
          processedCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(`  ✓ Fetched ${features.length} features (${processedCount} processed, ${skippedCount} skipped)`);
      console.log(`  Total trails so far: ${allTrails.length}`);

      // Save progress
      offset += features.length;
      progress = {
        offset,
        totalFetched: allTrails.length,
        lastFetchTime: new Date().toISOString(),
      };
      saveProgress(progress);

      // Save intermediate results every 5 batches
      batchCount++;
      if (batchCount % 5 === 0) {
        console.log('  Saving intermediate results...');
        saveTrails(allTrails);
      }

      // Check if there are more records
      hasMore = exceededTransferLimit || features.length === BATCH_SIZE;

      // Delay between requests
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    } catch (error) {
      console.error('Error fetching batch:', error);
      console.log('Saving progress and exiting...');
      saveTrails(allTrails);
      saveProgress(progress);
      throw error;
    }
  }

  // Final save
  saveTrails(allTrails);

  // Clean up progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log('\n✅ Fetch complete!');
  console.log(`Total trails: ${allTrails.length}`);
  console.log(`Output file: ${OUTPUT_FILE}`);

  // Print some stats
  const bikeTrails = allTrails.filter((t) => t.open_to_bikes);
  const systems = new Set(allTrails.map((t) => t.system).filter(Boolean));
  const managers = new Set(allTrails.map((t) => t.manager).filter(Boolean));

  console.log('\nStats:');
  console.log(`  Bike-accessible trails: ${bikeTrails.length}`);
  console.log(`  Trail systems: ${systems.size}`);
  console.log(`  Land managers: ${managers.size}`);
}

// Save trails to file
function saveTrails(trails: ProcessedTrail[]): void {
  const output = {
    fetched_at: new Date().toISOString(),
    source: 'COTREX (Colorado Trail Explorer)',
    source_url: COTREX_API_URL,
    total_trails: trails.length,
    trails,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
}

// Run the script
fetchAllTrails().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
