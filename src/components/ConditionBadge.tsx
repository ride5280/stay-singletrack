'use client';

import { TrailCondition, CONDITION_COLORS, CONDITION_LABELS } from '@/lib/types';
import { Circle, CheckCircle, AlertCircle, XCircle, Snowflake, HelpCircle, Ban } from 'lucide-react';

interface ConditionBadgeProps {
  condition: TrailCondition;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Icon mapping for conditions
const CONDITION_ICONS: Record<TrailCondition, React.ComponentType<{ className?: string }>> = {
  rideable: CheckCircle,
  likely_rideable: Circle,
  likely_muddy: AlertCircle,
  muddy: XCircle,
  snow: Snowflake,
  closed: Ban,
  unknown: HelpCircle,
};

export function ConditionBadge({ 
  condition, 
  size = 'md',
  showLabel = true 
}: ConditionBadgeProps) {
  const color = CONDITION_COLORS[condition];
  const label = CONDITION_LABELS[condition];
  const Icon = CONDITION_ICONS[condition];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && label}
    </span>
  );
}

// Icon-only version for compact displays
export function ConditionIcon({ condition, className = 'w-5 h-5' }: { condition: TrailCondition; className?: string }) {
  const Icon = CONDITION_ICONS[condition];
  const color = CONDITION_COLORS[condition];
  
  return (
    <span style={{ color }} aria-label={CONDITION_LABELS[condition]}>
      <Icon className={className} />
    </span>
  );
}
