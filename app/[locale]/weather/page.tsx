"use client";

// Weer-pagina — uitgebreide fietsweer info met 7-daagse voorspelling
// Gebruikt bestaande hooks en componenten (geen nieuwe logica)

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useWeather } from "@/hooks/useWeather";
import { useUserLocation } from "@/hooks/useUserLocation";
import WeatherCard from "@/components/weather/WeatherCard";
import WeatherForecast from "@/components/weather/WeatherForecast";
import WeatherBanner from "@/components/weather/WeatherBanner";
import LocationPermissionCard from "@/components/weather/LocationPermissionCard";

export default function WeatherPage() {
  const location = useUserLocation();
  const weather  = useWeather(location.coords);
  const [showLocationCard, setShowLocationCard] = useState(false);

  return (
    <div className="min-h-screen bg-warm pb-28">

      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-black/[0.06]">
        <h1 className="font-display font-bold text-2xl text-[var(--color-text)] leading-tight">
          Fietsweer
        </h1>
        <p className="text-sm text-[var(--color-text-3)] mt-0.5">Bollenstreek &amp; omgeving</p>
      </div>

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
          locationLabel={location.locationLabel}
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
