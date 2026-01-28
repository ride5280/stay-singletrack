'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PredictionsData, TrailCondition } from '@/lib/types';
import { calculateStats, filterByCondition, filterByRegion, formatTimeSince } from '@/lib/predictions';
import { FilterControls, MobileFilterControls } from '@/components/FilterControls';
import { MapLegend } from '@/components/TrailMap';
import { TrailCard, TrailCardSkeleton } from '@/components/TrailCard';
import { 
  Filter, 
  Map, 
  List, 
  RefreshCw, 
  CheckCircle,
  Construction,
  Bike
} from 'lucide-react';

// Dynamic import for the map (no SSR since Leaflet needs window)
const TrailMap = dynamic(
  () => import('@/components/TrailMap').then((mod) => mod.TrailMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[var(--background-secondary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
          <span className="text-sm text-[var(--foreground-muted)]">Loading map...</span>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [selectedConditions, setSelectedConditions] = useState<TrailCondition[]>([
    'rideable',
    'likely_rideable',
    'likely_muddy',
    'muddy',
  ]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Load predictions
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/predictions.json');
        if (!response.ok) {
          throw new Error('Failed to load predictions');
        }
        const data = await response.json();
        setPredictions(data);
      } catch (err) {
        console.error('Error loading predictions:', err);
        setError('Unable to load trail data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
            <Bike className="absolute inset-0 m-auto w-6 h-6 text-green-500" />
          </div>
          <p className="text-[var(--foreground-muted)]">Loading trail conditions...</p>
        </div>
      </div>
    );
  }

  if (error || !predictions) {
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center bg-[var(--background)]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Construction className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
            Trail Data Unavailable
          </h2>
          <p className="text-[var(--foreground-muted)] mb-4">
            {error || 'Unable to load trail predictions. This might be the first time running the app.'}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            Run the daily prediction scripts to generate trail data.
          </p>
        </div>
      </div>
    );
  }

  // Apply filters
  let filteredTrails = predictions.trails;
  if (selectedConditions.length > 0) {
    filteredTrails = filterByCondition(filteredTrails, selectedConditions);
  }
  if (selectedRegion) {
    filteredTrails = filterByRegion(filteredTrails, selectedRegion);
  }

  const stats = calculateStats(predictions.trails);
  const filteredStats = calculateStats(filteredTrails);

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-[var(--background)]">
      {/* Top bar with stats */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{formatTimeSince(predictions.generated_at)}</span>
          </div>
          <span className="hidden sm:inline h-4 w-px bg-[var(--border)]" />
          <div className="hidden sm:flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-500 font-medium">{stats.rideable + stats.likely_rideable}</span>
            <span className="text-[var(--foreground-muted)]">rideable</span>
          </div>
          <span className="hidden sm:inline h-4 w-px bg-[var(--border)]" />
          <span className="hidden sm:inline text-[var(--foreground-muted)]">
            <span className="text-[var(--foreground)] font-medium">{predictions.total_trails}</span> total
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          
          {/* View toggle */}
          <div className="flex rounded-lg bg-[var(--background-secondary)] p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block w-80 bg-[var(--surface)] border-r border-[var(--border)] p-5 overflow-y-auto">
          <FilterControls
            selectedConditions={selectedConditions}
            onConditionsChange={setSelectedConditions}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            stats={stats}
          />
          
          <div className="mt-6">
            <MapLegend />
          </div>
        </aside>

        {/* Map or List view */}
        <main className="flex-1 relative">
          {viewMode === 'list' ? (
            <div className="h-full overflow-y-auto p-4 bg-[var(--background)]">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    {filteredTrails.length} Trails
                  </h2>
                  <span className="text-sm text-[var(--foreground-muted)]">
                    Sorted by condition
                  </span>
                </div>
                
                <div className="space-y-3">
                  {filteredTrails.map((trail, index) => (
                    <div 
                      key={trail.id} 
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TrailCard trail={trail} />
                    </div>
                  ))}
                </div>
                
                {filteredTrails.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--background-secondary)] flex items-center justify-center">
                      <Filter className="w-8 h-8 text-[var(--foreground-muted)]" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">
                      No trails match your filters
                    </h3>
                    <p className="text-[var(--foreground-muted)]">
                      Try adjusting your filter settings
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <TrailMap
              trails={filteredTrails}
              selectedConditions={selectedConditions}
            />
          )}

          {/* Legend (mobile, on map view) */}
          {viewMode === 'map' && (
            <div className="lg:hidden absolute bottom-4 left-4">
              <MapLegend />
            </div>
          )}
        </main>
      </div>

      {/* Mobile filter modal */}
      {showFilters && (
        <MobileFilterControls
          selectedConditions={selectedConditions}
          onConditionsChange={setSelectedConditions}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          stats={stats}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
