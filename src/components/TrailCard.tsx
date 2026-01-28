'use client';

import Link from 'next/link';
import { TrailPrediction } from '@/lib/types';
import { ConditionBadge } from './ConditionBadge';
import { Clock, Mountain, Compass, ArrowRight } from 'lucide-react';

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
        className="block p-3 card hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--foreground)] truncate flex-1 mr-2">
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
      className="block card p-4 hover:scale-[1.005] active:scale-[0.995] transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-[var(--foreground)] text-lg leading-tight group-hover:text-green-500 transition-colors">
          {trail.name}
        </h3>
        <ConditionBadge condition={trail.condition} />
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
          <div className="w-4 h-4 flex items-center justify-center">
            <div 
              className="w-2 h-2 rounded-full bg-green-500"
              style={{ opacity: trail.confidence / 100 }}
            />
          </div>
          <span>
            <span className="text-[var(--foreground)] font-medium">{trail.confidence}%</span>
            {' '}confident
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
          <Clock className="w-4 h-4 text-[var(--foreground-muted)]" />
          <span>
            Rain{' '}
            <span className="text-[var(--foreground)] font-medium">
              {trail.hours_since_rain < 24
                ? `${trail.hours_since_rain}h`
                : `${Math.round(trail.hours_since_rain / 24)}d`}
            </span>
            {' '}ago
          </span>
        </div>
        
        {elevationFt && (
          <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
            <Mountain className="w-4 h-4 text-[var(--foreground-muted)]" />
            <span className="text-[var(--foreground)] font-medium">
              {elevationFt.toLocaleString()}'
            </span>
          </div>
        )}
        
        {trail.factors.aspect && (
          <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
            <Compass className="w-4 h-4 text-[var(--foreground-muted)]" />
            <span>
              <span className="text-[var(--foreground)] font-medium">{trail.factors.aspect}</span>
              -facing
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--foreground-muted)]">
          {trail.factors.soil || 'Unknown soil'} · Dries in ~{trail.effective_dry_hours}h
        </span>
        <ArrowRight className="w-4 h-4 text-[var(--foreground-muted)] group-hover:text-green-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

// Skeleton loader for trail cards
export function TrailCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-4 w-16" />
        <div className="skeleton h-4 w-20" />
      </div>
      <div className="pt-3 border-t border-[var(--border)]">
        <div className="skeleton h-3 w-40" />
      </div>
    </div>
  );
}
