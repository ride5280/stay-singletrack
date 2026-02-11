'use client';

import React, { useEffect, useState, useRef } from 'react';
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
    Popup: React.ComponentType<any>;
    useMap: () => any;
  } | null>(null);
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<any>(null);

  // Dynamically import Leaflet components only on client
  useEffect(() => {
    const loadLeaflet = async () => {
      // Import Leaflet and react-leaflet
      const L = (await import('leaflet')).default;
      const { MapContainer, TileLayer, GeoJSON, Popup, useMap } = await import('react-leaflet');
      
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

      setMapComponents({ MapContainer, TileLayer, GeoJSON, Popup, useMap });
      setMounted(true);
    };

    loadLeaflet();
  }, []);

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

  const { MapContainer, TileLayer, GeoJSON, Popup, useMap } = MapComponents;

  // Component to fit map bounds to trail geometries
  function FitBounds({ trails: boundsTrails }: { trails: TrailPrediction[] }) {
    const map = useMap();
    useEffect(() => {
      if (boundsTrails.length === 0) return;
      const L = require('leaflet');
      const bounds = L.latLngBounds([]);
      boundsTrails.forEach((t) => {
        const geoLayer = L.geoJSON(t.geometry as GeoJSON.Geometry);
        bounds.extend(geoLayer.getBounds());
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

      {/* Map tiles that match theme */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
      />

      {/* Trail lines with invisible tap targets for mobile */}
      {filteredTrails.map((trail) => (
        <React.Fragment key={trail.id}>
          {/* Invisible wide hit area for touch */}
          <GeoJSON
            data={trail.geometry as GeoJSON.Geometry}
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
            data={trail.geometry as GeoJSON.Geometry}
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
        </React.Fragment>
      ))}
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
