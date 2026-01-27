/**
 * Seed Supabase database with enriched trail data
 * 
 * Loads trail data from the enriched JSON and upserts into the trails table.
 * Uses service role key for admin access.
 * 
 * Usage: npx tsx scripts/etl/seed-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// File paths (try complete first, then soil, then raw)
const DATA_FILES = [
  path.join(__dirname, '../../data/enriched/trails_complete.json'),
  path.join(__dirname, '../../data/enriched/trails_with_soil.json'),
  path.join(__dirname, '../../data/raw/cotrex_trails.json'),
];

// Configuration
const BATCH_SIZE = 100;

interface TrailData {
  cotrex_id: string;
  name: string;
  system: string | null;
  manager: string | null;
  open_to_bikes: boolean;
  length_miles: number | null;
  geometry: object;
  centroid_lat: number;
  centroid_lon: number;
  soil_drainage_class?: string | null;
  base_dry_hours?: number | null;
  elevation_min?: number | null;
  elevation_max?: number | null;
  elevation_gain?: number | null;
  dominant_aspect?: string | null;
}

interface TrailsData {
  trails: TrailData[];
}

// Create Supabase client with service role
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing Supabase environment variables');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', key ? '✓' : '✗');
    process.exit(1);
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Find the best available data file
function findDataFile(): string {
  for (const file of DATA_FILES) {
    if (fs.existsSync(file)) {
      return file;
    }
  }
  
  console.error('No data file found. Run the ETL scripts first:');
  console.error('  npx tsx scripts/etl/fetch-cotrex.ts');
  console.error('  npx tsx scripts/etl/enrich-soil.ts');
  console.error('  npx tsx scripts/etl/enrich-elevation.ts');
  process.exit(1);
}

// Transform trail data for database insert
function transformForInsert(trail: TrailData) {
  return {
    cotrex_id: trail.cotrex_id,
    name: trail.name,
    system: trail.system || null,
    manager: trail.manager || null,
    geometry: trail.geometry,
    centroid_lat: trail.centroid_lat,
    centroid_lon: trail.centroid_lon,
    elevation_min: trail.elevation_min ?? null,
    elevation_max: trail.elevation_max ?? null,
    elevation_gain: trail.elevation_gain ?? null,
    dominant_aspect: trail.dominant_aspect ?? null,
    soil_drainage_class: trail.soil_drainage_class ?? null,
    canopy_cover_pct: null, // Not implemented yet
    length_miles: trail.length_miles ?? null,
    open_to_bikes: trail.open_to_bikes ?? true,
    base_dry_hours: trail.base_dry_hours ?? 48,
  };
}

// Main seed function
async function seedDatabase(): Promise<void> {
  console.log('🌱 Database Seeder');
  console.log('==================\n');

  const supabase = createSupabaseClient();
  console.log('Connected to Supabase');

  // Find and load data
  const dataFile = findDataFile();
  console.log(`Loading data from: ${path.basename(dataFile)}`);
  
  const rawData: TrailsData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const trails = rawData.trails;
  console.log(`Found ${trails.length} trails\n`);

  // Filter for bike-accessible trails only (optional)
  const bikeTrails = trails.filter((t) => t.open_to_bikes);
  console.log(`Bike-accessible trails: ${bikeTrails.length}`);

  // Upsert in batches
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ cotrex_id: string; error: string }> = [];

  const totalBatches = Math.ceil(bikeTrails.length / BATCH_SIZE);
  
  for (let i = 0; i < bikeTrails.length; i += BATCH_SIZE) {
    const batch = bikeTrails.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    process.stdout.write(`Batch ${batchNum}/${totalBatches}: `);
    
    const records = batch.map(transformForInsert);
    
    const { data, error } = await supabase
      .from('trails')
      .upsert(records, {
        onConflict: 'cotrex_id',
        ignoreDuplicates: false,
      })
      .select('id');
    
    if (error) {
      console.log(`✗ Error: ${error.message}`);
      errorCount += batch.length;
      for (const trail of batch) {
        errors.push({ cotrex_id: trail.cotrex_id, error: error.message });
      }
    } else {
      successCount += batch.length;
      console.log(`✓ ${batch.length} trails`);
    }
  }

  // Verify count
  const { count, error: countError } = await supabase
    .from('trails')
    .select('*', { count: 'exact', head: true });

  console.log('\n==================');
  console.log('✅ Seeding complete!');
  console.log(`\nResults:`);
  console.log(`  Inserted/Updated: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  
  if (countError) {
    console.log(`  Database count: Error - ${countError.message}`);
  } else {
    console.log(`  Total in database: ${count}`);
  }

  if (errors.length > 0) {
    console.log(`\nFirst 5 errors:`);
    for (const err of errors.slice(0, 5)) {
      console.log(`  ${err.cotrex_id}: ${err.error}`);
    }
  }

  // Sample some data to verify
  const { data: samples } = await supabase
    .from('trails')
    .select('name, centroid_lat, centroid_lon, soil_drainage_class')
    .limit(5);

  if (samples && samples.length > 0) {
    console.log(`\nSample trails in database:`);
    for (const s of samples) {
      console.log(`  - ${s.name} (${s.centroid_lat.toFixed(2)}, ${s.centroid_lon.toFixed(2)})`);
    }
  }
}

// Run
seedDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
