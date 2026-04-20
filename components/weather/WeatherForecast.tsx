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

// Skeleton van één dagkaartje
function DaySkeleton() {
  return (
    <div className="flex-shrink-0 w-20 rounded-2xl bg-white shadow-card p-3 animate-pulse">
      <div className="h-3 bg-gray-200 rounded mb-2 w-10 mx-auto" />
      <div className="h-7 w-7 bg-gray-200 rounded-full mx-auto mb-2" />
      <div className="h-3 bg-gray-200 rounded mb-1 w-8 mx-auto" />
      <div className="h-2 bg-gray-100 rounded-full mt-2" />
    </div>
  );
}

export default function WeatherForecast({ daily, className = "" }: Props) {
  const bestDay = daily.find((d) => d.isBestDay);

  return (
    <div className={className}>
      {/* Sectie-header */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <p className="text-sm font-extrabold text-gray-800">Plannen voor later?</p>
        {bestDay && (
          <span className="text-xs font-bold" style={{ color: "#2D7D46" }}>
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
                  className={`flex-shrink-0 w-20 rounded-2xl p-3 flex flex-col items-center gap-1.5
                    ${day.isBestDay
                      ? "ring-2 ring-[#2D7D46] bg-[#F1F8F3]"
                      : "bg-white shadow-card"
                    }`}
                >
                  {/* Dagnaam */}
                  <p
                    className="text-[11px] font-extrabold leading-none"
                    style={{ color: day.isBestDay ? "#2D7D46" : "#6B7280" }}
                  >
                    {day.dayName}
                  </p>

                  {/* Weericoon */}
                  <span className="text-xl leading-none" aria-hidden="true">{icon}</span>

                  {/* Max/min temperatuur */}
                  <div className="text-center">
                    <p className="text-xs font-bold text-gray-800 leading-none">
                      {Math.round(day.tempMax)}°
                    </p>
                    <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                      {Math.round(day.tempMin)}°
                    </p>
                  </div>

                  {/* Neerslag (alleen indien > 0) */}
                  {day.precipitationSum > 0.1 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-blue-400">
                      <Droplets size={9} />
                      {day.precipitationSum.toFixed(1)}
                    </span>
                  )}

                  {/* Fiets-score balk + getal */}
                  <div className="w-full space-y-0.5 mt-0.5">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${day.cyclingScore}%` }}
                        transition={{ delay: 0.25 + i * 0.05, duration: 0.5 }}
                      />
                    </div>
                    <p
                      className="text-[9px] font-extrabold text-center leading-none"
                      style={{ color }}
                    >
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
