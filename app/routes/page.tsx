import { supabase } from "@/lib/supabase";
import { Route } from "@/lib/types";
import { RoutesClient } from "./RoutesClient";

export default async function RoutesPage() {
  const { data } = await supabase
    .from("routes")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false });

  return <RoutesClient routes={(data ?? []) as Route[]} />;
}
