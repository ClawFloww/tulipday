#!/usr/bin/env npx tsx --env-file=.env.local
/**
 * Converteert route-geometrie naar BRouter-gesnapped paden.
 *
 * Gebruik:
 *   npx tsx --env-file=.env.local scripts/migrate-routes-brouter.ts
 *   npx tsx --env-file=.env.local scripts/migrate-routes-brouter.ts --live
 *   npx tsx --env-file=.env.local scripts/migrate-routes-brouter.ts --live --route-id=<id>
 *   npx tsx --env-file=.env.local scripts/migrate-routes-brouter.ts --live --activity=Wandelroute
 *   npx tsx --env-file=.env.local scripts/migrate-routes-brouter.ts --live --force
 *
 * Flags:
 *   --live          Schrijft daadwerkelijk naar de DB (zonder: dry-run)
 *   --route-id=X    Verwerk alleen route met dit UUID
 *   --activity=X    Filter op activiteitstype ("Wandelroute", "Fietsroute", …)
 *   --force         Herbereken ook routes die al een routing_profile hebben
 *   --dry-run       Expliciet dry-run (default zonder --live)
 */

import { createClient } from "@supabase/supabase-js";
import { routeViaBRouter, subsampleWaypoints } from "../lib/routing/brouter";
import { pickBRouterProfile, profileLabel } from "../lib/routing/profileMapping";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DELAY_BETWEEN_MS  = 600;   // respecteer de publieke BRouter endpoint
const MIN_POINTS_NEEDED = 2;     // routes met minder punten overslaan

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Stel NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in via .env.local");
  process.exit(1);
}

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args       = process.argv.slice(2);
const DRY_RUN    = !args.includes("--live");
const FORCE      = args.includes("--force");
const ROUTE_ID   = args.find((a) => a.startsWith("--route-id="))?.split("=")[1];
const FILTER_ACT = args.find((a) => a.startsWith("--activity="))?.split("=")[1];

// ── Supabase admin client ─────────────────────────────────────────────────────

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

// ── Route-type ────────────────────────────────────────────────────────────────

interface RouteRow {
  id:               string;
  title:            string;
  slug:             string;
  activity:         string | null;
  route_type:       string | null;
  geometry_points:  [number, number][] | null;   // [lat, lng]
  routing_profile:  string | null;
  routed_at:        string | null;
}

// ── Haal routes op ────────────────────────────────────────────────────────────

async function fetchRoutes(): Promise<RouteRow[]> {
  // Selecteer afhankelijk van of de migratie al gedraaid is
  const hasNewCols = await checkColumnExists("routing_profile");

  const select = hasNewCols
    ? "id, title, slug, activity, route_type, geometry_points, routing_profile, routed_at"
    : "id, title, slug, activity, route_type, geometry_points";

  let query = sb
    .from("routes")
    .select(select)
    .eq("is_active", true)
    .order("title");

  if (ROUTE_ID)              query = query.eq("id", ROUTE_ID);
  if (FILTER_ACT)            query = query.eq("activity", FILTER_ACT);
  if (!FORCE && hasNewCols)  query = query.is("routing_profile", null);

  const { data, error } = await query;
  if (error) throw new Error(`Supabase fout: ${error.message}`);

  return ((data ?? []) as Partial<RouteRow>[]).map((r) => ({
    id:              r.id ?? "",
    title:           r.title ?? "",
    slug:            r.slug ?? "",
    activity:        r.activity ?? null,
    route_type:      r.route_type ?? null,
    geometry_points: r.geometry_points ?? null,
    routing_profile: r.routing_profile ?? null,
    routed_at:       r.routed_at ?? null,
  }));
}

/** Controleer of een kolom bestaat via een dummy-query */
async function checkColumnExists(column: string): Promise<boolean> {
  const { error } = await sb
    .from("routes")
    .select(column)
    .limit(1);
  return !error?.message?.includes(column);
}

// ── Verwerk één route ─────────────────────────────────────────────────────────

interface RouteResult {
  slug:    string;
  title:   string;
  status:  "ok" | "skip" | "error";
  reason?: string;
  points?: number;
  distM?:  number;
  profile?: string;
}

async function processRoute(route: RouteRow): Promise<RouteResult> {
  const base = { slug: route.slug, title: route.title };

  // Controleer of er waypoints zijn
  const rawPoints = route.geometry_points;
  if (!rawPoints || rawPoints.length < MIN_POINTS_NEEDED) {
    return { ...base, status: "skip", reason: `te weinig punten (${rawPoints?.length ?? 0})` };
  }

  const profile = pickBRouterProfile(route.activity ?? route.route_type);

  if (DRY_RUN) {
    const sampled = subsampleWaypoints(rawPoints, 25);
    return {
      ...base,
      status:  "ok",
      reason:  "dry-run (niet geschreven)",
      points:  sampled.length,
      profile: profileLabel(profile),
    };
  }

  // BRouter aanroepen
  const result = await routeViaBRouter(rawPoints, profile);

  // Schrijf naar Supabase (routing_profile + routed_at alleen als de migratie is gedraaid)
  const hasNewCols = await checkColumnExists("routing_profile");
  const updatePayload: Record<string, unknown> = {
    geometry_points: result.coordinates,   // [lat, lng] — zelfde formaat als DB
  };
  if (hasNewCols) {
    updatePayload.routing_profile = profile;
    updatePayload.routed_at       = new Date().toISOString();
  }

  const { error } = await sb
    .from("routes")
    .update(updatePayload)
    .eq("id", route.id);

  if (error) throw new Error(`DB-update mislukt: ${error.message}`);

  return {
    ...base,
    status:  "ok",
    points:  result.coordinates.length,
    distM:   result.distanceMeters,
    profile: profileLabel(profile),
  };
}

// ── Hoofd ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("┌─────────────────────────────────────────────────────────────");
  console.log("│ TulipDay · BRouter route-geometrie migratie");
  console.log(`│ Modus: ${DRY_RUN ? "DRY-RUN (geen DB-wijzigingen)" : "LIVE"}`);
  if (ROUTE_ID)   console.log(`│ Filter route-id: ${ROUTE_ID}`);
  if (FILTER_ACT) console.log(`│ Filter activiteit: ${FILTER_ACT}`);
  if (FORCE)      console.log("│ Force: herbereken ook al gerouted routes");
  console.log("└─────────────────────────────────────────────────────────────\n");

  const routes = await fetchRoutes();

  if (!routes.length) {
    console.log("✓ Geen routes te verwerken (alles al gerouted, of filter matcht niets).");
    return;
  }

  console.log(`${routes.length} route${routes.length === 1 ? "" : "s"} te verwerken:\n`);

  const stats = { ok: 0, skip: 0, error: 0 };

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const prefix = `[${String(i + 1).padStart(routes.length.toString().length, " ")}/${routes.length}]`;

    process.stdout.write(`${prefix} ${route.title.slice(0, 50).padEnd(50)} … `);

    try {
      const res = await processRoute(route);

      if (res.status === "ok") {
        const info = res.distM
          ? `${res.points} punten · ${formatDist(res.distM)} · ${res.profile}`
          : `${res.points} waypoints · ${res.profile} · ${res.reason ?? ""}`;
        console.log(`✓ ${info}`);
        stats.ok++;
      } else {
        console.log(`⊘ overgeslagen (${res.reason})`);
        stats.skip++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ FOUT: ${msg.slice(0, 100)}`);
      stats.error++;
    }

    // Fair-use delay (niet voor de laatste)
    if (i < routes.length - 1 && !DRY_RUN) {
      await sleep(DELAY_BETWEEN_MS);
    }
  }

  console.log(`
┌─────────────────────────────────────────────────────────────
│ Klaar
│   ✓ Verwerkt:    ${stats.ok}
│   ⊘ Overgeslagen: ${stats.skip}
│   ✗ Fouten:      ${stats.error}
└─────────────────────────────────────────────────────────────`);

  if (DRY_RUN && stats.ok > 0) {
    console.log("\nVoeg --live toe om daadwerkelijk te schrijven naar de DB.");
  }
  if (stats.error > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Onverwachte fout:", err instanceof Error ? err.message : err);
  process.exit(1);
});
