'use client';

import { TrailCondition, CONDITION_COLORS, CONDITION_LABELS } from '@/lib/types';

interface ConditionBadgeProps {
  condition: TrailCondition;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConditionBadge({ 
  condition, 
  size = 'md',
  showLabel = true 
}: ConditionBadgeProps) {
  const color = CONDITION_COLORS[condition];
  const label = CONDITION_LABELS[condition];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className={`rounded-full ${dotSizes[size]}`}
        style={{ backgroundColor: color }}
      />
      {showLabel && label}
    </span>
  );
}

// Emoji version for compact display
export function ConditionEmoji({ condition }: { condition: TrailCondition }) {
  const emojis: Record<TrailCondition, string> = {
    rideable: '🟢',
    likely_rideable: '🟡',
    likely_muddy: '🟠',
    muddy: '🔴',
    snow: '❄️',
    unknown: '⚪',
  };
  
  return <span title={CONDITION_LABELS[condition]}>{emojis[condition]}</span>;
}
