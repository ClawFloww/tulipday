"use server";

import { getAdminClient } from "@/lib/supabase-admin-client";

type Res = { error?: string };

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function verifyAdminPassword(password: string): Promise<boolean> {
  return password === process.env.ADMIN_PASSWORD;
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function adminGetLocations() {
  const sb = getAdminClient();
  const { data, error } = await sb.from("locations").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminUpdateBloomStatus(id: string, status: string): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.from("locations").update({ bloom_status: status }).eq("id", id);
  if (error) throw error;
}

export async function adminBulkUpdateBloomStatus(ids: string[], status: string): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.from("locations").update({ bloom_status: status }).in("id", ids);
  if (error) throw error;
}

export async function adminCreateLocation(fields: Record<string, unknown>): Promise<Res> {
  const { error } = await getAdminClient().from("locations").insert(fields);
  return { error: error?.message };
}

export async function adminUpdateLocation(id: string, fields: Record<string, unknown>): Promise<Res> {
  const { error } = await getAdminClient().from("locations").update(fields).eq("id", id);
  return { error: error?.message };
}

export async function adminDeleteLocation(id: string): Promise<Res> {
  const { error } = await getAdminClient().from("locations").delete().eq("id", id);
  return { error: error?.message };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function adminGetRoutes() {
  const sb = getAdminClient();
  const { data, error } = await sb.from("routes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminCreateRoute(fields: Record<string, unknown>): Promise<{ id?: string; error?: string }> {
  const { data, error } = await getAdminClient().from("routes").insert(fields).select("id").single();
  return { id: data?.id, error: error?.message };
}

export async function adminUpdateRoute(id: string, fields: Record<string, unknown>): Promise<Res> {
  const { error } = await getAdminClient().from("routes").update(fields).eq("id", id);
  return { error: error?.message };
}

export async function adminDeleteRoute(id: string): Promise<Res> {
  const { error } = await getAdminClient().from("routes").delete().eq("id", id);
  return { error: error?.message };
}

// ─── Route stops ──────────────────────────────────────────────────────────────

export async function adminGetRouteStops(routeId: string) {
  const { data, error } = await getAdminClient()
    .from("route_stops")
    .select("id, sort_order, location_id, locations(id, title, image_url, category)")
    .eq("route_id", routeId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: string;
    sort_order: number;
    location_id: string;
    locations: { id: string; title: string; image_url: string | null; category: string };
  }>;
}

export async function adminAddRouteStop(routeId: string, locationId: string, sortOrder: number): Promise<Res> {
  const { error } = await getAdminClient().from("route_stops").insert({ route_id: routeId, location_id: locationId, sort_order: sortOrder });
  return { error: error?.message };
}

export async function adminRemoveRouteStop(stopId: string): Promise<Res> {
  const { error } = await getAdminClient().from("route_stops").delete().eq("id", stopId);
  return { error: error?.message };
}

export async function adminReorderStops(stops: { id: string; sort_order: number }[]): Promise<Res> {
  const sb = getAdminClient();
  const results = await Promise.all(
    stops.map((s) => sb.from("route_stops").update({ sort_order: s.sort_order }).eq("id", s.id))
  );
  const err = results.find((r) => r.error);
  return { error: err?.error?.message };
}

// ─── Featured ─────────────────────────────────────────────────────────────────

export async function adminSetFeatured(
  table: "locations" | "routes",
  id: string,
  featured: boolean
): Promise<Res> {
  const { error } = await getAdminClient().from(table).update({ is_featured: featured }).eq("id", id);
  return { error: error?.message };
}
