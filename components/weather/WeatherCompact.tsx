"use client";

// Compacte weerstrook voor boven filterbalk — met optionele locatienaam

import type { CurrentWeather } from "@/lib/weather";
import { weatherIcon, cyclingScoreColor, windDirectionLabel } from "@/lib/weather";

interface Props {
  current:        CurrentWeather | null;
  locationLabel?: string;  // "in Hillegom" / "bij jouw locatie" / "in Lisse"
  className?:     string;
}

export default function WeatherCompact({
  current,
  locationLabel,
  className = "",
}: Props) {
  if (!current) return null;

  const icon  = weatherIcon(current.weathercode);
  const color = cyclingScoreColor(current.cyclingScore);

  // Extraheer alleen de plaatsnaam als het gaat om "in [stad]"
  const cityName = locationLabel?.startsWith("in ")
    ? locationLabel.slice(3)       // "in Hillegom" → "Hillegom"
    : locationLabel === "bij jouw locatie"
    ? "Jouw locatie"
    : null;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 text-sm ${className}`}
    >
      <span className="text-base leading-none" aria-hidden="true">{icon}</span>
      <span className="font-semibold text-gray-700">
        {Math.round(current.temperature)}°C
      </span>
      <span className="text-gray-300 font-light">·</span>
      <span className="text-gray-500 font-medium text-xs">
        {Math.round(current.windspeed)} km/u {windDirectionLabel(current.winddirection)}
      </span>
      {cityName && (
        <>
          <span className="text-gray-300 font-light">·</span>
          <span className="text-xs font-semibold text-gray-500">{cityName}</span>
        </>
      )}
      <span className="ml-auto flex-shrink-0">
        <span
          className="text-[11px] font-extrabold px-2 py-0.5 rounded-full"
          style={{
            color,
            backgroundColor: `${color}18`,
          }}
        >
          Score {current.cyclingScore}
        </span>
      </span>
    </div>
  );
}
