import { PredictionsData, TrailPrediction, TrailCondition } from './types';

// Load predictions from static JSON file
export async function loadPredictions(): Promise<PredictionsData | null> {
  try {
    // In production, this is served from CDN
    // In development, it's from public/data/predictions.json
    const response = await fetch('/data/predictions.json');
    
    if (!response.ok) {
      console.error('Failed to load predictions:', response.status);
      return null;
    }
    
    const data: PredictionsData = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading predictions:', error);
    return null;
  }
}

// Get predictions filtered by condition
export function filterByCondition(
  predictions: TrailPrediction[],
  conditions: TrailCondition[]
): TrailPrediction[] {
  return predictions.filter((trail) => conditions.includes(trail.condition));
}

// Get predictions filtered by region (based on lat/lon bounds)
export interface RegionBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export const REGIONS: Record<string, RegionBounds> = {
  front_range: {
    north: 40.5,
    south: 39.3,
    east: -104.5,
    west: -105.7,
  },
  boulder: {
    north: 40.15,
    south: 39.9,
    east: -105.1,
    west: -105.5,
  },
  golden: {
    north: 39.85,
    south: 39.65,
    east: -105.1,
    west: -105.35,
  },
  denver: {
    north: 39.85,
    south: 39.6,
    east: -104.8,
    west: -105.15,
  },
};

export function filterByRegion(
  predictions: TrailPrediction[],
  regionName: string
): TrailPrediction[] {
  const bounds = REGIONS[regionName];
  if (!bounds) return predictions;

  return predictions.filter((trail) => {
    return (
      trail.centroid_lat >= bounds.south &&
      trail.centroid_lat <= bounds.north &&
      trail.centroid_lon >= bounds.west &&
      trail.centroid_lon <= bounds.east
    );
  });
}

// Client-side search by trail name (substring match, all words must appear)
export function filterBySearch(
  predictions: TrailPrediction[],
  query: string
): TrailPrediction[] {
  const q = query.trim().toLowerCase();
  if (!q) return predictions;
  const words = q.split(/\s+/).filter(Boolean);
  return predictions.filter((trail) => {
    const name = (trail.name || '').toLowerCase();
    return words.every((word) => name.includes(word));
  });
}

// Calculate summary stats
export interface PredictionStats {
  total: number;
  rideable: number;
  likely_rideable: number;
  likely_muddy: number;
  muddy: number;
  snow: number;
  closed: number;
  unknown: number;
}

export function calculateStats(predictions: TrailPrediction[]): PredictionStats {
  const stats: PredictionStats = {
    total: predictions.length,
    rideable: 0,
    likely_rideable: 0,
    likely_muddy: 0,
    muddy: 0,
    snow: 0,
    closed: 0,
    unknown: 0,
  };

  for (const trail of predictions) {
    if (trail.condition in stats) {
      stats[trail.condition as keyof Omit<PredictionStats, 'total'>]++;
    }
  }

  return stats;
}

// Format relative time since generation
export function formatTimeSince(dateString: string): string {
  const generated = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - generated.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}
