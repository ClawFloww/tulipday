/**
 * Tests voor lib/customRoutes.ts en lib/sharedRoutes.ts
 *
 * Kritiekheid: HOOG
 * - customRoutes.ts beheert alle gebruikersroutes in localStorage.
 *   Als getCustomRoutes() kapot gaat, zijn alle opgeslagen routes weg bij elke pageload.
 *   Als saveCustomRoute() kapot gaat, kan de gebruiker geen nieuwe route opslaan.
 * - sharedRoutes.ts koppelt localStorage-routes aan Supabase share_ids.
 *   Als shareCustomRoute() null teruggeeft, kan de gebruiker zijn route niet delen.
 *
 * Supabase wordt gemockt zodat sharedRoutes getest kan worden zonder netwerk.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCustomRoutes,
  saveCustomRoute,
  deleteCustomRoute,
  updateCustomRoute,
  type CustomRoute,
} from "@/lib/customRoutes";

// ── customRoutes ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "tulipday_custom_routes";

function makeRouteData(): Omit<CustomRoute, "id" | "createdAt"> {
  return {
    name:      "Testroute Lisse",
    waypoints: [[4.55, 52.25], [4.56, 52.26]],
    cycling:   { duration: 1800, distance: 8200 },
    walking:   null,
    driving:   null,
  };
}

describe("getCustomRoutes", () => {
  beforeEach(() => localStorage.clear());

  it("geeft een lege array als localStorage leeg is", () => {
    expect(getCustomRoutes()).toEqual([]);
  });

  it("geeft opgeslagen routes terug", () => {
    const routes = [{ id: "1", name: "Route A", waypoints: [], createdAt: new Date().toISOString(), cycling: null, walking: null, driving: null }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    expect(getCustomRoutes()).toHaveLength(1);
    expect(getCustomRoutes()[0].name).toBe("Route A");
  });

  it("geeft een lege array bij corrupte JSON", () => {
    localStorage.setItem(STORAGE_KEY, "dit is geen json {{{");
    expect(getCustomRoutes()).toEqual([]);
  });

  it("geeft een lege array als de waarde null is", () => {
    localStorage.setItem(STORAGE_KEY, "null");
    // JSON.parse("null") = null → route.length gooit geen fout
    // De implementatie doet: raw ? JSON.parse(raw) : [] — null is falsy
    // Dus het geeft [] terug
    expect(Array.isArray(getCustomRoutes())).toBe(true);
  });
});

describe("saveCustomRoute", () => {
  beforeEach(() => localStorage.clear());

  it("slaat een route op en geeft het opgeslagen object terug", () => {
    const data   = makeRouteData();
    const result = saveCustomRoute(data);

    expect(result.id).toBeTruthy();
    expect(result.name).toBe(data.name);
    expect(result.waypoints).toEqual(data.waypoints);
    expect(result.createdAt).toBeTruthy();
  });

  it("genereert een uniek UUID als id", () => {
    const r1 = saveCustomRoute(makeRouteData());
    const r2 = saveCustomRoute(makeRouteData());
    expect(r1.id).not.toBe(r2.id);
  });

  it("slaat de route op als ISO-datumstring in createdAt", () => {
    const result = saveCustomRoute(makeRouteData());
    expect(() => new Date(result.createdAt)).not.toThrow();
    expect(isNaN(new Date(result.createdAt).getTime())).toBe(false);
  });

  it("voegt de route vooraan toe (nieuwste eerst)", () => {
    saveCustomRoute({ ...makeRouteData(), name: "Route Oud" });
    saveCustomRoute({ ...makeRouteData(), name: "Route Nieuw" });
    const routes = getCustomRoutes();
    expect(routes[0].name).toBe("Route Nieuw");
    expect(routes[1].name).toBe("Route Oud");
  });

  it("persisteert de route in localStorage", () => {
    saveCustomRoute(makeRouteData());
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
  });

  it("voegt toe aan een bestaande lijst zonder te overschrijven", () => {
    saveCustomRoute({ ...makeRouteData(), name: "Route 1" });
    saveCustomRoute({ ...makeRouteData(), name: "Route 2" });
    saveCustomRoute({ ...makeRouteData(), name: "Route 3" });
    expect(getCustomRoutes()).toHaveLength(3);
  });
});

describe("deleteCustomRoute", () => {
  beforeEach(() => localStorage.clear());

  it("verwijdert de route met het opgegeven id", () => {
    const r1 = saveCustomRoute({ ...makeRouteData(), name: "Route A" });
    const r2 = saveCustomRoute({ ...makeRouteData(), name: "Route B" });
    deleteCustomRoute(r1.id);
    const remaining = getCustomRoutes();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(r2.id);
  });

  it("doet niets als het id niet bestaat", () => {
    saveCustomRoute(makeRouteData());
    deleteCustomRoute("niet-bestaand-id");
    expect(getCustomRoutes()).toHaveLength(1);
  });

  it("verwijdert alle routes als ze allemaal verwijderd worden", () => {
    const r1 = saveCustomRoute(makeRouteData());
    const r2 = saveCustomRoute(makeRouteData());
    deleteCustomRoute(r1.id);
    deleteCustomRoute(r2.id);
    expect(getCustomRoutes()).toHaveLength(0);
  });
});

describe("updateCustomRoute", () => {
  beforeEach(() => localStorage.clear());

  it("werkt de naam bij van de juiste route", () => {
    const route = saveCustomRoute(makeRouteData());
    updateCustomRoute(route.id, { name: "Nieuwe Naam" });
    const updated = getCustomRoutes().find((r) => r.id === route.id);
    expect(updated?.name).toBe("Nieuwe Naam");
  });

  it("laat andere velden ongewijzigd bij een partiële update", () => {
    const route = saveCustomRoute(makeRouteData());
    updateCustomRoute(route.id, { name: "Andere Naam" });
    const updated = getCustomRoutes().find((r) => r.id === route.id);
    expect(updated?.waypoints).toEqual(route.waypoints);
    expect(updated?.cycling).toEqual(route.cycling);
  });

  it("raakt andere routes niet aan", () => {
    const r1 = saveCustomRoute({ ...makeRouteData(), name: "Route A" });
    const r2 = saveCustomRoute({ ...makeRouteData(), name: "Route B" });
    updateCustomRoute(r1.id, { name: "Gewijzigd" });
    const routes = getCustomRoutes();
    const r2After = routes.find((r) => r.id === r2.id);
    expect(r2After?.name).toBe("Route B");
  });

  it("slaat shareId op via updateCustomRoute", () => {
    const route = saveCustomRoute(makeRouteData());
    updateCustomRoute(route.id, { shareId: "abc123" });
    const updated = getCustomRoutes().find((r) => r.id === route.id);
    expect(updated?.shareId).toBe("abc123");
  });

  it("doet niets als het id niet bestaat", () => {
    const route = saveCustomRoute(makeRouteData());
    updateCustomRoute("niet-bestaand", { name: "Fout" });
    // Oorspronkelijke route ongewijzigd
    expect(getCustomRoutes()[0].name).toBe(route.name);
  });
});

// ── sharedRoutes (Supabase gemockt) ──────────────────────────────────────────

// Mock de Supabase client VOOR de import van sharedRoutes
vi.mock("@/lib/supabase", () => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockEq     = vi.fn(() => ({ single: mockSingle }));
  const mockFrom   = vi.fn(() => ({
    insert: mockInsert,
    select: vi.fn(() => ({ eq: mockEq })),
  }));

  return {
    supabase: { from: mockFrom },
    __mocks: { mockFrom, mockInsert, mockSelect, mockSingle, mockEq },
  };
});

import { shareCustomRoute, getSharedRoute } from "@/lib/sharedRoutes";

describe("shareCustomRoute", () => {
  it("geeft share_id terug bij succesvolle Supabase insert", async () => {
    const { supabase } = await import("@/lib/supabase");
    // Configureer mock: insert → select → single → succesvol
    const single = vi.fn().mockResolvedValue({ data: { share_id: "xyz789" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert });

    const route: CustomRoute = {
      id:        "local-1",
      name:      "Mijn Route",
      waypoints: [[4.55, 52.25]],
      createdAt: new Date().toISOString(),
      cycling:   { duration: 1800, distance: 8200 },
      walking:   null,
      driving:   null,
    };

    const shareId = await shareCustomRoute(route);
    expect(shareId).toBe("xyz789");
  });

  it("geeft null terug bij Supabase-fout", async () => {
    const { supabase } = await import("@/lib/supabase");
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "DB fout" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert });

    const route: CustomRoute = {
      id: "local-2", name: "Broken", waypoints: [],
      createdAt: new Date().toISOString(),
      cycling: null, walking: null, driving: null,
    };

    const shareId = await shareCustomRoute(route);
    expect(shareId).toBeNull();
  });
});

describe("getSharedRoute", () => {
  it("geeft een SharedRoute terug als share_id gevonden wordt", async () => {
    const { supabase } = await import("@/lib/supabase");
    const mockRoute = {
      id: "supabase-uuid", share_id: "abc123",
      name: "Gedeelde Route", waypoints: [[4.55, 52.25]],
      cycling: null, walking: null, driving: null,
      created_at: new Date().toISOString(),
    };
    const single = vi.fn().mockResolvedValue({ data: mockRoute });
    const eq     = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select });

    const result = await getSharedRoute("abc123");
    expect(result).not.toBeNull();
    expect(result?.share_id).toBe("abc123");
    expect(result?.name).toBe("Gedeelde Route");
  });

  it("geeft null terug als share_id niet gevonden wordt", async () => {
    const { supabase } = await import("@/lib/supabase");
    const single = vi.fn().mockResolvedValue({ data: null });
    const eq     = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select });

    const result = await getSharedRoute("niet-bestaand");
    expect(result).toBeNull();
  });
});
