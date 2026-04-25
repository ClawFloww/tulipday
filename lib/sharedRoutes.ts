import { supabase } from "./supabase";
import type { CustomRoute } from "./customRoutes";

export interface SharedRoute {
  id: string;
  share_id: string;
  name: string;
  waypoints: [number, number][];
  cycling: { duration: number; distance: number } | null;
  walking: { duration: number; distance: number } | null;
  driving: { duration: number; distance: number } | null;
  created_at: string;
}

/** Sla route op in Supabase en geef share_id terug */
export async function shareCustomRoute(route: CustomRoute): Promise<string | null> {
  const { data, error } = await supabase
    .from("shared_routes")
    .insert({
      name:      route.name,
      waypoints: route.waypoints,
      cycling:   route.cycling,
      walking:   route.walking,
      driving:   route.driving,
    })
    .select("share_id")
    .single();

  if (error || !data) return null;
  return data.share_id as string;
}

/** Haal gedeelde route op via share_id */
export async function getSharedRoute(shareId: string): Promise<SharedRoute | null> {
  const { data } = await supabase
    .from("shared_routes")
    .select("*")
    .eq("share_id", shareId)
    .single();
  return (data as SharedRoute) ?? null;
}
