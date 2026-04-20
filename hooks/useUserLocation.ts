"use client";

// Hook voor locatiebepaling met GPS en slimme fallback naar Lisse

import { useState, useEffect, useCallback } from "react";
import { haversineDistance } from "@/lib/tulipFields";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocationPermission = "loading" | "prompt" | "granted" | "denied";

export interface UserLocationState {
  coords:           { lat: number; lng: number } | null;
  nearestCity:      string;       // "Lisse" / "Hillegom" / etc.
  locationLabel:    string;       // "bij jouw locatie" of "in Lisse"
  permissionStatus: LocationPermission;
  isUsingGPS:       boolean;
  error:            string | null;
}

// ── Constanten ────────────────────────────────────────────────────────────────

const LISSE         = { lat: 52.2553, lng: 4.5573, name: "Lisse" };
const GPS_TTL_MS    = 15 * 60 * 1000; // 15 minuten
const PREF_KEY      = "tulipday_location_pref";   // 'gps' | 'lisse'
const COORDS_KEY    = "tulipday_location_coords"; // { lat, lng, timestamp }

const KNOWN_LOCATIONS = [
  { name: "Lisse",      lat: 52.2553, lng: 4.5573 },
  { name: "Hillegom",   lat: 52.2917, lng: 4.5783 },
  { name: "Sassenheim", lat: 52.2239, lng: 4.5208 },
  { name: "Noordwijk",  lat: 52.2378, lng: 4.4436 },
  { name: "Voorhout",   lat: 52.2131, lng: 4.4936 },
  { name: "Bennebroek", lat: 52.3078, lng: 4.5981 },
  { name: "Heemstede",  lat: 52.3536, lng: 4.6147 },
];

// ── Hulpfuncties ──────────────────────────────────────────────────────────────

function getNearestCity(lat: number, lng: number): string {
  let nearest = KNOWN_LOCATIONS[0];
  let minDist  = Infinity;
  for (const loc of KNOWN_LOCATIONS) {
    const d = haversineDistance(lat, lng, loc.lat, loc.lng);
    if (d < minDist) { minDist = d; nearest = loc; }
  }
  return nearest.name;
}

function readLS<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}

function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseUserLocationResult extends UserLocationState {
  requestGPS: () => void;
  useLisse:   () => void;
}

export function useUserLocation(): UseUserLocationResult {
  const [state, setState] = useState<UserLocationState>({
    coords:           null,
    nearestCity:      "Lisse",
    locationLabel:    "in Lisse",
    permissionStatus: "loading",
    isUsingGPS:       false,
    error:            null,
  });

  // ── Stel Lisse in als fallback ─────────────────────────────────────────────
  const setLisse = useCallback((status: LocationPermission = "denied") => {
    setState({
      coords:           { lat: LISSE.lat, lng: LISSE.lng },
      nearestCity:      LISSE.name,
      locationLabel:    "in Lisse",
      permissionStatus: status,
      isUsingGPS:       false,
      error:            null,
    });
  }, []);

  // ── Pas GPS-coördinaten toe ────────────────────────────────────────────────
  const applyCoords = useCallback((lat: number, lng: number) => {
    const nearestCity = getNearestCity(lat, lng);
    writeLS(COORDS_KEY, { lat, lng, timestamp: Date.now() });
    setState({
      coords:           { lat, lng },
      nearestCity,
      locationLabel:    "bij jouw locatie",
      permissionStatus: "granted",
      isUsingGPS:       true,
      error:            null,
    });
  }, []);

  // ── Vraag GPS-toestemming ──────────────────────────────────────────────────
  const requestGPS = useCallback(() => {
    setState((prev) => ({ ...prev, permissionStatus: "loading" }));

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      writeLS(PREF_KEY, "lisse");
      setLisse("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        writeLS(PREF_KEY, "gps");
        applyCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        writeLS(PREF_KEY, "lisse");
        setLisse("denied");
      },
      { timeout: 10_000, enableHighAccuracy: false },
    );
  }, [applyCoords, setLisse]);

  // ── Gebruiker kiest "Nee, gebruik Lisse" ───────────────────────────────────
  const useLisse = useCallback(() => {
    writeLS(PREF_KEY, "lisse");
    setLisse("denied");
  }, [setLisse]);

  // ── Initialisatie op basis van opgeslagen voorkeur ─────────────────────────
  useEffect(() => {
    const pref = readLS<string>(PREF_KEY);

    if (pref === "lisse") {
      setLisse("denied");
      return;
    }

    if (pref === "gps") {
      // Controleer gecachte GPS-coördinaten
      const cached = readLS<{ lat: number; lng: number; timestamp: number }>(COORDS_KEY);
      if (cached && Date.now() - cached.timestamp < GPS_TTL_MS) {
        applyCoords(cached.lat, cached.lng);
        return;
      }
      // Cache verlopen: hernieuwe GPS-aanvraag
      requestGPS();
      return;
    }

    // Eerste bezoek: toon toestemming-kaart, gebruik ondertussen Lisse
    setState((prev) => ({
      ...prev,
      coords:           { lat: LISSE.lat, lng: LISSE.lng },
      nearestCity:      LISSE.name,
      locationLabel:    "in Lisse",
      permissionStatus: "prompt",
    }));
  }, [applyCoords, setLisse, requestGPS]);

  // ── Auto-refresh GPS elke 15 minuten als toestemming actief ───────────────
  useEffect(() => {
    if (!state.isUsingGPS) return;
    const id = setInterval(requestGPS, GPS_TTL_MS);
    return () => clearInterval(id);
  }, [state.isUsingGPS, requestGPS]);

  return { ...state, requestGPS, useLisse };
}
