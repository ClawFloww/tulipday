"use client";

// Client-side auth-helpers voor de Partner Portal. We werken in MVP-fase
// volledig client-side: magic-link redirect wordt door @supabase/supabase-js
// automatisch verwerkt zodra de client geladen wordt op de callback-URL.

import { supabase } from "@/lib/supabase";
import type { Partner, PartnerLocation, PartnerSession } from "./types";

/**
 * Haalt de huidige Supabase-sessie op én leest de gekoppelde partner +
 * partner_locations. Returnt null als de gebruiker niet ingelogd is of als
 * er geen partner_users-koppeling bestaat voor het auth-id.
 */
export async function getPartnerSession(): Promise<PartnerSession | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const userId = session.user.id;

  // Zoek welke partner aan deze user gekoppeld is via partner_users.
  // RLS limiteert dit automatisch tot de eigen rij.
  const { data: link, error: linkErr } = await supabase
    .from("partner_users")
    .select("partner_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (linkErr || !link) return null;

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("*")
    .eq("id", link.partner_id)
    .maybeSingle<Partner>();

  if (partnerErr || !partner) return null;

  // Partner_locations met geneste location-info voor de kop van het dashboard
  const { data: locs } = await supabase
    .from("partner_locations")
    .select("id, partner_id, location_id, category, created_at, location:locations(id, title, address, category, image_url)")
    .eq("partner_id", partner.id);

  const partnerLocations: PartnerLocation[] = (locs ?? []).map((row) => ({
    id:          row.id,
    partner_id:  row.partner_id,
    location_id: row.location_id,
    category:    row.category,
    created_at:  row.created_at,
    // Supabase geeft genest een array terug bij joins ondanks de single-row relatie
    location:    Array.isArray(row.location) ? row.location[0] : row.location,
  }));

  return {
    userId,
    email: session.user.email ?? "",
    partner,
    partnerLocations,
  };
}

export async function partnerSignOut(): Promise<void> {
  await supabase.auth.signOut();
}
