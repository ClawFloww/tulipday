"use client";

// Compacte weerstrook voor boven filterbalk — met optionele locatienaam

import type { CurrentWeather } from "@/lib/weather";
import { weatherIcon, cyclingScoreColor, windDirectionLabel } from "@/lib/weather";

interface Props {
  current:        CurrentWeather | null;
  locationLabel?: string;
  className?:     string;
}

export default function WeatherCompact({ current, locationLabel, className = "" }: Props) {
  if (!current) return null;

  const icon  = weatherIcon(current.weathercode);
  const color = cyclingScoreColor(current.cyclingScore);

  // Extraheer alleen de plaatsnaam
  const cityName = locationLabel?.startsWith("in ")
    ? locationLabel.slice(3)
    : locationLabel === "bij jouw locatie"
    ? "Jouw locatie"
    : null;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 text-sm ${className}`}
      style={{
        backgroundColor: "var(--color-surface-2)",
        borderBottom:    "1px solid var(--color-border)",
      }}
    >
      <span className="text-base leading-none" aria-hidden="true">{icon}</span>
      <span className="font-semibold" style={{ color: "var(--color-text)" }}>
        {Math.round(current.temperature)}°C
      </span>
      <span style={{ color: "var(--color-border-strong)" }} className="font-light">·</span>
      <span className="font-medium text-xs" style={{ color: "var(--color-text-2)" }}>
        {Math.round(current.windspeed)} km/u {windDirectionLabel(current.winddirection)}
      </span>
      {cityName && (
        <>
          <span style={{ color: "var(--color-border-strong)" }} className="font-light">·</span>
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-2)" }}>
            {cityName}
          </span>
        </>
      )}
      <span className="ml-auto flex-shrink-0">
        <span
          className="text-[11px] font-extrabold px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: `${color}18` }}
        >
          Score {current.cyclingScore}
        </span>
      </span>
    </div>
  );
}
