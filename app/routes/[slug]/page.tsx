import { supabase } from "@/lib/supabase";
import { Route, RouteStop } from "@/lib/types";
import { RouteDetailClient } from "./RouteDetailClient";

export default async function RouteDetailPage({ params }: { params: { slug: string } }) {
  const { data: route } = await supabase
    .from("routes")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  if (!route) {
    return <RouteDetailClient route={null as unknown as Route} stops={[]} />;
  }

  const { data: stops } = await supabase
    .from("route_stops")
    .select("id, sort_order, locations(*)")
    .eq("route_id", route.id)
    .order("sort_order");

  return <RouteDetailClient route={route as Route} stops={(stops as unknown as RouteStop[]) ?? []} />;
}
