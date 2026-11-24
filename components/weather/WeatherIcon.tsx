"use client";

// Weericoon (lucide) per weertype, met een passende statuskleur.

import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";
import { weatherCondition, type WeatherCondition } from "@/lib/weather";

const ICON: Record<WeatherCondition, { Icon: LucideIcon; className: string }> = {
  clear:         { Icon: Sun,            className: "text-warning" },
  mostly_clear:  { Icon: CloudSun,       className: "text-warning" },
  partly_cloudy: { Icon: CloudSun,       className: "text-ink-2" },
  cloudy:        { Icon: Cloud,          className: "text-ink-2" },
  fog:           { Icon: CloudFog,       className: "text-ink-3" },
  drizzle:       { Icon: CloudDrizzle,   className: "text-info" },
  rain:          { Icon: CloudRain,      className: "text-info" },
  snow:          { Icon: CloudSnow,      className: "text-info" },
  showers:       { Icon: CloudRain,      className: "text-info" },
  thunder:       { Icon: CloudLightning, className: "text-warning" },
};

export function WeatherIcon({ code, size = 20 }: { code: number; size?: number }) {
  const { Icon, className } = ICON[weatherCondition(code)];
  return <Icon size={size} className={className} aria-hidden />;
}
