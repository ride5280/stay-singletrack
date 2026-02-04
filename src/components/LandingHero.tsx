'use client';

import { CheckCircle, MapPin, Clock, TreePine, ArrowRight, Mail } from 'lucide-react';

interface LandingHeroProps {
  onExplore: () => void;
  stats?: {
    total: number;
    rideable: number;
  };
}

// SVG topographic contour pattern (no attribution needed)
function TopoBackground() {
  return (
    <svg 
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 700" 
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" strokeWidth="1" className="stroke-stone-300 dark:stroke-stone-600" opacity="0.6">
        {/* Top left peak */}
        <path d="M80 180 Q60 160 90 140 Q130 110 180 130 Q220 150 200 190 Q180 230 130 220 Q80 210 80 180" />
        <path d="M95 175 Q80 160 100 145 Q130 125 165 140 Q190 155 175 185 Q160 210 125 200 Q95 190 95 175" />
        <path d="M110 170 Q100 160 115 150 Q135 138 155 150 Q170 162 160 178 Q145 195 125 188 Q110 180 110 170" />
        <path d="M125 165 Q120 158 130 152 Q145 145 155 155 Q162 165 155 172 Q145 180 132 175 Q125 170 125 165" />
        
        {/* Top flowing lines */}
        <path d="M0 80 Q150 40 300 90 Q450 140 550 100 Q700 50 850 110 Q950 150 1000 120" />
        <path d="M0 110 Q150 70 300 120 Q450 170 550 130 Q700 80 850 140 Q950 180 1000 150" />
        <path d="M0 140 Q150 100 300 150 Q450 200 550 160 Q700 110 850 170 Q950 210 1000 180" />
        
        {/* Large center-right peak */}
        <path d="M550 320 Q480 280 520 220 Q580 150 680 170 Q780 190 820 280 Q850 370 780 420 Q700 480 600 450 Q500 420 520 360 Q540 340 550 320" />
        <path d="M570 330 Q520 300 550 250 Q600 190 680 210 Q760 230 790 300 Q810 370 760 410 Q700 450 620 430 Q540 400 550 360 Q565 345 570 330" />
        <path d="M590 340 Q555 315 580 275 Q620 225 680 245 Q740 265 765 320 Q785 375 745 405 Q695 435 635 415 Q580 395 585 365 Q590 350 590 340" />
        <path d="M615 350 Q590 330 610 300 Q640 260 685 275 Q725 295 740 335 Q755 375 725 395 Q690 420 650 405 Q615 385 615 365 Q618 355 615 350" />
        <path d="M640 355 Q625 345 640 320 Q660 290 690 305 Q715 320 720 350 Q728 380 705 392 Q680 405 658 392 Q640 378 642 365 Q643 360 640 355" />
        
        {/* Bottom left peak */}
        <path d="M150 550 Q100 500 140 440 Q200 380 300 400 Q380 420 400 500 Q420 580 350 620 Q260 660 180 620 Q110 580 150 550" />
        <path d="M175 540 Q135 500 165 455 Q215 400 295 420 Q360 440 375 505 Q390 565 335 600 Q265 640 195 605 Q135 570 175 540" />
        <path d="M200 530 Q170 500 195 465 Q235 420 295 438 Q345 455 358 505 Q370 555 325 582 Q270 615 215 585 Q165 555 200 530" />
        <path d="M225 520 Q200 498 220 470 Q255 435 300 450 Q338 468 348 505 Q358 545 320 568 Q275 595 235 570 Q200 545 225 520" />
        <path d="M250 510 Q235 495 250 475 Q275 450 305 462 Q332 478 338 505 Q345 535 315 552 Q280 572 255 555 Q235 535 250 510" />
        
        {/* Mid flowing lines */}
        <path d="M0 300 Q100 260 200 310 Q350 380 450 320 Q550 260 650 330 Q800 420 900 360 Q960 320 1000 350" />
        <path d="M0 340 Q100 300 200 350 Q350 420 450 360 Q550 300 650 370 Q800 460 900 400 Q960 360 1000 390" />
        
        {/* Top right small peak */}
        <path d="M850 200 Q820 170 860 140 Q910 110 950 150 Q990 190 960 230 Q920 270 870 250 Q830 230 850 200" />
        <path d="M865 195 Q845 175 875 155 Q910 135 940 165 Q970 195 950 225 Q920 255 880 240 Q850 225 865 195" />
        <path d="M885 190 Q870 175 895 162 Q920 150 940 175 Q955 200 940 220 Q915 240 895 228 Q875 215 885 190" />
        
        {/* Bottom flowing lines */}
        <path d="M0 580 Q150 520 300 580 Q450 640 600 590 Q750 540 900 600 Q960 630 1000 610" />
        <path d="M0 620 Q150 560 300 620 Q450 680 600 630 Q750 580 900 640 Q960 670 1000 650" />
        <path d="M0 660 Q150 600 300 660 Q450 720 600 670 Q750 620 900 680 Q960 710 1000 690" />
        
        {/* Small accent peak bottom right */}
        <path d="M780 580 Q750 550 790 520 Q840 490 890 530 Q930 570 900 610 Q860 650 810 630 Q760 610 780 580" />
        <path d="M800 575 Q780 555 810 535 Q845 515 880 545 Q910 575 890 605 Q860 635 820 620 Q785 605 800 575" />
        <path d="M820 570 Q805 555 830 540 Q858 525 880 550 Q898 578 882 600 Q860 622 835 610 Q812 598 820 570" />
      </g>
    </svg>
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
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/20">
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
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  <strong>Why "Stay Singletrack"?</strong> Using muddy trails causes erosion and widens paths. 
                  Check conditions. Go when it's dry. Keep singletrack single.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                <TreePine className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>© {new Date().getFullYear()} Stay Singletrack</span>
              </div>
              <a
                href="mailto:hello@staysingletrack.com"
                className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
                hello@staysingletrack.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
