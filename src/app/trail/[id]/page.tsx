'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { TrailPrediction, CONDITION_LABELS, ASPECT_MODIFIERS } from '@/lib/types';
import { ConditionBadge } from '@/components/ConditionBadge';
import { 
  ArrowLeft, 
  Mountain, 
  Sun, 
  CloudRain, 
  Layers, 
  Clock,
  ThumbsUp,
  X,
  Droplets,
  Snowflake,
  CheckCircle,
  Search
} from 'lucide-react';

// Dynamic import for the mini map
const TrailMap = dynamic(
  () => import('@/components/TrailMap').then((mod) => mod.TrailMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-[var(--background-secondary)] rounded-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent" />
          <span className="text-sm text-[var(--foreground-muted)]">Loading map...</span>
        </div>
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
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--background-secondary)] flex items-center justify-center">
            <Search className="w-8 h-8 text-[var(--foreground-muted)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Trail Not Found</h2>
          <p className="text-[var(--foreground-muted)] mb-4">
            We couldn&apos;t find this trail in our database.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-500 hover:text-green-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to map
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
    <div className="max-w-4xl mx-auto p-4 pb-8 bg-[var(--background)]">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to map
      </Link>

      {/* Closed banner */}
      {trail.condition === 'closed' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <X className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="font-semibold text-red-500">Seasonally Closed</div>
            <div className="text-sm text-[var(--foreground-muted)]">
              This trail is currently closed. Please respect closures to protect trail conditions.
            </div>
          </div>
        </div>
      )}

      {/* Trail header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            {trail.name}
          </h1>
          <ConditionBadge condition={trail.condition} size="lg" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[var(--foreground-muted)]">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full bg-green-500"
              style={{ opacity: trail.confidence / 100 }}
            />
            <span className="text-green-500 font-medium">{trail.confidence}%</span>
            <span>confident</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>
              Rain{' '}
              {trail.hours_since_rain < 24
                ? `${trail.hours_since_rain} hours`
                : `${Math.round(trail.hours_since_rain / 24)} days`}{' '}
              ago
            </span>
          </div>
        </div>
      </div>

      {/* Mini map */}
      <div className="card p-5 mb-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Trail Location</h2>
        <div className="h-52 rounded-xl overflow-hidden border border-[var(--border)]">
          <TrailMap
            trails={[trail]}
            center={[trail.centroid_lat, trail.centroid_lon]}
            zoom={13}
          />
        </div>
      </div>

      {/* Why this prediction */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-5">
          Why This Prediction?
        </h2>
        
        <div className="space-y-5">
          {/* Soil drainage */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="font-medium text-[var(--foreground)]">
                Soil: {trail.factors.soil || 'Unknown'}
              </div>
              <div className="text-sm text-[var(--foreground-muted)]">
                Base drying time: {trail.factors.base_dry_hours} hours
              </div>
            </div>
          </div>

          {/* Aspect */}
          {trail.factors.aspect && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Sun className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="font-medium text-[var(--foreground)]">
                  Aspect: {trail.factors.aspect}-facing
                </div>
                <div className="text-sm text-[var(--foreground-muted)]">
                  {aspectExplanation}
                </div>
              </div>
            </div>
          )}

          {/* Elevation */}
          {elevationMinFt && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Mountain className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-[var(--foreground)]">
                  Elevation: {elevationMinFt.toLocaleString()}&apos;
                  {elevationMaxFt && elevationMaxFt !== elevationMinFt && (
                    <> - {elevationMaxFt.toLocaleString()}&apos;</>
                  )}
                </div>
                <div className="text-sm text-[var(--foreground-muted)]">
                  {(trail.factors.elevation_min ?? 0) > 2438
                    ? 'Higher elevation = slower drying'
                    : 'Lower elevation = faster drying'}
                </div>
              </div>
            </div>
          )}

          {/* Recent precipitation */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <CloudRain className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <div className="font-medium text-[var(--foreground)]">
                Recent Precipitation: {trail.factors.recent_precip_mm.toFixed(1)} mm
              </div>
              <div className="text-sm text-[var(--foreground-muted)]">
                in the last 7 days
              </div>
            </div>
          </div>

          {/* Effective dry time */}
          <div className="mt-6 pt-5 border-t border-[var(--border)]">
            <div className="bg-[var(--background-secondary)] rounded-xl p-5">
              <div className="text-sm text-[var(--foreground-muted)] mb-1">
                Effective Dry Time
              </div>
              <div className="text-3xl font-bold text-[var(--foreground)]">
                ~{trail.effective_dry_hours} hours
              </div>
              <div className="text-sm text-[var(--foreground-muted)] mt-1">
                after significant rain ({'>'}2.5mm)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report condition */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          Been There Recently?
        </h2>
        <p className="text-[var(--foreground-muted)] mb-5">
          Help other trail users by reporting the current conditions.
        </p>
        <button
          onClick={() => setShowReportModal(true)}
          className="w-full sm:w-auto px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
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
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const conditions = [
    { id: 'dry', label: 'Dry', Icon: Sun, color: 'amber', description: 'Dusty, no mud' },
    { id: 'tacky', label: 'Tacky', Icon: CheckCircle, color: 'green', description: 'Perfect grip' },
    { id: 'muddy', label: 'Muddy', Icon: Droplets, color: 'blue', description: 'Wet, slippery' },
    { id: 'snow', label: 'Snow/Ice', Icon: Snowflake, color: 'cyan', description: 'Winter conditions' },
  ];

  // Check for saved email on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('stay_singletrack_user_email');
      if (!savedEmail) {
        setNeedsEmail(true);
      } else {
        setEmail(savedEmail);
      }
    }
  });

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleEmailSubmit = () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Save email to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('stay_singletrack_user_email', email);
    }

    setEmailError('');
    setNeedsEmail(false);
  };

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
          email: email,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--surface)] rounded-2xl w-full max-w-md p-6 shadow-xl border border-[var(--border)] animate-slide-up">
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <ThumbsUp className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Thanks!</h3>
            <p className="text-[var(--foreground-muted)]">Your report helps other trail users.</p>
          </div>
        ) : needsEmail ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                One Quick Thing
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--background-secondary)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--foreground-muted)]" />
              </button>
            </div>

            <p className="text-[var(--foreground-muted)] text-sm mb-5">
              To help prevent abuse, we ask for your email before your first report. Your email helps us keep trail conditions accurate.
            </p>

            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleEmailSubmit();
                  }
                }}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              {emailError && (
                <p className="mt-2 text-sm text-red-500">{emailError}</p>
              )}
            </div>

            <div className="bg-[var(--background-secondary)] rounded-xl p-4 mb-5">
              <p className="text-xs text-[var(--foreground-muted)]">
                We store your email only to associate with your reports. We won&apos;t spam you or share your email. You can submit reports as many times as you want after this.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-[var(--background-secondary)] text-[var(--foreground-secondary)] rounded-xl hover:bg-[var(--background-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailSubmit}
                disabled={!email}
                className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Report Conditions
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--background-secondary)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--foreground-muted)]" />
              </button>
            </div>

            <p className="text-[var(--foreground-muted)] text-sm mb-5">
              How&apos;s <span className="text-[var(--foreground)] font-medium">{trailName}</span> right now?
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {conditions.map((c) => {
                const Icon = c.Icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCondition(c.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedCondition === c.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mb-2 text-${c.color}-500`} />
                    <div className="font-medium text-[var(--foreground)]">{c.label}</div>
                    <div className="text-xs text-[var(--foreground-muted)]">{c.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-[var(--background-secondary)] text-[var(--foreground-secondary)] rounded-xl hover:bg-[var(--background-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedCondition || submitting}
                className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
