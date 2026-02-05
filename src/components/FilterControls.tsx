'use client';

import { TrailCondition, CONDITION_LABELS, CONDITION_COLORS } from '@/lib/types';
import { REGIONS } from '@/lib/predictions';
import { Check, X, Filter, ChevronDown } from 'lucide-react';

interface FilterControlsProps {
  selectedConditions: TrailCondition[];
  onConditionsChange: (conditions: TrailCondition[]) => void;
  selectedRegion: string | null;
  onRegionChange: (region: string | null) => void;
  stats?: {
    total: number;
    rideable: number;
    likely_rideable: number;
    likely_muddy: number;
    muddy: number;
    snow: number;
    unknown: number;
  };
}

const CONDITIONS: TrailCondition[] = [
  'rideable',
  'likely_rideable',
  'likely_muddy',
  'muddy',
  'snow',
];

export function FilterControls({
  selectedConditions,
  onConditionsChange,
  selectedRegion,
  onRegionChange,
  stats,
}: FilterControlsProps) {
  const toggleCondition = (condition: TrailCondition) => {
    if (selectedConditions.includes(condition)) {
      onConditionsChange(selectedConditions.filter((c) => c !== condition));
    } else {
      onConditionsChange([...selectedConditions, condition]);
    }
  };

  const selectAll = () => {
    onConditionsChange(CONDITIONS);
  };

  const selectGoodOnly = () => {
    onConditionsChange(['rideable', 'likely_rideable']);
  };

  return (
    <div className="space-y-5">
      {/* Condition filters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Trail Conditions
          </h3>
          <div className="flex gap-2">
            <button
              onClick={selectGoodOnly}
              className="text-xs font-medium text-green-500 hover:text-green-400 transition-colors"
            >
              Good only
            </button>
            <span className="text-[var(--foreground-muted)]">·</span>
            <button
              onClick={selectAll}
              className="text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              All
            </button>
          </div>
        </div>
        
        {/* Condition filters — one per line */}
        <div className="flex flex-col gap-2">
          {CONDITIONS.map((condition) => {
            const isSelected = selectedConditions.includes(condition);
            const count = stats?.[condition] ?? 0;
            const color = CONDITION_COLORS[condition];
            
            return (
              <button
                key={condition}
                onClick={() => toggleCondition(condition)}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-150 border
                  ${isSelected 
                    ? 'border-transparent shadow-sm' 
                    : 'border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:border-[var(--border-strong)]'
                  }
                `}
                style={isSelected ? {
                  backgroundColor: `${color}20`,
                  color: color,
                  borderColor: `${color}40`,
                } : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1 text-left">{CONDITION_LABELS[condition]}</span>
                <span className={`text-xs ${isSelected ? 'opacity-70' : 'text-[var(--foreground-muted)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Region filter */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
          Region
        </h3>
        <div className="relative">
          <select
            value={selectedRegion || 'all'}
            onChange={(e) =>
              onRegionChange(e.target.value === 'all' ? null : e.target.value)
            }
            className="
              w-full appearance-none cursor-pointer
              bg-[var(--background-secondary)] text-[var(--foreground)]
              rounded-lg px-4 py-2.5 pr-10 text-sm
              border border-[var(--border)]
              focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none
              transition-colors
            "
          >
            <option value="all">All Colorado</option>
            {Object.entries(REGIONS).map(([id]) => (
              <option key={id} value={id}>
                {id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--foreground-muted)]">Showing</span>
            <span className="font-semibold text-[var(--foreground)]">
              {selectedConditions.length > 0 
                ? selectedConditions.reduce((sum, c) => sum + (stats[c] ?? 0), 0)
                : stats.total
              } of {stats.total} trails
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile-friendly modal version
export function MobileFilterControls(props: FilterControlsProps & { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={props.onClose}
      />
      
      {/* Panel */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-[var(--surface)] rounded-t-2xl animate-slide-up overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[var(--foreground-muted)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Filters</h2>
          </div>
          <button
            onClick={props.onClose}
            className="p-2 rounded-lg hover:bg-[var(--background-secondary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--foreground-muted)]" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <FilterControls {...props} />
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
          <button
            onClick={props.onClose}
            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
