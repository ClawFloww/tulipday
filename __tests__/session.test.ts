/**
 * Tests voor lib/session.ts en lib/premium.ts
 *
 * Kritiekheid: HOOG
 * - getOrCreateSessionId wordt gebruikt voor ALLE opgeslagen items en de premium check.
 *   Als dit breekt kunnen gebruikers niets opslaan en valt de premium gate weg.
 * - isPremium bepaalt of premium features zichtbaar zijn.
 *   Een false negative vergrendelt betalende gebruikers; een false positive geeft
 *   gratis toegang aan niet-betalende gebruikers.
 * - Beide functies moeten graceful omgaan met SSR (window undefined).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getOrCreateSessionId } from "@/lib/session";
import { isPremium, FREE_LOCATION_LIMIT, FREE_ROUTE_LIMIT } from "@/lib/premium";

// ── getOrCreateSessionId ──────────────────────────────────────────────────────

describe("getOrCreateSessionId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maakt een nieuw UUID aan bij de eerste aanroep", () => {
    const id = getOrCreateSessionId();
    expect(id).toBeTruthy();
    // UUID v4 formaat: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("geeft dezelfde ID terug bij een tweede aanroep", () => {
    const id1 = getOrCreateSessionId();
    const id2 = getOrCreateSessionId();
    expect(id1).toBe(id2);
  });

  it("slaat de ID op in localStorage onder de juiste key", () => {
    const id = getOrCreateSessionId();
    expect(localStorage.getItem("tulipday_session_id")).toBe(id);
  });

  it("gebruikt een bestaande ID uit localStorage", () => {
    const bestaandeId = "bestaande-test-id-123";
    localStorage.setItem("tulipday_session_id", bestaandeId);
    expect(getOrCreateSessionId()).toBe(bestaandeId);
  });

  it("geeft een lege string terug bij SSR (window undefined)", () => {
    // Simuleer SSR: verwijder window tijdelijk
    const originalWindow = global.window;
    // @ts-expect-error – opzettelijk window verwijderen voor SSR-test
    delete global.window;

    const id = getOrCreateSessionId();
    expect(id).toBe("");

    global.window = originalWindow;
  });

  it("twee opeenvolgende fresh sessions krijgen unieke IDs", () => {
    const id1 = getOrCreateSessionId();
    localStorage.clear();
    const id2 = getOrCreateSessionId();
    expect(id1).not.toBe(id2);
  });
});

// ── isPremium ─────────────────────────────────────────────────────────────────

describe("isPremium", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("geeft false als localStorage leeg is", () => {
    expect(isPremium()).toBe(false);
  });

  it("geeft true als localStorage 'tulipday_premium' = 'true' bevat", () => {
    localStorage.setItem("tulipday_premium", "true");
    expect(isPremium()).toBe(true);
  });

  it("geeft false als localStorage 'tulipday_premium' = 'false' bevat", () => {
    localStorage.setItem("tulipday_premium", "false");
    expect(isPremium()).toBe(false);
  });

  it("geeft false voor een willekeurige andere waarde", () => {
    localStorage.setItem("tulipday_premium", "yes");
    expect(isPremium()).toBe(false);

    localStorage.setItem("tulipday_premium", "1");
    expect(isPremium()).toBe(false);
  });

  it("geeft false bij SSR (window undefined)", () => {
    const originalWindow = global.window;
    // @ts-expect-error – opzettelijk window verwijderen
    delete global.window;

    expect(isPremium()).toBe(false);

    global.window = originalWindow;
  });
});

// ── Constanten ────────────────────────────────────────────────────────────────

describe("Premium constanten", () => {
  it("FREE_LOCATION_LIMIT is 10", () => {
    expect(FREE_LOCATION_LIMIT).toBe(10);
  });

  it("FREE_ROUTE_LIMIT is 2", () => {
    expect(FREE_ROUTE_LIMIT).toBe(2);
  });

  it("FREE_LOCATION_LIMIT > FREE_ROUTE_LIMIT (routes zijn schaarser gratis)", () => {
    expect(FREE_LOCATION_LIMIT).toBeGreaterThan(FREE_ROUTE_LIMIT);
  });
});
