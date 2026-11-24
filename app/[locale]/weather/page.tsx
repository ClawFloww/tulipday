"use client";

// Weer-pagina — uitgebreide fietsweer info met 7-daagse voorspelling
// Gebruikt bestaande hooks en componenten (geen nieuwe logica)

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { useWeather } from "@/hooks/useWeather";
import { useUserLocation } from "@/hooks/useUserLocation";
import WeatherCard from "@/components/weather/WeatherCard";
import WeatherForecast from "@/components/weather/WeatherForecast";
import WeatherBanner from "@/components/weather/WeatherBanner";
import LocationPermissionCard from "@/components/weather/LocationPermissionCard";
import { IconButton } from "@/components/ui/IconButton";

export default function WeatherPage() {
  const { t }    = useT();
  const router   = useRouter();
  const location = useUserLocation();
  const weather  = useWeather(location.coords);
  const [showLocationCard, setShowLocationCard] = useState(false);

  return (
    <div className="min-h-screen bg-surface pb-safe-nav">

      <header className="border-b border-line bg-surface-2 px-3 pb-4 pt-safe">
        <div className="flex items-center gap-2 pt-3">
          <IconButton variant="ghost" aria-label={t("common.back")} onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </IconButton>
          <div>
            <h1 className="font-display text-title leading-tight text-ink">{t("weather.page_title")}</h1>
            <p className="text-caption text-ink-3">{t("weather.page_subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="pt-4 space-y-4">

        {/* Locatiekaart bij eerste gebruik of op verzoek */}
        <AnimatePresence>
          {(location.permissionStatus === "prompt" || showLocationCard) && (
            <div className="px-4">
              <LocationPermissionCard
                onGrant={() => { location.requestGPS(); setShowLocationCard(false); }}
                onDecline={() => { location.useLisse(); setShowLocationCard(false); }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Grote weerkaart met score-ring */}
        <WeatherCard
          current={weather.current}
          isLoading={weather.isLoading}
          error={weather.error}
          lastUpdated={weather.lastUpdated}
          onRefresh={weather.refresh}
          isUsingGPS={location.isUsingGPS}
          onLocationClick={() => setShowLocationCard(true)}
        />

        {/* Banner bij slecht fietsweer */}
        <WeatherBanner current={weather.current} scoreThreshold={40} />

        {/* 7-daagse voorspelling */}
        {(weather.isLoading || weather.daily.length > 0) && (
          <WeatherForecast daily={weather.daily} />
        )}

      </div>
    </div>
  );
}
