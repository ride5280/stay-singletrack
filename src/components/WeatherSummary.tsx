'use client';

interface WeatherDay {
  date: string;
  precipitation_mm: number;
  temp_max_c: number;
  temp_min_c: number;
}

interface WeatherSummaryProps {
  weather: WeatherDay[];
  compact?: boolean;
}

export function WeatherSummary({ weather, compact = false }: WeatherSummaryProps) {
  if (!weather || weather.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No weather data available
      </div>
    );
  }

  // Sort by date (most recent first)
  const sorted = [...weather].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Find last significant rain
  const lastRain = sorted.find((d) => d.precipitation_mm >= 2.5);
  const daysSinceRain = lastRain
    ? Math.round(
        (new Date().getTime() - new Date(lastRain.date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Total precipitation in last 7 days
  const totalPrecip = sorted
    .slice(0, 7)
    .reduce((sum, d) => sum + d.precipitation_mm, 0);

  if (compact) {
    return (
      <div className="text-sm text-gray-400">
        {daysSinceRain !== null ? (
          <span>
            Last rain: {daysSinceRain === 0 ? 'today' : `${daysSinceRain}d ago`}
          </span>
        ) : (
          <span>No recent rain ☀️</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Recent Weather</h3>
      
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-700/50 rounded p-3">
          <div className="text-gray-400 text-sm">Last Significant Rain</div>
          <div className="text-white font-medium">
            {daysSinceRain !== null
              ? daysSinceRain === 0
                ? 'Today'
                : `${daysSinceRain} days ago`
              : 'None in 7 days'}
          </div>
        </div>
        <div className="bg-gray-700/50 rounded p-3">
          <div className="text-gray-400 text-sm">7-Day Total</div>
          <div className="text-white font-medium">
            {totalPrecip.toFixed(1)} mm
            {totalPrecip > 10 && ' 🌧️'}
            {totalPrecip === 0 && ' ☀️'}
          </div>
        </div>
      </div>

      {/* Daily precipitation chart */}
      <div className="space-y-2">
        <div className="text-sm text-gray-400 mb-2">Daily Precipitation</div>
        {sorted.slice(0, 7).map((day) => {
          const maxPrecip = Math.max(...sorted.slice(0, 7).map((d) => d.precipitation_mm), 1);
          const barWidth = (day.precipitation_mm / maxPrecip) * 100;
          const dateObj = new Date(day.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          
          return (
            <div key={day.date} className="flex items-center gap-2 text-sm">
              <span className="w-12 text-gray-400">{dayName}</span>
              <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                {day.precipitation_mm > 0 && (
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(barWidth, 5)}%` }}
                  />
                )}
              </div>
              <span className="w-16 text-right text-gray-300">
                {day.precipitation_mm > 0
                  ? `${day.precipitation_mm.toFixed(1)} mm`
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Temperature range */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Temperature (3-day avg)</div>
        <div className="text-white">
          {(() => {
            const recent = sorted.slice(0, 3);
            const avgHigh = Math.round(
              recent.reduce((sum, d) => sum + d.temp_max_c, 0) / recent.length
            );
            const avgLow = Math.round(
              recent.reduce((sum, d) => sum + d.temp_min_c, 0) / recent.length
            );
            const highF = Math.round(avgHigh * 9/5 + 32);
            const lowF = Math.round(avgLow * 9/5 + 32);
            return `${avgHigh}°C / ${avgLow}°C (${highF}°F / ${lowF}°F)`;
          })()}
        </div>
      </div>
    </div>
  );
}
