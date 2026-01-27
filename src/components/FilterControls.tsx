'use client';

import { TrailCondition, CONDITION_LABELS, CONDITION_COLORS } from '@/lib/types';
import { REGIONS } from '@/lib/predictions';

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

  const selectRideableOnly = () => {
    onConditionsChange(['rideable', 'likely_rideable']);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Condition filters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Trail Conditions</h3>
          <div className="space-x-2">
            <button
              onClick={selectRideableOnly}
              className="text-xs text-green-400 hover:text-green-300"
            >
              Rideable only
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={selectAll}
              className="text-xs text-gray-400 hover:text-gray-300"
            >
              Show all
            </button>
          </div>
        </div>
        
        <div className="space-y-1">
          {CONDITIONS.map((condition) => {
            const isSelected = selectedConditions.includes(condition);
            const count = stats?.[condition] ?? 0;
            
            return (
              <label
                key={condition}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCondition(condition)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-transparent'
                      : 'border-gray-600 group-hover:border-gray-500'
                  }`}
                  style={{
                    backgroundColor: isSelected ? CONDITION_COLORS[condition] : 'transparent',
                  }}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isSelected ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {CONDITION_LABELS[condition]}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Region filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Region</h3>
        <select
          value={selectedRegion || 'all'}
          onChange={(e) =>
            onRegionChange(e.target.value === 'all' ? null : e.target.value)
          }
          className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
        >
          <option value="all">All Colorado</option>
          {Object.entries(REGIONS).map(([id]) => (
            <option key={id} value={id}>
              {id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Showing {selectedConditions.length > 0 
              ? selectedConditions.reduce((sum, c) => sum + (stats[c] ?? 0), 0)
              : stats.total
            } of {stats.total} trails
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile-friendly collapsible version
export function MobileFilterControls(props: FilterControlsProps & { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur">
      <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <button
            onClick={props.onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <FilterControls {...props} />
        <button
          onClick={props.onClose}
          className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
