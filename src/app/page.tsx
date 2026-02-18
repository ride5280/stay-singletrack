'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PredictionsData, TrailCondition } from '@/lib/types';
import { calculateStats, filterByCondition, filterByRegion, filterBySearch, formatTimeSince } from '@/lib/predictions';
import { FilterControls, MobileFilterControls } from '@/components/FilterControls';
import { VirtualizedTrailList } from '@/components/VirtualizedTrailList';
import { LandingHero } from '@/components/LandingHero';
import { 
  Filter, 
  Map, 
  List, 
  RefreshCw, 
  CheckCircle,
  Construction,
  TreePine,
  Search
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
  const [bikeOnly, setBikeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [showLanding, setShowLanding] = useState(() => {
    // If user already explored this session, skip landing
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('stay_singletrack_explored');
    }
    return true;
  });
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const [geometryLoaded, setGeometryLoaded] = useState(false);
  
  async function loadData() {
    try {
      // Phase 1: Load predictions WITHOUT geometry from API (fast, paginated)
      const pageSize = 1000;
      let allTrails: any[] = [];
      let offset = 0;
      let metadata: any = null;
      
      while (true) {
        const response = await fetch(
          `/api/predictions?geometry=false&limit=${pageSize}&offset=${offset}`,
          { cache: 'no-store' }
        );
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        if (!metadata) metadata = data;
        allTrails = allTrails.concat(data.trails);
        
        if (data.trails.length < pageSize) break;
        offset += pageSize;
      }
      
      // If API returned no trails (e.g. DB not seeded), fall back to static files
      if (allTrails.length === 0) throw new Error('No trails from API');

      const summary = allTrails.reduce((acc: any, t: any) => {
        acc[t.condition] = (acc[t.condition] || 0) + 1;
        return acc;
      }, {});
      
      setPredictions({
        generated_at: metadata.generated_at,
        region: metadata.region,
        total_trails: allTrails.length,
        summary,
        trails: allTrails,
      });
      setLastFetched(new Date());
      setLoading(false);
      
      // Phase 2: Load geometry in background from static file (simplified, 11MB)
      try {
        const geoResponse = await fetch(`/data/trail-geometries.json`, {
          cache: 'no-store',
        });
        if (geoResponse.ok) {
          const geometries = await geoResponse.json();
          setPredictions((prev) => {
            if (!prev) return prev;
            const updatedTrails = prev.trails.map((trail) => ({
              ...trail,
              geometry: geometries[trail.cotrex_id] || trail.geometry,
            }));
            return { ...prev, trails: updatedTrails };
          });
          setGeometryLoaded(true);
        }
      } catch {
        console.error('Geometry load failed — map will be empty');
      }
    } catch (err) {
      console.error('API failed, trying static fallback:', err);
      try {
        // Fallback to static index + geometry
        const indexResponse = await fetch(`/data/predictions-index.json`, { cache: 'no-store' });
        if (!indexResponse.ok) throw new Error('Static also unavailable');
        const indexData = await indexResponse.json();
        setPredictions(indexData);
        setLastFetched(new Date());
        setLoading(false);
        
        const geoResponse = await fetch(`/data/trail-geometries.json`, { cache: 'no-store' });
        if (geoResponse.ok) {
          const geometries = await geoResponse.json();
          setPredictions((prev) => {
            if (!prev) return prev;
            return { ...prev, trails: prev.trails.map((t) => ({ ...t, geometry: geometries[t.cotrex_id] || t.geometry })) };
          });
          setGeometryLoaded(true);
        }
      } catch {
        setError('Unable to load trail data. Please try again later.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Manual refresh handler
  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  // Handle explore click - scroll to map section
  const handleExplore = () => {
    setShowLanding(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('stay_singletrack_explored', '1');
    }
    // Small delay to allow state update, then scroll
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Show landing page while loading or if user hasn't explored yet
  if (showLanding) {
    const stats = predictions ? {
      total: predictions.total_trails,
      rideable: (predictions.summary?.rideable || 0) + (predictions.summary?.likely_rideable || 0),
    } : undefined;

    return (
      <LandingHero 
        onExplore={handleExplore} 
        stats={stats}
      />
    );
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
            <TreePine className="absolute inset-0 m-auto w-6 h-6 text-green-500" />
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
  if (bikeOnly) {
    filteredTrails = filteredTrails.filter((t) => t.open_to_bikes);
  }
  filteredTrails = filterBySearch(filteredTrails, searchQuery);

  const stats = calculateStats(predictions.trails);
  const filteredStats = calculateStats(filteredTrails);

  return (
    <div ref={mapSectionRef} className="h-[calc(100vh-60px)] flex flex-col bg-[var(--background)]">
      {/* Top bar with stats */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between gap-3 text-sm flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Search by trail name — constrained on mobile so filter/view toggles stay visible */}
          <div className="relative flex-1 min-w-0 max-w-[140px] sm:max-w-[220px] md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search trails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none text-sm"
              aria-label="Search trails by name"
            />
          </div>
          <span className="hidden sm:inline h-4 w-px bg-[var(--border)] flex-shrink-0" />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50 shrink-0"
            title="Refresh predictions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {lastFetched 
                ? `Fetched ${formatTimeSince(lastFetched.toISOString())}`
                : `Synced ${formatTimeSince(predictions.generated_at)}`
              }
            </span>
          </button>
          <span className="hidden sm:inline h-4 w-px bg-[var(--border)]" />
          <div className="hidden sm:flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-500 font-medium">{stats.rideable + stats.likely_rideable}</span>
            <span className="text-[var(--foreground-muted)]">good</span>
          </div>
          <span className="hidden sm:inline h-4 w-px bg-[var(--border)]" />
          <span className="hidden sm:inline text-[var(--foreground-muted)]">
            <span className="text-[var(--foreground)] font-medium">{predictions.total_trails}</span> total
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-sm"
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
            bikeOnly={bikeOnly}
            onBikeOnlyChange={setBikeOnly}
            stats={stats}
          />
        </aside>

        {/* Map and List views — both always mounted, toggled via CSS */}
        <main className="flex-1 relative">
          <div
            className="h-full"
            style={{ display: viewMode === 'list' ? 'block' : 'none' }}
          >
            <VirtualizedTrailList trails={filteredTrails} />
          </div>
          <div
            className="h-full"
            style={{ display: viewMode === 'map' ? 'block' : 'none' }}
          >
            <TrailMap
              trails={filteredTrails}
              selectedConditions={selectedConditions}
            />
          </div>
        </main>
      </div>

      {/* Mobile filter modal */}
      {showFilters && (
        <MobileFilterControls
          selectedConditions={selectedConditions}
          onConditionsChange={setSelectedConditions}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          bikeOnly={bikeOnly}
          onBikeOnlyChange={setBikeOnly}
          stats={stats}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
