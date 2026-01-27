/**
 * Enrich trails with USDA SSURGO soil drainage data
 * 
 * SSURGO (Soil Survey Geographic Database) provides soil survey information
 * including drainage classification which affects how quickly trails dry.
 * 
 * Usage: npx tsx scripts/etl/enrich-soil.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// SSURGO REST API endpoint
const SSURGO_API_URL = 'https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest';

// File paths
const INPUT_FILE = path.join(__dirname, '../../data/raw/cotrex_trails.json');
const OUTPUT_FILE = path.join(__dirname, '../../data/enriched/trails_with_soil.json');
const PROGRESS_FILE = path.join(__dirname, '../../data/enriched/soil_progress.json');

// Configuration
const RATE_LIMIT_MS = 1000; // 1 request per second (SSURGO is slow)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Drainage class to base dry hours mapping
const DRAINAGE_TO_DRY_HOURS: Record<string, number> = {
  'Excessively drained': 6,
  'Somewhat excessively drained': 12,
  'Well drained': 24,
  'Moderately well drained': 48,
  'Somewhat poorly drained': 72,
  'Poorly drained': 120,
  'Very poorly drained': 168,
};

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
  // Enriched fields
  soil_drainage_class?: string | null;
  base_dry_hours?: number | null;
}

interface RawTrailsData {
  fetched_at: string;
  source: string;
  source_url: string;
  total_trails: number;
  trails: TrailData[];
}

interface Progress {
  lastProcessedIndex: number;
  processedCount: number;
  errorCount: number;
  lastRunTime: string;
}

// Build SSURGO SQL query for drainage class at a point
function buildDrainageQuery(lat: number, lon: number): string {
  // Note: SSURGO expects lon/lat (x/y) order in WKT
  return `
    SELECT TOP 1 c.drainagecl
    FROM mapunit mu
    INNER JOIN component c ON c.mukey = mu.mukey
    WHERE mu.mukey IN (
      SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${lon} ${lat})')
    )
    AND c.majcompflag = 'Yes'
    AND c.drainagecl IS NOT NULL
    ORDER BY c.comppct_r DESC
  `.trim().replace(/\s+/g, ' ');
}

// Query SSURGO for drainage class
async function queryDrainageClass(lat: number, lon: number): Promise<string | null> {
  const query = buildDrainageQuery(lat, lon);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(SSURGO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `query=${encodeURIComponent(query)}&format=JSON`,
      });

      if (!response.ok) {
        throw new Error(`SSURGO API error: ${response.status}`);
      }

      const data = await response.json();
      
      // SSURGO returns data in a specific format
      if (data.Table && data.Table.length > 0) {
        const row = data.Table[0];
        // The result might be an array or object depending on the query
        if (Array.isArray(row)) {
          return row[0] || null;
        } else if (row.drainagecl) {
          return row.drainagecl;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`  Attempt ${attempt} failed:`, error);
      if (attempt < MAX_RETRIES) {
        console.log(`  Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  
  return null;
}

// Get base dry hours from drainage class
function getDryHours(drainageClass: string | null): number {
  if (!drainageClass) return 48; // Default
  
  // Try exact match first
  if (drainageClass in DRAINAGE_TO_DRY_HOURS) {
    return DRAINAGE_TO_DRY_HOURS[drainageClass];
  }
  
  // Try partial match (sometimes SSURGO returns slightly different strings)
  const lower = drainageClass.toLowerCase();
  if (lower.includes('excessively')) return 6;
  if (lower.includes('well') && !lower.includes('moderately') && !lower.includes('somewhat')) return 24;
  if (lower.includes('moderately well')) return 48;
  if (lower.includes('somewhat poorly')) return 72;
  if (lower.includes('poorly') && !lower.includes('very')) return 120;
  if (lower.includes('very poorly')) return 168;
  
  return 48; // Default
}

// Load progress
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

// Save progress
function saveProgress(progress: Progress): void {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Save enriched trails
function saveTrails(trails: TrailData[], originalData: RawTrailsData): void {
  const output = {
    ...originalData,
    enriched_at: new Date().toISOString(),
    enrichment: 'SSURGO soil drainage',
    trails,
  };
  
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
}

// Main enrichment function
async function enrichTrailsWithSoil(): Promise<void> {
  console.log('🌱 SSURGO Soil Enrichment');
  console.log('=========================\n');

  // Load trails
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run fetch-cotrex.ts first');
    process.exit(1);
  }

  const rawData: RawTrailsData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${rawData.trails.length} trails`);

  // Load progress
  let progress = loadProgress();
  const startIndex = progress.lastProcessedIndex + 1;
  
  if (startIndex > 0) {
    console.log(`Resuming from trail ${startIndex}...`);
    // Load existing enriched data
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
    
    // Skip if already enriched
    if (trail.soil_drainage_class !== undefined) {
      continue;
    }
    
    process.stdout.write(`[${i + 1}/${total}] ${trail.name.substring(0, 40).padEnd(40)} `);
    
    try {
      const drainageClass = await queryDrainageClass(trail.centroid_lat, trail.centroid_lon);
      trail.soil_drainage_class = drainageClass;
      trail.base_dry_hours = getDryHours(drainageClass);
      
      if (drainageClass) {
        console.log(`✓ ${drainageClass} (${trail.base_dry_hours}h)`);
        progress.processedCount++;
      } else {
        console.log('⚠ No data (using default 48h)');
      }
    } catch (error) {
      console.log(`✗ Error: ${error}`);
      trail.soil_drainage_class = null;
      trail.base_dry_hours = 48;
      progress.errorCount++;
    }
    
    // Update progress
    progress.lastProcessedIndex = i;
    progress.lastRunTime = new Date().toISOString();
    
    // Save every 50 trails
    if ((i + 1) % 50 === 0) {
      console.log('\n  Saving checkpoint...\n');
      saveTrails(trails, rawData);
      saveProgress(progress);
    }
    
    // Rate limiting
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  // Final save
  saveTrails(trails, rawData);
  
  // Clean up progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  // Stats
  const withSoil = trails.filter((t) => t.soil_drainage_class).length;
  const drainageStats: Record<string, number> = {};
  for (const trail of trails) {
    const key = trail.soil_drainage_class || 'Unknown';
    drainageStats[key] = (drainageStats[key] || 0) + 1;
  }

  console.log('\n✅ Enrichment complete!');
  console.log(`\nStats:`);
  console.log(`  Trails with soil data: ${withSoil} / ${total}`);
  console.log(`  Errors: ${progress.errorCount}`);
  console.log(`\nDrainage class distribution:`);
  for (const [cls, count] of Object.entries(drainageStats).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${cls}: ${count} (${pct}%)`);
  }
  console.log(`\nOutput: ${OUTPUT_FILE}`);
}

// Run
enrichTrailsWithSoil().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
