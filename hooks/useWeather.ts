"use client";

// Hook voor het ophalen en cachen van weerdata via Open-Meteo
// Accepteert optionele coördinaten; valt terug op Lisse als die niet opgegeven zijn.

import { useState, useEffect, useCallback } from "react";
import {
  CurrentWeather,
  DailyForecast,
  WeatherState,
  parseOpenMeteo,
} from "@/lib/weather";

// Lisse — standaard fallback-locatie
const LISSE = { lat: 52.2553, lng: 4.5573 };

const CACHE_TTL = 30 * 60 * 1000; // 30 minuten

interface WeatherCache {
  current:   CurrentWeather;
  daily:     DailyForecast[];
  timestamp: number;
}

function buildApiUrl(lat: number, lng: number): string {
  return (
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode` +
    `&timezone=Europe%2FAmsterdam` +
    `&forecast_days=7`
  );
}

// Cache-sleutel is locatie-specifiek zodat Lisse en GPS-locatie niet door elkaar lopen
function cacheKey(lat: number, lng: number): string {
  return `tulipday_weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

export function useWeather(coords?: { lat: number; lng: number } | null) {
  // Gebruik opgegeven coördinaten of val terug op Lisse
  const lat = coords?.lat ?? LISSE.lat;
  const lng = coords?.lng ?? LISSE.lng;

  const [state, setState] = useState<WeatherState>({
    current:     null,
    daily:       [],
    isLoading:   true,
    error:       null,
    lastUpdated: null,
  });

  // Haalt altijd vers weerdata op van de API
  const fetchWeather = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(buildApiUrl(lat, lng), {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const { current, daily } = parseOpenMeteo(data);

      // Sla op in locatie-specifieke cache
      const key: string = cacheKey(lat, lng);
      const cache: WeatherCache = { current, daily, timestamp: Date.now() };
      try { localStorage.setItem(key, JSON.stringify(cache)); } catch { /* quota */ }

      setState({
        current,
        daily,
        isLoading:   false,
        error:       null,
        lastUpdated: new Date(),
      });
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Weerdata tijdelijk niet beschikbaar",
      }));
    }
  }, [lat, lng]);

  // Bij mount of locatiewijziging: controleer cache, haal op als verlopen
  useEffect(() => {
    const key = cacheKey(lat, lng);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const cached: WeatherCache = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          setState({
            current:     cached.current,
            daily:       cached.daily,
            isLoading:   false,
            error:       null,
            lastUpdated: new Date(cached.timestamp),
          });
          return; // Cache is vers
        }
      }
    } catch { /* verlopen of corrupt */ }

    fetchWeather();
  }, [lat, lng, fetchWeather]);

  // Auto-refresh elke 30 minuten
  useEffect(() => {
    const id = setInterval(fetchWeather, CACHE_TTL);
    return () => clearInterval(id);
  }, [fetchWeather]);

  return { ...state, refresh: fetchWeather };
}
