/**
 * Fetch daily weather data from Open-Meteo
 * 
 * Fetches weather for Colorado Front Range regions and stores in weather_cache.
 * Called daily by GitHub Actions.
 * 
 * Usage: npx tsx scripts/daily/fetch-weather.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Open-Meteo API (no API key required!)
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Regions with center coordinates
const REGIONS: Record<string, { lat: number; lon: number; name: string; elevation_m: number }> = {
  front_range: { lat: 39.75, lon: -105.2, name: 'Front Range', elevation_m: 1800 },
  boulder: { lat: 40.015, lon: -105.27, name: 'Boulder', elevation_m: 1655 },
  golden: { lat: 39.75, lon: -105.22, name: 'Golden', elevation_m: 1730 },
  denver: { lat: 39.74, lon: -104.99, name: 'Denver', elevation_m: 1609 },
  colorado_springs: { lat: 38.83, lon: -104.82, name: 'Colorado Springs', elevation_m: 1839 },
  fort_collins: { lat: 40.58, lon: -105.08, name: 'Fort Collins', elevation_m: 1525 },
  summit_county: { lat: 39.6, lon: -106.0, name: 'Summit County', elevation_m: 2926 },
  leadville: { lat: 39.25, lon: -106.29, name: 'Leadville', elevation_m: 3094 },
  aspen: { lat: 39.19, lon: -106.82, name: 'Aspen', elevation_m: 2438 },
  durango: { lat: 37.28, lon: -107.88, name: 'Durango', elevation_m: 2003 },
  steamboat: { lat: 40.48, lon: -106.83, name: 'Steamboat Springs', elevation_m: 2051 },
  gunnison: { lat: 38.55, lon: -106.93, name: 'Gunnison', elevation_m: 2347 },
  telluride: { lat: 37.94, lon: -107.81, name: 'Telluride', elevation_m: 2667 },
};

interface WeatherDay {
  date: string;
  precipitation_mm: number;
  temp_max_c: number;
  temp_min_c: number;
  humidity_pct: number;
}

interface OpenMeteoResponse {
  daily: {
    time: string[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    relative_humidity_2m_mean?: number[];
  };
}

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

// Fetch weather for a region
async function fetchWeatherForRegion(
  regionId: string,
  region: { lat: number; lon: number; name: string }
): Promise<WeatherDay[]> {
  const params = new URLSearchParams({
    latitude: region.lat.toString(),
    longitude: region.lon.toString(),
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean',
    past_days: '7',
    forecast_days: '1',
    timezone: 'America/Denver',
  });

  const url = `${OPEN_METEO_URL}?${params}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data: OpenMeteoResponse = await response.json();
    
    const days: WeatherDay[] = [];
    for (let i = 0; i < data.daily.time.length; i++) {
      days.push({
        date: data.daily.time[i],
        precipitation_mm: data.daily.precipitation_sum[i] ?? 0,
        temp_max_c: data.daily.temperature_2m_max[i],
        temp_min_c: data.daily.temperature_2m_min[i],
        humidity_pct: Math.round(data.daily.relative_humidity_2m_mean?.[i] ?? 50),
      });
    }
    
    return days;
  } catch (error) {
    console.error(`Error fetching weather for ${region.name}:`, error);
    return [];
  }
}

// Main function
async function fetchWeather(): Promise<void> {
  console.log('🌦️  Weather Fetcher');
  console.log('===================\n');

  const supabase = createSupabaseClient();
  console.log('Connected to Supabase\n');

  let totalDays = 0;
  let totalRegions = 0;
  const errors: string[] = [];

  for (const [regionId, region] of Object.entries(REGIONS)) {
    process.stdout.write(`${region.name.padEnd(20)} `);
    
    const days = await fetchWeatherForRegion(regionId, region);
    
    if (days.length === 0) {
      console.log('✗ Failed to fetch');
      errors.push(regionId);
      continue;
    }
    
    // Upsert weather data
    const records = days.map((day) => ({
      region: regionId,
      date: day.date,
      precipitation_mm: day.precipitation_mm,
      temp_max_c: day.temp_max_c,
      temp_min_c: day.temp_min_c,
      humidity_pct: day.humidity_pct,
      fetched_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
      .from('weather_cache')
      .upsert(records, {
        onConflict: 'region,date',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.log(`✗ DB error: ${error.message}`);
      errors.push(regionId);
    } else {
      const precipDays = days.filter((d) => d.precipitation_mm > 0).length;
      const totalPrecip = days.reduce((sum, d) => sum + d.precipitation_mm, 0);
      console.log(`✓ ${days.length} days, ${precipDays} wet (${totalPrecip.toFixed(1)}mm total)`);
      totalDays += days.length;
      totalRegions++;
    }
    
    // Small delay between regions
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n===================');
  console.log('✅ Weather fetch complete!');
  console.log(`\nResults:`);
  console.log(`  Regions updated: ${totalRegions} / ${Object.keys(REGIONS).length}`);
  console.log(`  Total day records: ${totalDays}`);
  
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.join(', ')}`);
  }

  // Show recent weather for main region
  const { data: recent } = await supabase
    .from('weather_cache')
    .select('date, precipitation_mm, temp_max_c')
    .eq('region', 'front_range')
    .order('date', { ascending: false })
    .limit(5);

  if (recent && recent.length > 0) {
    console.log(`\nRecent Front Range weather:`);
    for (const day of recent) {
      const precip = day.precipitation_mm > 0 ? `${day.precipitation_mm}mm 🌧️` : 'dry';
      console.log(`  ${day.date}: ${day.temp_max_c}°C, ${precip}`);
    }
  }
}

// Run
fetchWeather().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
