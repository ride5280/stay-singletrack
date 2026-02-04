'use client';

import { CheckCircle, MapPin, Clock, TreePine, ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  onExplore: () => void;
  stats?: {
    total: number;
    rideable: number;
  };
}

// SVG topographic pattern component
function TopoPattern({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.3">
        <path d="M50 200 Q100 150 150 180 T250 160 T350 200" fill="none" />
        <path d="M30 220 Q80 170 140 200 T260 180 T370 220" fill="none" />
        <path d="M40 250 Q100 200 160 230 T270 210 T360 250" fill="none" />
        <path d="M60 280 Q120 230 180 260 T280 240 T340 280" fill="none" />
        <path d="M80 310 Q140 260 200 290 T290 270 T320 310" fill="none" />
        <circle cx="200" cy="200" r="30" fill="none" />
        <circle cx="200" cy="200" r="50" fill="none" />
        <circle cx="200" cy="200" r="80" fill="none" />
        <circle cx="200" cy="200" r="120" fill="none" />
        <path d="M100 100 Q130 130 120 160 T140 200" fill="none" />
        <path d="M300 100 Q270 130 280 160 T260 200" fill="none" />
        <path d="M100 300 Q130 270 120 240 T140 200" fill="none" />
        <path d="M300 300 Q270 270 280 240 T260 200" fill="none" />
      </g>
    </svg>
  );
}

export function LandingHero({ onExplore, stats }: LandingHeroProps) {
  return (
    <div className="min-h-[calc(100vh-60px)] relative overflow-hidden">
      {/* Background with topo texture */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800" />
      
      {/* Topo pattern decorations */}
      <TopoPattern className="absolute -top-20 -left-20 w-96 h-96 text-stone-400 dark:text-stone-600 rotate-12" />
      <TopoPattern className="absolute -bottom-20 -right-20 w-[500px] h-[500px] text-stone-300 dark:text-stone-700 -rotate-12" />
      <TopoPattern className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] text-stone-200 dark:text-stone-800" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-60px)] px-4 py-16">
        
        {/* Hero Card */}
        <div className="max-w-2xl w-full">
          {/* Main card with texture */}
          <div className="relative bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-stone-900/10 dark:shadow-black/30 overflow-hidden border border-stone-200/50 dark:border-stone-700/50">
            
            {/* Accent bar */}
            <div className="h-2 bg-gradient-to-r from-green-600 via-green-500 to-emerald-400" />
            
            {/* Card content */}
            <div className="p-8 sm:p-12">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Colorado Trail Conditions
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-800 dark:text-stone-100 mb-4 tracking-tight">
                Know Before
                <br />
                <span className="text-green-600 dark:text-green-400">You Go</span>
              </h1>
              
              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-stone-600 dark:text-stone-300 mb-8 max-w-lg leading-relaxed">
                AI-powered trail predictions help you protect the trails you love. 
                Check conditions before you head out.
              </p>

              {/* Stats row */}
              {stats && (
                <div className="flex flex-wrap gap-4 sm:gap-8 mb-8 pb-8 border-b border-stone-200 dark:border-stone-700">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">{stats.total.toLocaleString()}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">Trails</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.rideable.toLocaleString()}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">Good to Go</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">Daily</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">Updates</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={onExplore}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 font-semibold text-lg rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Explore Trail Map
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* How it works - smaller cards below */}
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              { num: '01', title: 'Weather Data', desc: 'Real-time precipitation & temperature from stations across Colorado' },
              { num: '02', title: 'Trail Analysis', desc: 'Soil type, elevation, aspect & drainage for each trail' },
              { num: '03', title: 'Predictions', desc: 'AI model estimates dry time based on conditions' },
            ].map((item) => (
              <div
                key={item.num}
                className="p-5 rounded-2xl bg-white/60 dark:bg-stone-800/60 backdrop-blur-sm border border-stone-200/50 dark:border-stone-700/50"
              >
                <div className="text-xs font-bold text-green-600 dark:text-green-400 mb-2">{item.num}</div>
                <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-1">{item.title}</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Help improve callout */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <TreePine className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-1">Help Us Improve</h3>
                <p className="text-sm text-stone-600 dark:text-stone-300 mb-2">
                  Predictions get better with your feedback. See something wrong? Report it.
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  <strong>Why "Stay Singletrack"?</strong> Using muddy trails causes erosion and widens paths. 
                  Check conditions. Go when it's dry. Keep singletrack single.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
