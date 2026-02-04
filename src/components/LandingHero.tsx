'use client';

import { CheckCircle, MapPin, Clock, TreePine, ChevronDown } from 'lucide-react';

interface LandingHeroProps {
  onExplore: () => void;
  stats?: {
    total: number;
    rideable: number;
  };
}

export function LandingHero({ onExplore, stats }: LandingHeroProps) {
  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-[var(--background)] to-[var(--background-secondary)]">
      {/* Hero Content */}
      <div className="text-center max-w-2xl mx-auto">
        {/* Icon */}
        <div className="inline-flex p-4 rounded-2xl bg-green-500/10 mb-6">
          <TreePine className="w-12 h-12 text-green-500" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] mb-4">
          Know Before You Go
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-[var(--foreground-secondary)] mb-8 max-w-lg mx-auto">
          AI-powered trail condition predictions for Colorado. 
          Don't ride muddy trails — check conditions first.
        </p>

        {/* Stats */}
        {stats && (
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
              <MapPin className="w-5 h-5 text-green-500" />
              <span><strong className="text-[var(--foreground)]">{stats.total.toLocaleString()}</strong> trails</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span><strong className="text-[var(--foreground)]">{stats.rideable.toLocaleString()}</strong> rideable today</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
              <Clock className="w-5 h-5 text-green-500" />
              <span>Updated <strong className="text-[var(--foreground)]">daily</strong></span>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold text-lg rounded-xl transition-colors shadow-lg shadow-green-500/25"
        >
          Explore Trail Map
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* How it works */}
      <div className="mt-16 max-w-4xl mx-auto w-full">
        <h2 className="text-center text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-8">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              title: 'Weather Data',
              desc: 'We pull precipitation, temperature, and humidity from weather stations across Colorado.',
            },
            {
              title: 'Trail Analysis',
              desc: 'Each trail is analyzed for soil type, aspect, elevation, and drainage characteristics.',
            },
            {
              title: 'Condition Prediction',
              desc: 'Our model predicts dry time based on recent weather and trail-specific factors.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
            >
              <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 font-bold flex items-center justify-center mb-4">
                {i + 1}
              </div>
              <h3 className="font-semibold text-[var(--foreground)] mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--foreground-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="mt-12 animate-bounce">
        <ChevronDown className="w-6 h-6 text-[var(--foreground-muted)]" />
      </div>
    </div>
  );
}
