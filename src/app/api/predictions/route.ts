import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // If Supabase isn't configured, return 503 so the client falls back to static files
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured. Using static data.' },
      { status: 503 }
    );
  }
  const searchParams = request.nextUrl.searchParams;
  
  // Optional filters
  const conditions = searchParams.get('conditions')?.split(',') || null;
  const limit = parseInt(searchParams.get('limit') || '1000');
  const offset = parseInt(searchParams.get('offset') || '0');
  const includeGeometry = searchParams.get('geometry') !== 'false';
  const bikeOnly = searchParams.get('bikeOnly') === 'true';
  const q = searchParams.get('q')?.trim() || null;
  
  // Bounding box for map viewport (optional)
  const minLat = searchParams.get('minLat') ? parseFloat(searchParams.get('minLat')!) : null;
  const maxLat = searchParams.get('maxLat') ? parseFloat(searchParams.get('maxLat')!) : null;
  const minLon = searchParams.get('minLon') ? parseFloat(searchParams.get('minLon')!) : null;
  const maxLon = searchParams.get('maxLon') ? parseFloat(searchParams.get('maxLon')!) : null;
  
  try {
    // Build query joining predictions with trails
    const trailFields = includeGeometry
      ? 'name, centroid_lat, centroid_lon, open_to_bikes, geometry'
      : 'name, centroid_lat, centroid_lon, open_to_bikes';
    
    let query = supabase
      .from('trail_predictions')
      .select(`
        id,
        cotrex_id,
        condition,
        confidence,
        hours_since_rain,
        effective_dry_hours,
        factors,
        predicted_at,
        trails!inner (
          ${trailFields}
        )
      `)
      .range(offset, offset + limit - 1);
    
    // Filter by conditions
    if (conditions && conditions.length > 0) {
      query = query.in('condition', conditions);
    }
    
    // Filter by bike-only
    if (bikeOnly) {
      query = query.eq('trails.open_to_bikes', true);
    }
    
    // Filter by bounding box if provided
    if (minLat !== null && maxLat !== null && minLon !== null && maxLon !== null) {
      query = query
        .gte('trails.centroid_lat', minLat)
        .lte('trails.centroid_lat', maxLat)
        .gte('trails.centroid_lon', minLon)
        .lte('trails.centroid_lon', maxLon);
    }

    // Search by trail name (Supabase ilike on joined trails table)
    if (q) {
      query = query.ilike('trails.name', `%${q}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get the latest prediction timestamp
    const { data: meta } = await supabase
      .from('trail_predictions')
      .select('predicted_at')
      .order('predicted_at', { ascending: false })
      .limit(1)
      .single();
    
    // Get total count for summary
    const { count: totalCount } = await supabase
      .from('trail_predictions')
      .select('*', { count: 'exact', head: true });
    
    // Transform data to match expected format
    const trails = (data || []).map((p: any) => ({
      id: p.id,
      cotrex_id: p.cotrex_id,
      name: p.trails.name,
      centroid_lat: p.trails.centroid_lat,
      centroid_lon: p.trails.centroid_lon,
      open_to_bikes: p.trails.open_to_bikes ?? false,
      condition: p.condition,
      confidence: p.confidence,
      hours_since_rain: p.hours_since_rain,
      effective_dry_hours: p.effective_dry_hours,
      factors: p.factors,
      ...(includeGeometry && p.trails.geometry ? { geometry: p.trails.geometry } : {}),
    }));
    
    // Build summary from returned data
    const summary = trails.reduce((acc: any, t: any) => {
      acc[t.condition] = (acc[t.condition] || 0) + 1;
      return acc;
    }, {});
    
    return NextResponse.json({
      generated_at: meta?.predicted_at || new Date().toISOString(),
      region: 'Colorado',
      total_trails: totalCount || trails.length,
      summary,
      trails,
      pagination: {
        offset,
        limit,
        returned: trails.length,
      },
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
