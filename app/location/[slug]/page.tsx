import { supabase } from "@/lib/supabase";
import { Location } from "@/lib/types";
import { LocationDetailClient } from "./LocationDetailClient";

export default async function LocationDetailPage({ params }: { params: { slug: string } }) {
  const { data } = await supabase
    .from("locations")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  return <LocationDetailClient location={(data ?? null) as Location | null} />;
}
