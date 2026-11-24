"use client";

// Compacte weerstrook boven de filterbalk van de routelijst

import { useT } from "@/lib/i18n-context";
import { scoreColor, windDirectionLabel } from "@/lib/weather";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { CurrentWeather } from "@/lib/weather";

interface Props {
  current:        CurrentWeather | null;
  /** "bij jouw locatie" of "in Lisse" (useUserLocation). */
  locationLabel?: string;
  className?:     string;
}

export default function WeatherCompact({ current, locationLabel, className = "" }: Props) {
  const { t } = useT();
  if (!current) return null;

  const color = scoreColor(current.cyclingScore);
  const place = locationLabel === "in Lisse" ? "Lisse" : locationLabel ? t("weather.your_location") : null;

  return (
    <div className={`flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-label ${className}`}>
      <WeatherIcon code={current.weathercode} size={18} />
      <span className="font-mono text-ink">{Math.round(current.temperature)}°C</span>
      <span className="text-ink-3" aria-hidden>·</span>
      <span className="font-mono text-caption text-ink-2">
        {Math.round(current.windspeed)} km/h {t(`weather.dir_${windDirectionLabel(current.winddirection)}`)}
      </span>
      {place && (
        <>
          <span className="text-ink-3" aria-hidden>·</span>
          <span className="text-caption text-ink-2">{place}</span>
        </>
      )}
      <span className="relative ml-auto flex-shrink-0 rounded-full px-2 py-0.5 font-mono text-caption font-bold" style={{ color }}>
        <span aria-hidden className="absolute inset-0 rounded-full opacity-[0.14]" style={{ backgroundColor: color }} />
        <span className="relative">{t("weather.score", { score: current.cyclingScore })}</span>
      </span>
    </div>
  );
}
