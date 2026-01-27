'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TrailPrediction, CONDITION_COLORS, CONDITION_LABELS, TrailCondition } from '@/lib/types';
import { ConditionBadge } from './ConditionBadge';
import Link from 'next/link';

// Fix Leaflet default marker icon issue
import 'leaflet/dist/leaflet.css';

// Leaflet icon fix for Next.js
const fixLeafletIcons = () => {
  // @ts-expect-error - Leaflet icon path fix
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
};

interface TrailMapProps {
  trails: TrailPrediction[];
  selectedConditions?: TrailCondition[];
  center?: [number, number];
  zoom?: number;
  onTrailClick?: (trail: TrailPrediction) => void;
}

// Component to handle map interactions
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

export function TrailMap({
  trails,
  selectedConditions,
  center = [40.015, -105.27], // Boulder, CO
  zoom = 10,
  onTrailClick,
}: TrailMapProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<TrailPrediction | null>(null);

  useEffect(() => {
    fixLeafletIcons();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    );
  }

  // Filter trails by selected conditions
  const filteredTrails = selectedConditions
    ? trails.filter((t) => selectedConditions.includes(t.condition))
    : trails;

  // Style function for GeoJSON features
  const getTrailStyle = (condition: TrailCondition) => ({
    color: CONDITION_COLORS[condition],
    weight: 3,
    opacity: 0.8,
  });

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      style={{ background: '#1a1a2e' }}
    >
      <MapController center={center} zoom={zoom} />
      
      {/* Dark map tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Trail lines */}
      {filteredTrails.map((trail) => (
        <GeoJSON
          key={trail.id}
          data={trail.geometry as GeoJSON.Geometry}
          style={() => getTrailStyle(trail.condition)}
          eventHandlers={{
            click: () => {
              setSelectedTrail(trail);
              onTrailClick?.(trail);
            },
            mouseover: (e) => {
              const layer = e.target;
              layer.setStyle({
                weight: 5,
                opacity: 1,
              });
            },
            mouseout: (e) => {
              const layer = e.target;
              layer.setStyle(getTrailStyle(trail.condition));
            },
          }}
        >
          <Popup>
            <TrailPopup trail={trail} />
          </Popup>
        </GeoJSON>
      ))}
    </MapContainer>
  );
}

// Popup content for trail
function TrailPopup({ trail }: { trail: TrailPrediction }) {
  return (
    <div className="min-w-[200px]">
      <h3 className="font-bold text-lg mb-2 text-gray-900">{trail.name}</h3>
      
      <div className="mb-3">
        <ConditionBadge condition={trail.condition} />
      </div>
      
      <div className="text-sm space-y-1 text-gray-700">
        <div>
          <span className="font-medium">Confidence:</span> {trail.confidence}%
        </div>
        <div>
          <span className="font-medium">Last rain:</span>{' '}
          {trail.hours_since_rain < 24
            ? `${trail.hours_since_rain} hours ago`
            : `${Math.round(trail.hours_since_rain / 24)} days ago`}
        </div>
        {trail.factors.elevation_min && (
          <div>
            <span className="font-medium">Elevation:</span>{' '}
            {Math.round(trail.factors.elevation_min * 3.28084).toLocaleString()}'
          </div>
        )}
      </div>
      
      <Link
        href={`/trail/${trail.id}`}
        className="mt-3 block text-center bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
      >
        View Details →
      </Link>
    </div>
  );
}

// Legend component
export function MapLegend() {
  const conditions: TrailCondition[] = ['rideable', 'likely_rideable', 'likely_muddy', 'muddy', 'snow'];
  
  return (
    <div className="bg-gray-800/90 backdrop-blur p-3 rounded-lg shadow-lg">
      <h4 className="text-sm font-semibold text-white mb-2">Trail Conditions</h4>
      <div className="space-y-1">
        {conditions.map((condition) => (
          <div key={condition} className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-1 rounded"
              style={{ backgroundColor: CONDITION_COLORS[condition] }}
            />
            <span className="text-gray-300">{CONDITION_LABELS[condition]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
