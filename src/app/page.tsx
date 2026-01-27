'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PredictionsData, TrailCondition } from '@/lib/types';
import { calculateStats, filterByCondition, filterByRegion, formatTimeSince } from '@/lib/predictions';
import { FilterControls, MobileFilterControls } from '@/components/FilterControls';
import { MapLegend } from '@/components/TrailMap';
import { TrailCard } from '@/components/TrailCard';

// Dynamic import for the map (no SSR since Leaflet needs window)
const TrailMap = dynamic(
  () => import('@/components/TrailMap').then((mod) => mod.TrailMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
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
  const [showList, setShowList] = useState(false);

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
      <div className="h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading trail conditions...</p>
        </div>
      </div>
    );
  }

  if (error || !predictions) {
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-4xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Trail Data Unavailable
          </h2>
          <p className="text-gray-400 mb-4">
            {error || 'Unable to load trail predictions. This might be the first time running the app.'}
          </p>
          <p className="text-sm text-gray-500">
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
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* Top bar with stats */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">
            Updated {formatTimeSince(predictions.generated_at)}
          </span>
          <span className="hidden sm:inline text-gray-600">|</span>
          <span className="hidden sm:inline">
            <span className="text-green-400">{stats.rideable + stats.likely_rideable}</span>
            <span className="text-gray-400"> rideable</span>
          </span>
          <span className="hidden sm:inline text-gray-600">|</span>
          <span className="hidden sm:inline">
            <span className="text-gray-300">{predictions.total_trails}</span>
            <span className="text-gray-400"> total trails</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-1 px-3 py-1 bg-gray-700 rounded text-gray-300 hover:bg-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
          
          {/* List toggle */}
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 rounded text-gray-300 hover:bg-gray-600"
          >
            {showList ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block w-72 bg-gray-850 border-r border-gray-700 p-4 overflow-y-auto">
          <FilterControls
            selectedConditions={selectedConditions}
            onConditionsChange={setSelectedConditions}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            stats={stats}
          />
          
          <div className="mt-4">
            <MapLegend />
          </div>
        </aside>

        {/* Map or List view */}
        <main className="flex-1 relative">
          {showList ? (
            <div className="h-full overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto space-y-3">
                <div className="text-sm text-gray-400 mb-4">
                  Showing {filteredTrails.length} trails
                </div>
                {filteredTrails.map((trail) => (
                  <TrailCard key={trail.id} trail={trail} />
                ))}
                {filteredTrails.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    No trails match your filters
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
          {!showList && (
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
