import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting: simple in-memory store (for demo; use Redis in production)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 reports per hour per IP

function getRateLimitKey(ip: string, trailId: number): string {
  return `${ip}:${trailId}`;
}

function isRateLimited(ip: string, trailId: number): boolean {
  const key = getRateLimitKey(ip, trailId);
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    return false;
  }
  
  return entry.count >= RATE_LIMIT_MAX;
}

function incrementRateLimit(ip: string, trailId: number): void {
  const key = getRateLimitKey(ip, trailId);
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
  } else {
    entry.count++;
  }
}

// Hash IP for privacy
function hashIP(ip: string): string {
  // Simple hash - in production use proper crypto
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Parse request body
    const body = await request.json();
    const { trail_id, condition, notes } = body;
    
    // Validate required fields
    if (!trail_id || !condition) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate condition value
    const validConditions = ['dry', 'tacky', 'muddy', 'snow'];
    if (!validConditions.includes(condition)) {
      return NextResponse.json(
        { success: false, message: 'Invalid condition value' },
        { status: 400 }
      );
    }
    
    // Check rate limit
    if (isRateLimited(ip, trail_id)) {
      return NextResponse.json(
        { success: false, message: 'Too many reports. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Insert report
    const { error } = await supabase
      .from('condition_reports')
      .insert({
        trail_id,
        condition,
        notes: notes || null,
        ip_hash: hashIP(ip),
        reported_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error inserting report:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to save report' },
        { status: 500 }
      );
    }
    
    // Update rate limit
    incrementRateLimit(ip, trail_id);
    
    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
    });
  } catch (error) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
