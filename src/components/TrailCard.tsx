'use client';

import Link from 'next/link';
import { TrailPrediction } from '@/lib/types';
import { ConditionBadge } from './ConditionBadge';

interface TrailCardProps {
  trail: TrailPrediction;
  compact?: boolean;
}

export function TrailCard({ trail, compact = false }: TrailCardProps) {
  const elevationFt = trail.factors.elevation_min 
    ? Math.round(trail.factors.elevation_min * 3.28084)
    : null;
  
  if (compact) {
    return (
      <Link
        href={`/trail/${trail.id}`}
        className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-white truncate flex-1 mr-2">
            {trail.name}
          </span>
          <ConditionBadge condition={trail.condition} size="sm" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/trail/${trail.id}`}
      className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white text-lg">
          {trail.name}
        </h3>
        <ConditionBadge condition={trail.condition} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
        <div>
          <span className="text-gray-500">Confidence:</span>{' '}
          <span className="text-gray-300">{trail.confidence}%</span>
        </div>
        <div>
          <span className="text-gray-500">Last rain:</span>{' '}
          <span className="text-gray-300">
            {trail.hours_since_rain < 24
              ? `${trail.hours_since_rain}h ago`
              : `${Math.round(trail.hours_since_rain / 24)}d ago`}
          </span>
        </div>
        {elevationFt && (
          <div>
            <span className="text-gray-500">Elevation:</span>{' '}
            <span className="text-gray-300">{elevationFt.toLocaleString()}'</span>
          </div>
        )}
        {trail.factors.aspect && (
          <div>
            <span className="text-gray-500">Aspect:</span>{' '}
            <span className="text-gray-300">{trail.factors.aspect}-facing</span>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {trail.factors.soil || 'Unknown soil'} • 
        Dries in ~{trail.effective_dry_hours}h
      </div>
    </Link>
  );
}
