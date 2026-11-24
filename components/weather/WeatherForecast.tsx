"use client";

// 7-daagse fietsweersvoorspelling — horizontaal scrollbaar

import { motion } from "framer-motion";
import { Droplets } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { scoreColor } from "@/lib/weather";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { DailyForecast } from "@/lib/weather";

interface Props {
  daily:      DailyForecast[];
  className?: string;
}

/** Korte dagnaam in de taal van de app ("ma", "Mon"…); vandaag apart. */
function dayLabel(day: DailyForecast, index: number, locale: string, today: string): string {
  if (index === 0) return today;
  const name = new Date(`${day.date}T12:00:00`).toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function WeatherForecast({ daily, className = "" }: Props) {
  const { t, locale } = useT();
  const today = t("weather.today");
  const bestIdx = daily.findIndex((d) => d.isBestDay);

  return (
    <section className={className} aria-label={t("weather.forecast_title")}>
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="text-headline text-ink">{t("weather.forecast_title")}</h2>
        {bestIdx >= 0 && (
          <span className="text-caption font-bold text-success">
            {t("weather.best_day", { day: dayLabel(daily[bestIdx], bestIdx, locale, today) })}
          </span>
        )}
      </div>

      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-3">
        {daily.length === 0
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-32 w-20 flex-shrink-0 rounded-2xl" />)
          : daily.map((day, i) => {
              const color = scoreColor(day.cyclingScore);
              return (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.28 }}
                  className={`flex w-20 flex-shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-surface-2 p-3
                              ${day.isBestDay ? "ring-2 ring-inset ring-success" : "shadow-card"}`}
                >
                  <p className={`text-caption font-bold leading-none ${day.isBestDay ? "text-success" : "text-ink-3"}`}>
                    {dayLabel(day, i, locale, today)}
                  </p>

                  <WeatherIcon code={day.weathercode} size={22} />

                  <div className="text-center font-mono">
                    <p className="text-label leading-none text-ink">{Math.round(day.tempMax)}°</p>
                    <p className="mt-0.5 text-caption leading-none text-ink-3">{Math.round(day.tempMin)}°</p>
                  </div>

                  {day.precipitationSum > 0.1 && (
                    <span className="flex items-center gap-0.5 font-mono text-[10px] font-semibold text-info">
                      <Droplets size={10} aria-hidden />
                      {day.precipitationSum.toFixed(1)}
                    </span>
                  )}

                  <div className="mt-0.5 w-full space-y-0.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${day.cyclingScore}%` }}
                        transition={{ delay: 0.25 + i * 0.05, duration: 0.5 }}
                      />
                    </div>
                    <p className="text-center font-mono text-[10px] font-bold leading-none" style={{ color }}>
                      {day.cyclingScore}
                    </p>
                  </div>
                </motion.div>
              );
            })}
      </div>
    </section>
  );
}
