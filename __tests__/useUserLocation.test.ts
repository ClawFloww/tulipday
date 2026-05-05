/**
 * Tests voor hooks/useUserLocation.ts
 *
 * Kritiekheid: HOOG
 * - useUserLocation bepaalt de GPS-coördinaten die door de hele app gebruikt worden
 *   voor "dichtstbijzijnde velden" en Discover-volgorde.
 * - Een bug in de cache-logica kan leiden tot onjuiste locaties na 15 minuten.
 * - Een bug in de fallback kan leiden tot crashes bij ontbrekende GPS-toestemming.
 *
 * navigator.geolocation wordt gemockt; localStorage simuleert opgeslagen voorkeur.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useUserLocation } from "@/hooks/useUserLocation";

// ── Constanten (gelijk aan de hook) ──────────────────────────────────────────

const PREF_KEY   = "tulipday_location_pref";
const COORDS_KEY = "tulipday_location_coords";
const LISSE      = { lat: 52.2553, lng: 4.5573 };
const GPS_TTL_MS = 15 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockGeolocationSuccess(lat: number, lng: number) {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: {
        latitude:         lat,
        longitude:        lng,
        accuracy:         10,
        altitude:         null,
        altitudeAccuracy: null,
        heading:          null,
        speed:            null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
  });

  Object.defineProperty(navigator, "geolocation", {
    value:        { getCurrentPosition },
    configurable: true,
  });

  return getCurrentPosition;
}

function mockGeolocationError() {
  const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
    error?.({ code: 1, message: "Permission denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
  });

  Object.defineProperty(navigator, "geolocation", {
    value:        { getCurrentPosition },
    configurable: true,
  });

  return getCurrentPosition;
}

function removeGeolocation() {
  Object.defineProperty(navigator, "geolocation", {
    value:        undefined,
    configurable: true,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useUserLocation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Herstel geolocation naar een neutrale toestand
    Object.defineProperty(navigator, "geolocation", {
      value:        undefined,
      configurable: true,
    });
  });

  // ── Eerste bezoek (geen voorkeur opgeslagen) ──────────────────────────────

  it("toont 'prompt'-status bij eerste bezoek (geen voorkeur opgeslagen)", async () => {
    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.permissionStatus).toBe("prompt"));
    expect(result.current.permissionStatus).toBe("prompt");
  });

  it("gebruikt Lisse-coördinaten bij eerste bezoek", async () => {
    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.permissionStatus).toBe("prompt"));
    expect(result.current.coords?.lat).toBeCloseTo(LISSE.lat, 3);
    expect(result.current.coords?.lng).toBeCloseTo(LISSE.lng, 3);
  });

  it("is niet aan het laden na initialisatie bij eerste bezoek", async () => {
    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.permissionStatus).not.toBe("loading"));
    expect(result.current.isUsingGPS).toBe(false);
  });

  // ── Voorkeur = 'lisse' ────────────────────────────────────────────────────

  it("gebruikt Lisse direct als voorkeur 'lisse' is opgeslagen", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify("lisse"));
    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.permissionStatus).toBe("denied"));
    expect(result.current.nearestCity).toBe("Lisse");
    expect(result.current.isUsingGPS).toBe(false);
  });

  it("stelt 'in Lisse' in als locationLabel bij voorkeur 'lisse'", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify("lisse"));
    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.permissionStatus).toBe("denied"));
    expect(result.current.locationLabel).toBe("in Lisse");
  });

  // ── Voorkeur = 'gps' met verse cache ─────────────────────────────────────

  it("gebruikt gecachte GPS-coördinaten als voorkeur 'gps' en cache vers is", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify("gps"));
    localStorage.setItem(COORDS_KEY, JSON.stringify({
      lat:       52.2917,
      lng:       4.5783,
      timestamp: Date.now(), // nu → vers
    }));

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));

    expect(result.current.coords?.lat).toBeCloseTo(52.2917, 3);
    expect(result.current.coords?.lng).toBeCloseTo(4.5783, 3);
    expect(result.current.isUsingGPS).toBe(true);
  });

  it("zet nearestCity op basis van GPS-coördinaten (Hillegom)", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify("gps"));
    localStorage.setItem(COORDS_KEY, JSON.stringify({
      lat:       52.2917,   // Hillegom
      lng:       4.5783,
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    expect(result.current.nearestCity).toBe("Hillegom");
  });

  it("stelt 'bij jouw locatie' in als locationLabel bij GPS", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify("gps"));
    localStorage.setItem(COORDS_KEY, JSON.stringify({
      lat:       52.2917,
      lng:       4.5783,
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    expect(result.current.locationLabel).toBe("bij jouw locatie");
  });

  // ── Voorkeur = 'gps' met verlopen cache → hernieuwde GPS-aanvraag ─────────

  it("vraagt GPS opnieuw op als voorkeur 'gps' maar cache verlopen is", async () => {
    const expiredTimestamp = Date.now() - (GPS_TTL_MS + 1000); // verlopen
    localStorage.setItem(PREF_KEY, JSON.stringify("gps"));
    localStorage.setItem(COORDS_KEY, JSON.stringify({
      lat:       52.30,
      lng:       4.58,
      timestamp: expiredTimestamp,
    }));

    const getCurrentPosition = mockGeolocationSuccess(52.2917, 4.5783);
    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    expect(getCurrentPosition).toHaveBeenCalled();
    expect(result.current.coords?.lat).toBeCloseTo(52.2917, 3);
  });

  // ── requestGPS ────────────────────────────────────────────────────────────

  it("requestGPS() → GPS verleend → past coördinaten toe", async () => {
    // Eerste bezoek: geen voorkeur
    const getCurrentPosition = mockGeolocationSuccess(52.2239, 4.5208); // Sassenheim

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).toBe("prompt"));

    await act(async () => {
      result.current.requestGPS();
    });

    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    expect(getCurrentPosition).toHaveBeenCalled();
    expect(result.current.isUsingGPS).toBe(true);
    expect(result.current.coords?.lat).toBeCloseTo(52.2239, 3);
  });

  it("requestGPS() → GPS verleend → slaat 'gps' voorkeur op in localStorage", async () => {
    mockGeolocationSuccess(52.2239, 4.5208);

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).toBe("prompt"));

    await act(async () => {
      result.current.requestGPS();
    });

    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    expect(localStorage.getItem(PREF_KEY)).toBe(JSON.stringify("gps"));
  });

  it("requestGPS() → GPS verleend → slaat coördinaten op in localStorage", async () => {
    mockGeolocationSuccess(52.2239, 4.5208);

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).not.toBe("loading"));

    await act(async () => {
      result.current.requestGPS();
    });

    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    const raw = localStorage.getItem(COORDS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.lat).toBeCloseTo(52.2239, 3);
  });

  it("requestGPS() → GPS geweigerd → valt terug op Lisse", async () => {
    mockGeolocationError();

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).not.toBe("loading"));

    await act(async () => {
      result.current.requestGPS();
    });

    await waitFor(() => expect(result.current.permissionStatus).toBe("denied"));
    expect(result.current.nearestCity).toBe("Lisse");
    expect(result.current.isUsingGPS).toBe(false);
  });

  it("requestGPS() → GPS geweigerd → slaat 'lisse' voorkeur op", async () => {
    mockGeolocationError();

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).not.toBe("loading"));

    await act(async () => {
      result.current.requestGPS();
    });

    await waitFor(() => expect(result.current.permissionStatus).toBe("denied"));
    expect(localStorage.getItem(PREF_KEY)).toBe(JSON.stringify("lisse"));
  });

  it("requestGPS() zonder navigator.geolocation valt terug op Lisse", async () => {
    removeGeolocation();

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).not.toBe("loading"));

    await act(async () => {
      result.current.requestGPS();
    });

    await waitFor(() => expect(result.current.permissionStatus).toBe("denied"));
    expect(result.current.isUsingGPS).toBe(false);
  });

  // ── useLisse ──────────────────────────────────────────────────────────────

  it("useLisse() → stelt Lisse in en slaat voorkeur op", async () => {
    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).not.toBe("loading"));

    await act(async () => {
      result.current.useLisse();
    });

    await waitFor(() => expect(result.current.permissionStatus).toBe("denied"));
    expect(result.current.nearestCity).toBe("Lisse");
    expect(result.current.isUsingGPS).toBe(false);
    expect(localStorage.getItem(PREF_KEY)).toBe(JSON.stringify("lisse"));
  });

  // ── nearestCity berekening ────────────────────────────────────────────────

  it("nearestCity is 'Lisse' bij Lisse-coördinaten", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify("gps"));
    localStorage.setItem(COORDS_KEY, JSON.stringify({
      lat: LISSE.lat, lng: LISSE.lng, timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    expect(result.current.nearestCity).toBe("Lisse");
  });

  it("nearestCity is 'Noordwijk' bij Noordwijk-coördinaten", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify("gps"));
    localStorage.setItem(COORDS_KEY, JSON.stringify({
      lat: 52.2378, lng: 4.4436, timestamp: Date.now(), // Noordwijk
    }));

    const { result } = renderHook(() => useUserLocation());
    await waitFor(() => expect(result.current.permissionStatus).toBe("granted"));
    expect(result.current.nearestCity).toBe("Noordwijk");
  });
});
