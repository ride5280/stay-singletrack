/**
 * Fetch Colorado trail data from COTREX (Colorado Trail Explorer)
 *
 * COTREX provides official trail data from 230+ land managers across Colorado.
 * Data is accessed via ArcGIS REST API (CPWAdminData service, layer 15).
 *
 * This script fetches all bike-accessible trail segments, then merges
 * segments that share the same trail name into single MultiLineString trails.
 *
 * Usage: npx tsx scripts/etl/fetch-cotrex.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';

// COTREX ArcGIS REST API endpoint (CPWAdminData layer 15)
const COTREX_API_URL =
  'https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/ArcGIS/rest/services/CPWAdminData/FeatureServer/15/query';

// Output paths
const OUTPUT_DIR = path.join(__dirname, '../../data/raw');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'cotrex_trails.json');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'fetch_progress.json');

// Configuration
const BATCH_SIZE = 2000; // Server max is 2000
const DELAY_MS = 500; // Delay between requests

// Fields to request
const OUT_FIELDS = [
  'name',
  'name_1',
  'name_2',
  'name_3',
  'surface',
  'bike',
  'type',
  'length_mi_',
  'min_elevat',
  'max_elevat',
  'manager',
  'feature_id',
  'access',
  'seasonalit',
].join(',');

interface RawFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
  properties: {
    name?: string;
    name_1?: string;
    name_2?: string;
    name_3?: string;
    surface?: string;
    bike?: string;
    type?: string;
    length_mi_?: number;
    min_elevat?: number;
    max_elevat?: number;
    manager?: string;
    feature_id?: string;
    access?: string;
    seasonalit?: string;
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
  access: string | null;
  length_miles: number | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  geometry: {
    type: 'MultiLineString';
    coordinates: number[][][];
  };
  centroid_lat: number;
  centroid_lon: number;
  segment_count: number;
}

interface Progress {
  offset: number;
  totalFetched: number;
  lastFetchTime: string;
}

// Fetch a batch of trail segments from the API
async function fetchBatch(offset: number): Promise<{ features: RawFeature[]; exceededTransferLimit: boolean }> {
  const params = new URLSearchParams({
    where: "type='Trail'",
    outFields: OUT_FIELDS,
    returnGeometry: 'true',
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

  // GeoJSON format: exceededTransferLimit is in properties
  const exceeded =
    data.properties?.exceededTransferLimit || data.exceededTransferLimit || false;

  return {
    features: data.features || [],
    exceededTransferLimit: exceeded,
  };
}

// Normalize geometry to MultiLineString coordinates (number[][][])
function toMultiLineCoords(geometry: RawFeature['geometry']): number[][][] {
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates as number[][][];
  }
  // LineString → wrap in array to make MultiLineString
  return [geometry.coordinates as number[][]];
}

// Merge segments by trail name into combined trails
function mergeSegments(rawFeatures: RawFeature[]): ProcessedTrail[] {
  // Group by name
  const groups = new Map<
    string,
    {
      name: string;
      system: string | null;
      manager: string | null;
      surfaces: Set<string>;
      bikeAllowed: boolean;
      access: string | null;
      totalLength: number;
      minElev: number;
      maxElev: number;
      allCoords: number[][][];
      featureIds: Set<string>;
      segmentCount: number;
    }
  >();

  let skippedNoName = 0;
  let skippedNoGeom = 0;

  for (const feature of rawFeatures) {
    const props = feature.properties;

    // Skip features without geometry
    if (!feature.geometry || !feature.geometry.coordinates) {
      skippedNoGeom++;
      continue;
    }

    // Get trail name — skip unnamed
    const name = (props.name || '').trim();
    if (!name) {
      skippedNoName++;
      continue;
    }

    const key = name.toLowerCase();
    let group = groups.get(key);

    if (!group) {
      group = {
        name,
        system: props.name_1 || props.name_2 || props.name_3 || null,
        manager: props.manager || null,
        surfaces: new Set(),
        bikeAllowed: props.bike?.toLowerCase() === 'yes',
        access: props.access || props.seasonalit || null,
        totalLength: 0,
        minElev: Infinity,
        maxElev: -Infinity,
        allCoords: [],
        featureIds: new Set(),
        segmentCount: 0,
      };
      groups.set(key, group);
    }

    // Accumulate data
    if (props.bike?.toLowerCase() === 'yes') group.bikeAllowed = true;
    if (props.surface) group.surfaces.add(props.surface);
    if (props.manager && !group.manager) group.manager = props.manager;
    if (props.access && !group.access) group.access = props.access;
    if (!group.access && props.seasonalit) group.access = props.seasonalit;
    if (props.length_mi_) group.totalLength += props.length_mi_;
    if (props.min_elevat != null && props.min_elevat < group.minElev)
      group.minElev = props.min_elevat;
    if (props.max_elevat != null && props.max_elevat > group.maxElev)
      group.maxElev = props.max_elevat;
    if (props.feature_id) group.featureIds.add(props.feature_id);

    // Add geometry coordinates
    const coords = toMultiLineCoords(feature.geometry);
    group.allCoords.push(...coords);
    group.segmentCount++;
  }

  console.log(`\nMerge stats:`);
  console.log(`  Skipped (no name): ${skippedNoName}`);
  console.log(`  Skipped (no geometry): ${skippedNoGeom}`);
  console.log(`  Unique trail names: ${groups.size}`);

  // Convert groups to ProcessedTrail objects
  const trails: ProcessedTrail[] = [];
  let idx = 0;

  for (const [, group] of groups) {
    const geometry: ProcessedTrail['geometry'] = {
      type: 'MultiLineString',
      coordinates: group.allCoords,
    };

    // Calculate centroid
    let centroid = { lat: 39.5501, lon: -105.7821 }; // Colorado fallback
    try {
      const feat = turf.feature(geometry as GeoJSON.Geometry);
      const c = turf.centroid(feat);
      centroid = {
        lon: c.geometry.coordinates[0],
        lat: c.geometry.coordinates[1],
      };
    } catch {
      // use fallback
    }

    // Use calculated length from geometry if COTREX length sum is 0
    let length = group.totalLength;
    if (!length || length === 0) {
      try {
        const feat = turf.feature(geometry as GeoJSON.Geometry);
        const km = turf.length(feat, { units: 'kilometers' });
        length = Math.round(km * 0.621371 * 100) / 100;
      } catch {
        length = 0;
      }
    } else {
      length = Math.round(length * 100) / 100;
    }

    // Use first feature_id as cotrex_id, or generate one
    const featureId = group.featureIds.size > 0
      ? Array.from(group.featureIds)[0]
      : `gen_${idx}`;

    trails.push({
      cotrex_id: `cotrex_${featureId}`,
      name: group.name,
      system: group.system,
      manager: group.manager,
      surface: group.surfaces.size > 0 ? Array.from(group.surfaces).join(', ') : null,
      open_to: group.bikeAllowed ? 'bike' : null,
      open_to_bikes: group.bikeAllowed,
      access: group.access,
      length_miles: length,
      elevation_min_m: group.minElev === Infinity ? null : Math.round(group.minElev),
      elevation_max_m: group.maxElev === -Infinity ? null : Math.round(group.maxElev),
      geometry,
      centroid_lat: centroid.lat,
      centroid_lon: centroid.lon,
      segment_count: group.segmentCount,
    });

    idx++;
  }

  return trails;
}

// Load progress from file
function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    console.log('No progress file found, starting fresh');
  }
  return { offset: 0, totalFetched: 0, lastFetchTime: new Date().toISOString() };
}

// Save progress to file
function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
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

// Main fetch function
async function fetchAllTrails(): Promise<void> {
  console.log('🚴 COTREX Trail Fetcher (CPWAdminData)');
  console.log('======================================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Fetch all raw segments first
  const allRawFeatures: RawFeature[] = [];
  let progress = loadProgress();
  let hasMore = true;
  let offset = progress.offset;
  let batchCount = 0;

  // If resuming, load previously fetched segments
  const segmentsFile = path.join(OUTPUT_DIR, 'cotrex_segments_partial.json');
  if (progress.offset > 0 && fs.existsSync(segmentsFile)) {
    console.log(`Resuming from offset ${progress.offset}...`);
    const saved = JSON.parse(fs.readFileSync(segmentsFile, 'utf-8'));
    allRawFeatures.push(...saved);
  }

  while (hasMore) {
    try {
      const { features, exceededTransferLimit } = await fetchBatch(offset);

      if (features.length === 0) {
        console.log('No more features to fetch');
        break;
      }

      allRawFeatures.push(...features);
      console.log(`  ✓ Got ${features.length} segments (total raw: ${allRawFeatures.length})`);

      offset += features.length;
      progress = {
        offset,
        totalFetched: allRawFeatures.length,
        lastFetchTime: new Date().toISOString(),
      };
      saveProgress(progress);

      // Save intermediate raw segments every 5 batches
      batchCount++;
      if (batchCount % 5 === 0) {
        console.log('  Saving intermediate segments...');
        fs.writeFileSync(segmentsFile, JSON.stringify(allRawFeatures));
      }

      hasMore = exceededTransferLimit || features.length === BATCH_SIZE;

      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    } catch (error) {
      console.error('Error fetching batch:', error);
      // Save what we have and allow resume
      fs.writeFileSync(segmentsFile, JSON.stringify(allRawFeatures));
      saveProgress(progress);
      throw error;
    }
  }

  console.log(`\n📊 Total raw segments fetched: ${allRawFeatures.length}`);
  console.log('\n🔗 Merging segments by trail name...');

  // Merge segments into trails
  const mergedTrails = mergeSegments(allRawFeatures);

  // Sort by length descending
  mergedTrails.sort((a, b) => (b.length_miles || 0) - (a.length_miles || 0));

  // Save final output
  saveTrails(mergedTrails);

  // Clean up temp files
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  if (fs.existsSync(segmentsFile)) fs.unlinkSync(segmentsFile);

  console.log('\n✅ Fetch complete!');
  console.log(`Total merged trails: ${mergedTrails.length}`);
  console.log(`Output file: ${OUTPUT_FILE}`);

  // Print stats
  const managers = new Set(mergedTrails.map((t) => t.manager).filter(Boolean));
  const multiSegment = mergedTrails.filter((t) => t.segment_count > 1);
  const withElevation = mergedTrails.filter((t) => t.elevation_min_m !== null);
  const longestTrail = mergedTrails[0];

  console.log('\nStats:');
  console.log(`  Land managers: ${managers.size}`);
  console.log(`  Multi-segment trails: ${multiSegment.length}`);
  console.log(`  Trails with elevation data: ${withElevation.length}`);
  if (longestTrail) {
    console.log(`  Longest trail: ${longestTrail.name} (${longestTrail.length_miles} mi, ${longestTrail.segment_count} segments)`);
  }
}

// Run the script
fetchAllTrails().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
