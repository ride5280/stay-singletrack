'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { TrailPrediction, CONDITION_LABELS, ASPECT_MODIFIERS } from '@/lib/types';
import { ConditionBadge } from '@/components/ConditionBadge';

// Dynamic import for the mini map
const TrailMap = dynamic(
  () => import('@/components/TrailMap').then((mod) => mod.TrailMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading map...</div>
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TrailDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [trail, setTrail] = useState<TrailPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    async function loadTrail() {
      try {
        const response = await fetch('/data/predictions.json');
        if (!response.ok) throw new Error('Failed to load');
        
        const data = await response.json();
        const found = data.trails.find(
          (t: TrailPrediction) => t.id.toString() === id
        );
        
        setTrail(found || null);
      } catch (error) {
        console.error('Error loading trail:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadTrail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">Trail Not Found</h2>
          <p className="text-gray-400 mb-4">
            We couldn&apos;t find this trail in our database.
          </p>
          <Link
            href="/"
            className="text-green-400 hover:text-green-300"
          >
            ← Back to map
          </Link>
        </div>
      </div>
    );
  }

  const elevationMinFt = trail.factors.elevation_min
    ? Math.round(trail.factors.elevation_min * 3.28084)
    : null;
  const elevationMaxFt = trail.factors.elevation_max
    ? Math.round(trail.factors.elevation_max * 3.28084)
    : null;

  const aspectExplanation = trail.factors.aspect
    ? ASPECT_MODIFIERS[trail.factors.aspect] < 1
      ? 'dries faster (more sun exposure)'
      : ASPECT_MODIFIERS[trail.factors.aspect] > 1
      ? 'dries slower (less sun exposure)'
      : 'average drying rate'
    : null;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-white mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to map
      </Link>

      {/* Trail header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {trail.name}
          </h1>
          <ConditionBadge condition={trail.condition} size="lg" />
        </div>

        <div className="flex items-center gap-4 text-gray-400">
          <span className="flex items-center gap-1">
            <span className="text-green-400 font-medium">{trail.confidence}%</span> confident
          </span>
          <span className="text-gray-600">•</span>
          <span>
            Last rain{' '}
            {trail.hours_since_rain < 24
              ? `${trail.hours_since_rain} hours`
              : `${Math.round(trail.hours_since_rain / 24)} days`}{' '}
            ago
          </span>
        </div>
      </div>

      {/* Mini map */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Trail Location</h2>
        <div className="h-48 rounded-lg overflow-hidden">
          <TrailMap
            trails={[trail]}
            center={[trail.centroid_lat, trail.centroid_lon]}
            zoom={13}
          />
        </div>
      </div>

      {/* Why this prediction */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Why This Prediction?
        </h2>
        
        <div className="space-y-4">
          {/* Soil drainage */}
          <div className="flex items-start gap-3">
            <span className="text-2xl">🪨</span>
            <div>
              <div className="font-medium text-white">
                Soil: {trail.factors.soil || 'Unknown'}
              </div>
              <div className="text-sm text-gray-400">
                Base drying time: {trail.factors.base_dry_hours} hours
              </div>
            </div>
          </div>

          {/* Aspect */}
          {trail.factors.aspect && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">☀️</span>
              <div>
                <div className="font-medium text-white">
                  Aspect: {trail.factors.aspect}-facing
                </div>
                <div className="text-sm text-gray-400">
                  {aspectExplanation}
                </div>
              </div>
            </div>
          )}

          {/* Elevation */}
          {elevationMinFt && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">⛰️</span>
              <div>
                <div className="font-medium text-white">
                  Elevation: {elevationMinFt.toLocaleString()}&apos;
                  {elevationMaxFt && elevationMaxFt !== elevationMinFt && (
                    <> - {elevationMaxFt.toLocaleString()}&apos;</>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {(trail.factors.elevation_min ?? 0) > 2438
                    ? 'Higher elevation = slower drying'
                    : 'Lower elevation = faster drying'}
                </div>
              </div>
            </div>
          )}

          {/* Recent precipitation */}
          <div className="flex items-start gap-3">
            <span className="text-2xl">🌧️</span>
            <div>
              <div className="font-medium text-white">
                Recent Precipitation: {trail.factors.recent_precip_mm.toFixed(1)} mm
              </div>
              <div className="text-sm text-gray-400">
                in the last 7 days
              </div>
            </div>
          </div>

          {/* Effective dry time */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Effective Dry Time</div>
              <div className="text-2xl font-bold text-white">
                ~{trail.effective_dry_hours} hours
              </div>
              <div className="text-sm text-gray-400 mt-1">
                after significant rain ({'>'}2.5mm)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report condition */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Been There Recently?
        </h2>
        <p className="text-gray-400 mb-4">
          Help other riders by reporting the current conditions.
        </p>
        <button
          onClick={() => setShowReportModal(true)}
          className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Report Conditions
        </button>
      </div>

      {/* Report modal */}
      {showReportModal && (
        <ReportConditionModal
          trailId={trail.id}
          trailName={trail.name}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

// Report condition modal
function ReportConditionModal({
  trailId,
  trailName,
  onClose,
}: {
  trailId: number;
  trailName: string;
  onClose: () => void;
}) {
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const conditions = [
    { id: 'dry', label: 'Dry', emoji: '🏜️', description: 'Dusty, no mud' },
    { id: 'tacky', label: 'Tacky', emoji: '👌', description: 'Perfect grip' },
    { id: 'muddy', label: 'Muddy', emoji: '💧', description: 'Wet, slippery' },
    { id: 'snow', label: 'Snow/Ice', emoji: '❄️', description: 'Winter conditions' },
  ];

  const handleSubmit = async () => {
    if (!selectedCondition) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trail_id: trailId,
          condition: selectedCondition,
        }),
      });
      
      if (response.ok) {
        setSubmitted(true);
        setTimeout(onClose, 2000);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🙏</div>
            <h3 className="text-xl font-bold text-white mb-2">Thanks!</h3>
            <p className="text-gray-400">Your report helps other riders.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Report Conditions
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              How&apos;s <span className="text-white">{trailName}</span> right now?
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {conditions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCondition(c.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCondition === c.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-3xl mb-2">{c.emoji}</div>
                  <div className="font-medium text-white">{c.label}</div>
                  <div className="text-xs text-gray-400">{c.description}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedCondition || submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
