"use client";

// 7-daagse fietsweersvoorspelling — horizontaal scrollbaar

import { motion } from "framer-motion";
import { Droplets } from "lucide-react";
import type { DailyForecast } from "@/lib/weather";
import { weatherIcon, cyclingScoreColor } from "@/lib/weather";

interface Props {
  daily:     DailyForecast[];
  className?: string;
}

// Skeleton van één dagkaartje — shimmer past mee met donker thema
function DaySkeleton() {
  return (
    <div className="flex-shrink-0 w-20 rounded-2xl bg-surface-2 shadow-card p-3">
      <div className="h-3 skeleton-shimmer rounded mb-2 w-10 mx-auto" />
      <div className="h-7 w-7 skeleton-shimmer rounded-full mx-auto mb-2" />
      <div className="h-3 skeleton-shimmer rounded mb-1 w-8 mx-auto" />
      <div className="h-2 skeleton-shimmer rounded-full mt-2" />
    </div>
  );
}

export default function WeatherForecast({ daily, className = "" }: Props) {
  const bestDay = daily.find((d) => d.isBestDay);

  return (
    <div className={className}>
      {/* Sectie-header */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <p className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
          Plannen voor later?
        </p>
        {bestDay && (
          <span className="text-xs font-bold" style={{ color: "var(--color-score-good)" }}>
            Beste dag: {bestDay.dayName} 🌞
          </span>
        )}
      </div>

      {/* Horizontale dagkaarten */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-3">
        {daily.length === 0
          ? Array.from({ length: 7 }).map((_, i) => <DaySkeleton key={i} />)
          : daily.map((day, i) => {
              const icon  = weatherIcon(day.weathercode);
              const color = cyclingScoreColor(day.cyclingScore);

              return (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.28 }}
                  className="flex-shrink-0 w-20 rounded-2xl p-3 flex flex-col items-center gap-1.5"
                  style={{
                    backgroundColor: day.isBestDay
                      ? "rgba(45, 125, 70, 0.12)"
                      : "var(--color-surface-2)",
                    boxShadow:    day.isBestDay ? "none" : "0 2px 12px 0 rgba(0,0,0,0.07)",
                    outline:      day.isBestDay ? "2px solid var(--color-score-good)" : "none",
                    outlineOffset: "-2px",
                  }}
                >
                  {/* Dagnaam */}
                  <p
                    className="text-[11px] font-extrabold leading-none"
                    style={{ color: day.isBestDay ? "var(--color-score-good)" : "var(--color-text-3)" }}
                  >
                    {day.dayName}
                  </p>

                  {/* Weericoon */}
                  <span className="text-xl leading-none" aria-hidden="true">{icon}</span>

                  {/* Max/min temperatuur */}
                  <div className="text-center">
                    <p className="text-xs font-bold leading-none"
                       style={{ color: "var(--color-text)" }}>
                      {Math.round(day.tempMax)}°
                    </p>
                    <p className="text-[10px] leading-none mt-0.5"
                       style={{ color: "var(--color-text-3)" }}>
                      {Math.round(day.tempMin)}°
                    </p>
                  </div>

                  {/* Neerslag */}
                  {day.precipitationSum > 0.1 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-blue-400">
                      <Droplets size={9} />
                      {day.precipitationSum.toFixed(1)}
                    </span>
                  )}

                  {/* Fiets-score balk */}
                  <div className="w-full space-y-0.5 mt-0.5">
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--color-surface-3)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${day.cyclingScore}%` }}
                        transition={{ delay: 0.25 + i * 0.05, duration: 0.5 }}
                      />
                    </div>
                    <p className="text-[9px] font-extrabold text-center leading-none"
                       style={{ color }}>
                      {day.cyclingScore}
                    </p>
                  </div>
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}
