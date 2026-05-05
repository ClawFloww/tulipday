/**
 * Tests voor hooks/useWeather.ts
 *
 * Kritiekheid: HOOG
 * - useWeather is de enige ingang voor weerdata in de app.
 *   Als de cache-logica kapot gaat, lekt de app API-calls per component-mount.
 *   Als fetchWeather faalt zonder fallback, ziet de gebruiker een kapotte weerwidget.
 *
 * Open-Meteo wordt gemockt via vi.stubGlobal("fetch") zodat er geen netwerk nodig is.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWeather } from "@/hooks/useWeather";

// ── Open-Meteo mock-respons ───────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

// Minimale respons die parseOpenMeteo kan verwerken
function makeMockApiResponse(lat = 52.26, lng = 4.56) {
  const dates = [today, "2099-01-01", "2099-01-02", "2099-01-03", "2099-01-04", "2099-01-05", "2099-01-06"];
  return {
    latitude:  lat,
    longitude: lng,
    current_weather: undefined, // parseOpenMeteo gebruikt current_units/current keys
    current: {
      temperature_2m:    16,
      windspeed_10m:     12,
      winddirection_10m: 270,
      precipitation:     0,
      weathercode:       1,
    },
    daily: {
      time:                  dates,
      temperature_2m_max:    [17, 18, 15, 14, 19, 20, 16],
      temperature_2m_min:    [10, 11, 9,  8,  12, 13, 10],
      precipitation_sum:     [0,  1,  2,  0,  0,  0,  0.5],
      windspeed_10m_max:     [12, 15, 20, 10, 8,  9,  11],
      weathercode:           [1,  2,  3,  0,  1,  0,  2],
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stubFetchSuccess(response = makeMockApiResponse()) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok:   true,
    json: async () => response,
  }));
}

function stubFetchError(status = 503) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok:     false,
    status,
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useWeather", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Initiële laadtoestand ─────────────────────────────────────────────────

  it("begint in laadtoestand (isLoading=true, current=null)", () => {
    stubFetchSuccess();
    const { result } = renderHook(() => useWeather());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.current).toBeNull();
  });

  // ── Succesvolle API-fetch ─────────────────────────────────────────────────

  it("vult state na succesvolle fetch", async () => {
    stubFetchSuccess();
    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.current).not.toBeNull();
    expect(result.current.current?.temperature).toBe(16);
    expect(result.current.error).toBeNull();
  });

  it("zet daily forecasts na succesvolle fetch", async () => {
    stubFetchSuccess();
    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.daily.length).toBeGreaterThan(0);
  });

  it("stelt lastUpdated in na succesvolle fetch", async () => {
    stubFetchSuccess();
    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  // ── Cache-treffer ─────────────────────────────────────────────────────────

  it("gebruikt cache als die vers is (geen API-call)", async () => {
    stubFetchSuccess();

    const lat = 52.2553, lng = 4.5573;
    const key = `tulipday_weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;

    // Schrijf verse cache-data
    const cachedCurrent = {
      temperature:   14,
      windspeed:     8,
      winddirection: 180,
      precipitation: 0,
      weathercode:   0,
      cyclingScore:  90,
      cyclingLabel:  "Uitstekend",
      walkingScore:  88,
      walkingLabel:  "Uitstekend",
    };
    const cachePayload = {
      current:   cachedCurrent,
      daily:     [],
      timestamp: Date.now(), // nu → vers
    };
    localStorage.setItem(key, JSON.stringify(cachePayload));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWeather({ lat, lng }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Fetch mag niet aangeroepen zijn dankzij cache-treffer
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.current?.temperature).toBe(14);
  });

  it("slaat weerdata op in locatie-specifieke localStorage-key", async () => {
    stubFetchSuccess();
    const lat = 52.26, lng = 4.56;

    const { result } = renderHook(() => useWeather({ lat, lng }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const key = `tulipday_weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const raw = localStorage.getItem(key);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveProperty("current");
    expect(parsed).toHaveProperty("timestamp");
  });

  // ── Verlopen cache ────────────────────────────────────────────────────────

  it("haalt opnieuw op als de cache verlopen is (> 30 min oud)", async () => {
    const lat = 52.2553, lng = 4.5573;
    const key = `tulipday_weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;

    const expiredTimestamp = Date.now() - 31 * 60 * 1000; // 31 min geleden
    localStorage.setItem(key, JSON.stringify({
      current:   { temperature: 5 },
      daily:     [],
      timestamp: expiredTimestamp,
    }));

    stubFetchSuccess(makeMockApiResponse(lat, lng));

    const { result } = renderHook(() => useWeather({ lat, lng }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // De verse API-data heeft temperatuur 16, niet de gecachte 5
    expect(result.current.current?.temperature).toBe(16);
  });

  // ── Foutafhandeling ───────────────────────────────────────────────────────

  it("zet error-bericht bij HTTP-fout", async () => {
    stubFetchError(503);
    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.current).toBeNull();
  });

  it("zet error-bericht als fetch zelf gooit (netwerk kapot)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });

  // ── Fallback naar Lisse ───────────────────────────────────────────────────

  it("valt terug op Lisse-coördinaten als er geen coords opgegeven zijn", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => makeMockApiResponse(52.26, 4.56),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWeather()); // geen coords
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // URL moet Lisse-coördinaten bevatten (52.2553, 4.5573)
    const url = fetchMock.mock.calls[0]?.[0] as string;
    if (url) {
      expect(url).toContain("52.2553");
      expect(url).toContain("4.5573");
    }
  });

  it("valt terug op Lisse-coördinaten als coords null zijn", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => makeMockApiResponse(),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWeather(null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url = fetchMock.mock.calls[0]?.[0] as string;
    if (url) {
      expect(url).toContain("52.2553"); // Lisse lat
    }
  });

  // ── Verschillende locaties gebruiken aparte cache-keys ────────────────────

  it("verschillende locaties slaan naar aparte cache-keys", async () => {
    stubFetchSuccess();

    const { result: r1 } = renderHook(() => useWeather({ lat: 52.26, lng: 4.56 }));
    const { result: r2 } = renderHook(() => useWeather({ lat: 52.30, lng: 4.60 }));

    await waitFor(() => expect(r1.current.isLoading).toBe(false));
    await waitFor(() => expect(r2.current.isLoading).toBe(false));

    const key1 = localStorage.getItem("tulipday_weather_52.26_4.56");
    const key2 = localStorage.getItem("tulipday_weather_52.30_4.60");
    expect(key1).not.toBeNull();
    expect(key2).not.toBeNull();
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  it("refresh() haalt opnieuw vers weerdata op", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => makeMockApiResponse(),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWeather({ lat: 52.26, lng: 4.56 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = fetchMock.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
