'use client';

import { CheckCircle, MapPin, Clock, TreePine, ArrowRight, Mail } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface LandingHeroProps {
  onExplore: () => void;
  stats?: {
    total: number;
    rideable: number;
  };
}

// Topographic contour pattern background
function TopoBackground() {
  return (
    <>
      {/* Light mode */}
      <div 
        className="absolute inset-0 dark:hidden opacity-30"
        style={{
          backgroundImage: 'url(/topo-pattern.png)',
          backgroundSize: '600px',
          backgroundPosition: 'center',
        }}
      />
      {/* Dark mode - inverted */}
      <div 
        className="absolute inset-0 hidden dark:block opacity-20"
        style={{
          backgroundImage: 'url(/topo-pattern.png)',
          backgroundSize: '600px',
          backgroundPosition: 'center',
          filter: 'invert(1)',
        }}
      />
    </>
  );
}

export function LandingHero({ onExplore, stats }: LandingHeroProps) {
  return (
    <div className="min-h-[calc(100vh-60px)] relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800" />
      
      {/* Traditional topo contour lines */}
      <TopoBackground />

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
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-green-600/90 to-emerald-600/80 border border-green-500/90">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <TreePine className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-1">Help Us Improve</h3>
                <p className="text-sm text-stone-600 dark:text-stone-300 mb-2">
                  Predictions get better with your feedback. See something wrong? 
                  Click any trail and use the <strong>Report Condition</strong> button on the trail details page.
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  <strong>Why "Stay Singletrack"?</strong> Using muddy trails causes erosion and widens paths. 
                  Check conditions. Go when it's dry. Keep singletrack single.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm">
              <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                <TreePine className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>© {new Date().getFullYear()} Stay Singletrack</span>
              </div>
              <ThemeToggle />
              <a
                href="mailto:support@staysingletrack.com"
                className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@staysingletrack.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
