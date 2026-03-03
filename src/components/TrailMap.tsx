'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { TrailPrediction, CONDITION_COLORS, CONDITION_LABELS, TrailCondition } from '@/lib/types';
import { ConditionBadge } from './ConditionBadge';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Clock, Mountain, ArrowRight, CheckCircle, Circle, AlertCircle, XCircle, Snowflake, Loader2 } from 'lucide-react';

interface TrailMapProps {
  trails: TrailPrediction[];
  selectedConditions?: TrailCondition[];
  center?: [number, number];
  zoom?: number;
  onTrailClick?: (trail: TrailPrediction) => void;
}

// Tile configuration (must match generate-predictions.ts)
const TILE_SIZE = 0.5; // degrees
const MIN_LAT = 37.0;
const MIN_LON = -109.0;

// Get tile key for a lat/lon
function getTileKey(lat: number, lon: number): string {
  const tileLat = Math.floor((lat - MIN_LAT) / TILE_SIZE) * TILE_SIZE + MIN_LAT;
  const tileLon = Math.floor((lon - MIN_LON) / TILE_SIZE) * TILE_SIZE + MIN_LON;
  return `${tileLat.toFixed(1)}_${tileLon.toFixed(1)}`;
}

// Get all tile keys that intersect with a bounding box
function getTilesInBounds(bounds: { north: number; south: number; east: number; west: number }): string[] {
  const tiles: string[] = [];
  const latStart = Math.floor((bounds.south - MIN_LAT) / TILE_SIZE) * TILE_SIZE + MIN_LAT;
  const latEnd = Math.ceil((bounds.north - MIN_LAT) / TILE_SIZE) * TILE_SIZE + MIN_LAT;
  const lonStart = Math.floor((bounds.west - MIN_LON) / TILE_SIZE) * TILE_SIZE + MIN_LON;
  const lonEnd = Math.ceil((bounds.east - MIN_LON) / TILE_SIZE) * TILE_SIZE + MIN_LON;

  for (let lat = latStart; lat <= latEnd; lat += TILE_SIZE) {
    for (let lon = lonStart; lon <= lonEnd; lon += TILE_SIZE) {
      tiles.push(`${lat.toFixed(1)}_${lon.toFixed(1)}`);
    }
  }
  return tiles;
}

export function TrailMap({
  trails,
  selectedConditions,
  center = [40.015, -105.27], // Boulder, CO
  zoom = 10,
  onTrailClick,
}: TrailMapProps) {
  const [mounted, setMounted] = useState(false);
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: React.ComponentType<any>;
    TileLayer: React.ComponentType<any>;
    GeoJSON: React.ComponentType<any>;
    CircleMarker: React.ComponentType<any>;
    Popup: React.ComponentType<any>;
    useMap: () => any;
  } | null>(null);
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<any>(null);

  // Geometry loading state
  const [loadedGeometries, setLoadedGeometries] = useState<Record<string, object>>({});
  const [loadedTiles, setLoadedTiles] = useState<Set<string>>(new Set());
  const loadingTilesRef = useRef<Set<string>>(new Set());
  const failedTilesRef = useRef<Set<string>>(new Set());

  // Dynamically import Leaflet components only on client
  useEffect(() => {
    const loadLeaflet = async () => {
      // Import Leaflet and react-leaflet
      const L = (await import('leaflet')).default;
      const { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } = await import('react-leaflet');
      
      // Load CSS by adding link element
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Fix Leaflet icon issue
      // @ts-expect-error - Leaflet icon path fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      setMapComponents({ MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap });
      setMounted(true);
    };

    loadLeaflet();
  }, []);

  // Pre-compute which tiles actually have trails (avoid 404s for empty tiles)
  const knownTiles = useMemo(() => {
    const tiles = new Set<string>();
    for (const trail of trails) {
      tiles.add(getTileKey(trail.centroid_lat, trail.centroid_lon));
    }
    return tiles;
  }, [trails]);

  if (!mounted || !MapComponents) {
    return (
      <div className="w-full h-full bg-[var(--background-secondary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          <span className="text-sm text-[var(--foreground-muted)]">Loading map...</span>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } = MapComponents;

  // Component to fit map bounds to trail geometries or centroids
  function FitBounds({ trails: boundsTrails }: { trails: TrailPrediction[] }) {
    const map = useMap();
    useEffect(() => {
      if (boundsTrails.length === 0) return;
      const L = require('leaflet');
      const bounds = L.latLngBounds([]);
      boundsTrails.forEach((t) => {
        if (t.geometry) {
          try {
            const geoLayer = L.geoJSON(t.geometry as GeoJSON.Geometry);
            bounds.extend(geoLayer.getBounds());
          } catch { /* skip invalid geometry */ }
        } else if (t.centroid_lat && t.centroid_lon) {
          bounds.extend(L.latLng(t.centroid_lat, t.centroid_lon));
        }
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    }, [map, boundsTrails]);
    // Also invalidate size after mount (fixes mobile container sizing)
    useEffect(() => {
      setTimeout(() => map.invalidateSize(), 100);
    }, [map]);
    return null;
  }

  // Component to load geometries based on viewport
  function ViewportGeometryLoader() {
    const map = useMap();

    useEffect(() => {
      const loadVisibleTiles = async () => {
        const bounds = map.getBounds();
        const viewportBounds = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        };

        const requiredTiles = getTilesInBounds(viewportBounds).filter(t => knownTiles.has(t));

        // Load tiles that haven't been loaded yet
        for (const tileKey of requiredTiles) {
          if (loadedTiles.has(tileKey) || loadingTilesRef.current.has(tileKey) || failedTilesRef.current.has(tileKey)) {
            continue; // Already loaded, loading, or known-empty
          }

          loadingTilesRef.current.add(tileKey);

          try {
            const response = await fetch(`/data/geo/${tileKey}.json`, {
              cache: 'force-cache', // Cache geo tiles aggressively
            });

            if (response.ok) {
              const tileGeometries = await response.json();
              setLoadedGeometries((prev) => ({ ...prev, ...tileGeometries }));
              setLoadedTiles((prev) => new Set([...prev, tileKey]));
            } else {
              // 404 = no trails in this tile, mark as failed so we don't retry
              failedTilesRef.current.add(tileKey);
            }
          } catch (err) {
            failedTilesRef.current.add(tileKey);
          } finally {
            loadingTilesRef.current.delete(tileKey);
          }
        }
      };

      // Load tiles on initial mount and when map moves/zooms
      loadVisibleTiles();

      const handleMoveEnd = () => {
        loadVisibleTiles();
      };

      map.on('moveend', handleMoveEnd);

      return () => {
        map.off('moveend', handleMoveEnd);
      };
    }, [map, loadedTiles]);

    return null;
  }

  // Filter trails by selected conditions
  const filteredTrails = selectedConditions
    ? trails.filter((t) => selectedConditions.includes(t.condition))
    : trails;

  // Style function for GeoJSON features
  const getTrailStyle = (condition: TrailCondition) => ({
    color: CONDITION_COLORS[condition],
    weight: 3,
    opacity: condition === 'closed' ? 0.5 : 0.8,
    dashArray: condition === 'closed' ? '8, 8' : undefined,
  });

  // Choose map tiles based on theme
  const tileUrl = resolvedTheme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      style={{ background: resolvedTheme === 'dark' ? '#1a1511' : '#fafaf9' }}
      ref={mapRef}
    >
      {/* Fit bounds to trails */}
      <FitBounds trails={filteredTrails} />

      {/* Viewport-based geometry loader */}
      <ViewportGeometryLoader />

      {/* Map tiles that match theme */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
      />

      {/* Trail lines with invisible tap targets for mobile */}
      {filteredTrails.map((trail) => {
        // Use loaded geometry from tiles if available, otherwise fall back to trail.geometry
        const geometry = loadedGeometries[trail.cotrex_id] || trail.geometry;

        return (
        <React.Fragment key={trail.id}>
          {geometry ? (
            <>
              {/* Invisible wide hit area for touch */}
              <GeoJSON
                data={geometry as GeoJSON.Geometry}
                style={() => ({
                  color: 'transparent',
                  weight: 20,
                  opacity: 0,
                })}
                eventHandlers={{
                  click: () => {
                    onTrailClick?.(trail);
                  },
                }}
              >
                <Popup>
                  <TrailPopup trail={trail} />
                </Popup>
              </GeoJSON>
              {/* Visible trail line */}
              <GeoJSON
                data={geometry as GeoJSON.Geometry}
                style={() => getTrailStyle(trail.condition)}
                eventHandlers={{
                  click: () => {
                    onTrailClick?.(trail);
                  },
                  mouseover: (e: any) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: 5,
                      opacity: 1,
                    });
                  },
                  mouseout: (e: any) => {
                    const layer = e.target;
                    layer.setStyle(getTrailStyle(trail.condition));
                  },
                }}
              >
                <Popup>
                  <TrailPopup trail={trail} />
                </Popup>
              </GeoJSON>
            </>
          ) : trail.centroid_lat && trail.centroid_lon ? (
            /* Centroid dot fallback when geometry hasn't loaded yet */
            <CircleMarker
              center={[trail.centroid_lat, trail.centroid_lon]}
              radius={5}
              pathOptions={{
                color: CONDITION_COLORS[trail.condition],
                fillColor: CONDITION_COLORS[trail.condition],
                fillOpacity: 0.7,
                weight: 1,
              }}
              eventHandlers={{
                click: () => onTrailClick?.(trail),
              }}
            >
              <Popup>
                <TrailPopup trail={trail} />
              </Popup>
            </CircleMarker>
          ) : null}
        </React.Fragment>
        );
      })}
    </MapContainer>
  );
}

// Popup content for trail
function TrailPopup({ trail }: { trail: TrailPrediction }) {
  return (
    <div className="min-w-[220px] p-1">
      <h3 className="font-bold text-lg mb-2 text-[var(--foreground)]">{trail.name}</h3>
      
      <div className="mb-3">
        <ConditionBadge condition={trail.condition} />
      </div>
      
      <div className="text-sm space-y-2 text-[var(--foreground-secondary)]">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full bg-green-500"
            style={{ opacity: trail.confidence / 100 }}
          />
          <span><strong className="text-[var(--foreground)]">{trail.confidence}%</strong> confident</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--foreground-muted)]" />
          <span>
            Rain{' '}
            {trail.hours_since_rain < 24
              ? `${trail.hours_since_rain} hours`
              : `${Math.round(trail.hours_since_rain / 24)} days`}{' '}
            ago
          </span>
        </div>
        {trail.factors.elevation_min && (
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-[var(--foreground-muted)]" />
            <span>
              {Math.round(trail.factors.elevation_min * 3.28084).toLocaleString()}' elevation
            </span>
          </div>
        )}
      </div>
      
      <Link
        href={`/trail/${trail.id}`}
        className="trail-popup-btn mt-4 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
      >
        View Details
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// Legend component
export function MapLegend() {
  const conditions: { condition: TrailCondition; Icon: React.ComponentType<{ className?: string }> }[] = [
    { condition: 'rideable', Icon: CheckCircle },
    { condition: 'likely_rideable', Icon: Circle },
    { condition: 'likely_muddy', Icon: AlertCircle },
    { condition: 'muddy', Icon: XCircle },
    { condition: 'snow', Icon: Snowflake },
    { condition: 'closed', Icon: AlertCircle },
  ];
  
  return (
    <div className="bg-[var(--surface)]/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-[var(--border)]">
      <h4 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">
        Conditions
      </h4>
      <div className="space-y-1.5">
        {conditions.map(({ condition }) => (
          <div key={condition} className="flex items-center gap-2 text-sm">
            <div
              className="w-5 h-1.5 rounded-full"
              style={{ backgroundColor: CONDITION_COLORS[condition] }}
            />
            <span className="text-[var(--foreground-secondary)]">{CONDITION_LABELS[condition]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
