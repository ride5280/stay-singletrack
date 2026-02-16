/**
 * Local Development Seed Script
 * 
 * Generates sample static data files for local development WITHOUT Supabase.
 * Uses a small subset of real Colorado trails with realistic predictions.
 * 
 * Usage: npx tsx scripts/local-seed.ts
 * 
 * This creates/updates files in public/data/ that the frontend reads.
 * No database, no API keys, no environment variables needed.
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Sample trails with real Colorado coordinates and realistic data
const SAMPLE_TRAILS = [
  {
    id: 1, cotrex_id: 'sample_marshall_mesa',
    name: 'Marshall Mesa Trail', centroid_lat: 39.9528, centroid_lon: -105.2233,
    open_to_bikes: true, elevation_min: 1750, elevation_max: 1890,
    soil_drainage_class: 'Well drained', dominant_aspect: 'S',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.225, 39.951], [-105.223, 39.953], [-105.220, 39.954]] },
  },
  {
    id: 2, cotrex_id: 'sample_betasso',
    name: 'Betasso Preserve - Canyon Loop', centroid_lat: 40.0183, centroid_lon: -105.3455,
    open_to_bikes: true, elevation_min: 1950, elevation_max: 2100,
    soil_drainage_class: 'Well drained', dominant_aspect: 'SE',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.348, 40.016], [-105.345, 40.018], [-105.343, 40.020]] },
  },
  {
    id: 3, cotrex_id: 'sample_walker_ranch',
    name: 'Walker Ranch Loop', centroid_lat: 39.9577, centroid_lon: -105.3530,
    open_to_bikes: true, elevation_min: 2000, elevation_max: 2350,
    soil_drainage_class: 'Moderately well drained', dominant_aspect: 'N',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.356, 39.955], [-105.353, 39.957], [-105.350, 39.959]] },
  },
  {
    id: 4, cotrex_id: 'sample_apex',
    name: 'Apex Trail', centroid_lat: 39.7340, centroid_lon: -105.2270,
    open_to_bikes: true, elevation_min: 1830, elevation_max: 2290,
    soil_drainage_class: 'Well drained', dominant_aspect: 'E',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.229, 39.732], [-105.227, 39.734], [-105.225, 39.736]] },
  },
  {
    id: 5, cotrex_id: 'sample_mt_falcon',
    name: 'Mount Falcon - Castle Trail', centroid_lat: 39.6445, centroid_lon: -105.2350,
    open_to_bikes: true, elevation_min: 2050, elevation_max: 2330,
    soil_drainage_class: 'Well drained', dominant_aspect: 'SW',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.237, 39.643], [-105.235, 39.645], [-105.233, 39.646]] },
  },
  {
    id: 6, cotrex_id: 'sample_brainard_lake',
    name: 'Brainard Lake - Waldrop Trail', centroid_lat: 40.0780, centroid_lon: -105.5700,
    open_to_bikes: false, elevation_min: 3100, elevation_max: 3400,
    soil_drainage_class: 'Poorly drained', dominant_aspect: 'N',
    access: 'seasonally',
    geometry: { type: 'LineString' as const, coordinates: [[-105.572, 40.076], [-105.570, 40.078], [-105.568, 40.080]] },
  },
  {
    id: 7, cotrex_id: 'sample_south_boulder_creek',
    name: 'South Boulder Creek Trail', centroid_lat: 39.9487, centroid_lon: -105.2392,
    open_to_bikes: false, elevation_min: 1670, elevation_max: 1720,
    soil_drainage_class: 'Somewhat poorly drained', dominant_aspect: 'E',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.241, 39.947], [-105.239, 39.949], [-105.237, 39.950]] },
  },
  {
    id: 8, cotrex_id: 'sample_heil_valley',
    name: 'Heil Valley Ranch - Wapiti Trail', centroid_lat: 40.1250, centroid_lon: -105.3120,
    open_to_bikes: true, elevation_min: 1830, elevation_max: 2100,
    soil_drainage_class: 'Well drained', dominant_aspect: 'S',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.314, 40.123], [-105.312, 40.125], [-105.310, 40.127]] },
  },
  {
    id: 9, cotrex_id: 'sample_kinglet',
    name: 'Kinglet Trail', centroid_lat: 39.9880, centroid_lon: -105.2890,
    open_to_bikes: true, elevation_min: 1850, elevation_max: 2050,
    soil_drainage_class: 'Well drained', dominant_aspect: 'W',
    access: '4/1-10/31',  // Seasonal closure example
    geometry: { type: 'LineString' as const, coordinates: [[-105.291, 39.986], [-105.289, 39.988], [-105.287, 39.990]] },
  },
  {
    id: 10, cotrex_id: 'sample_rainbow_gulch',
    name: 'Rainbow Gulch Trail', centroid_lat: 39.6240, centroid_lon: -105.4920,
    open_to_bikes: true, elevation_min: 2600, elevation_max: 2900,
    soil_drainage_class: 'Moderately well drained', dominant_aspect: 'NE',
    access: null,
    geometry: { type: 'LineString' as const, coordinates: [[-105.494, 39.622], [-105.492, 39.624], [-105.490, 39.626]] },
  },
];

// Determine condition based on trail properties and current month
function predictCondition(trail: typeof SAMPLE_TRAILS[0]): {
  condition: string;
  confidence: number;
  hours_since_rain: number;
  effective_dry_hours: number;
  factors: Record<string, any>;
} {
  const month = new Date().getMonth() + 1; // 1-12
  const elevationMax = trail.elevation_max;

  // Check seasonal closure
  if (trail.access === 'no') {
    return {
      condition: 'closed', confidence: 100,
      hours_since_rain: 0, effective_dry_hours: 0,
      factors: { reason: 'Permanently closed', access: trail.access },
    };
  }
  if (trail.access && trail.access !== 'seasonally') {
    const match = trail.access.match(/(\d+)\/(\d+)-(\d+)\/(\d+)/);
    if (match) {
      const [, openMonth, , closeMonth] = match.map(Number);
      if (month < openMonth || month > closeMonth) {
        return {
          condition: 'closed', confidence: 95,
          hours_since_rain: 0, effective_dry_hours: 0,
          factors: { reason: 'Seasonal closure', access: trail.access },
        };
      }
    }
  }
  if (trail.access === 'seasonally' && (month >= 11 || month <= 4)) {
    return {
      condition: 'closed', confidence: 80,
      hours_since_rain: 0, effective_dry_hours: 0,
      factors: { reason: 'Seasonal closure', access: trail.access },
    };
  }

  // Snow detection
  if (elevationMax > 3300 && (month >= 11 || month <= 4)) {
    return {
      condition: 'snow', confidence: 90,
      hours_since_rain: 0, effective_dry_hours: 0,
      factors: { soil: trail.soil_drainage_class, aspect: trail.dominant_aspect, elevation_max: elevationMax, elevation_min: trail.elevation_min },
    };
  }

  // Simulate realistic conditions
  const baseDryHours = trail.soil_drainage_class === 'Well drained' ? 24 : trail.soil_drainage_class === 'Moderately well drained' ? 36 : 48;
  const hoursSinceRain = 48 + Math.floor(Math.random() * 120);
  const effectiveDryHours = baseDryHours * (trail.dominant_aspect === 'S' ? 0.6 : trail.dominant_aspect === 'N' ? 1.3 : 1.0);

  let condition: string;
  let confidence: number;
  if (hoursSinceRain > effectiveDryHours * 1.5) {
    condition = 'rideable';
    confidence = 90 + Math.floor(Math.random() * 10);
  } else if (hoursSinceRain > effectiveDryHours) {
    condition = 'likely_rideable';
    confidence = 70 + Math.floor(Math.random() * 15);
  } else if (hoursSinceRain > effectiveDryHours * 0.5) {
    condition = 'likely_muddy';
    confidence = 60 + Math.floor(Math.random() * 15);
  } else {
    condition = 'muddy';
    confidence = 50 + Math.floor(Math.random() * 20);
  }

  return {
    condition, confidence,
    hours_since_rain: hoursSinceRain,
    effective_dry_hours: Math.round(effectiveDryHours),
    factors: {
      soil: trail.soil_drainage_class,
      aspect: trail.dominant_aspect,
      elevation_max: elevationMax,
      elevation_min: trail.elevation_min,
      base_dry_hours: baseDryHours,
      recent_precip_mm: Math.round(Math.random() * 5 * 10) / 10,
    },
  };
}

function main() {
  console.log('🌱 Local Development Seed');
  console.log('========================\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate predictions
  const predictions = SAMPLE_TRAILS.map((trail) => {
    const pred = predictCondition(trail);
    return {
      id: trail.id,
      cotrex_id: trail.cotrex_id,
      name: trail.name,
      centroid_lat: trail.centroid_lat,
      centroid_lon: trail.centroid_lon,
      open_to_bikes: trail.open_to_bikes,
      ...pred,
    };
  });

  const summary = predictions.reduce((acc: Record<string, number>, p) => {
    acc[p.condition] = (acc[p.condition] || 0) + 1;
    return acc;
  }, {});

  const now = new Date().toISOString();

  // Full predictions (with geometry)
  const fullOutput = {
    generated_at: now,
    region: 'Colorado',
    total_trails: predictions.length,
    summary,
    trails: predictions.map((p) => ({
      ...p,
      geometry: SAMPLE_TRAILS.find((t) => t.cotrex_id === p.cotrex_id)!.geometry,
    })),
  };

  // Index (without geometry)
  const indexOutput = {
    generated_at: now,
    region: 'Colorado',
    total_trails: predictions.length,
    summary,
    trails: predictions,
  };

  // Geometry lookup
  const geometries: Record<string, any> = {};
  SAMPLE_TRAILS.forEach((t) => {
    geometries[t.cotrex_id] = t.geometry;
  });

  // Write files
  fs.writeFileSync(path.join(OUTPUT_DIR, 'predictions.json'), JSON.stringify(fullOutput, null, 2));
  console.log(`✅ predictions.json — ${predictions.length} trails`);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'predictions-index.json'), JSON.stringify(indexOutput, null, 2));
  console.log(`✅ predictions-index.json — ${predictions.length} trails (no geometry)`);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'trail-geometries.json'), JSON.stringify(geometries, null, 2));
  console.log(`✅ trail-geometries.json — ${Object.keys(geometries).length} geometries`);

  console.log(`\nSummary: ${JSON.stringify(summary)}`);
  console.log('\n🎉 Local seed complete! Run `npm run dev` to start.');
}

main();
