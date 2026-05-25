"use client";

// Query-helpers voor de Partner Portal — uitsluitend client-side. RLS-policies
// in de database garanderen dat een ingelogde partner enkel eigen data ziet
// en kan inserten. Insert-mutators throwen op fouten zodat de aanroepende
// component netjes een vriendelijke melding kan tonen.

import { supabase } from "@/lib/supabase";
import type {
  BloomPhase,
  CrowdLevel,
  CurrentBloomStatus,
  CurrentOperationalStatus,
  OperationalStatus,
} from "./types";

/** Haalt de meest recente operationele status voor één partner_location op. */
export async function getCurrentOperationalStatus(
  partnerLocationId: string,
): Promise<CurrentOperationalStatus | null> {
  const { data, error } = await supabase
    .from("current_operational_status")
    .select("*")
    .eq("partner_location_id", partnerLocationId)
    .maybeSingle<CurrentOperationalStatus>();
  if (error) return null;
  return data;
}

/** Haalt de meest recente bloeistatus voor één locatie op. */
export async function getCurrentBloomStatus(
  locationId: string,
): Promise<CurrentBloomStatus | null> {
  const { data, error } = await supabase
    .from("current_bloom_status")
    .select("*")
    .eq("location_id", locationId)
    .maybeSingle<CurrentBloomStatus>();
  if (error) return null;
  return data;
}

export async function insertOperationalUpdate(input: {
  partnerLocationId: string;
  status:            OperationalStatus;
  crowdLevel:        CrowdLevel | null;
  notes:             string | null;
  createdBy:         string;
}): Promise<void> {
  const { error } = await supabase.from("operational_updates").insert({
    partner_location_id: input.partnerLocationId,
    status:              input.status,
    crowd_level:         input.crowdLevel,
    notes:               input.notes,
    created_by:          input.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function insertBloomUpdate(input: {
  partnerLocationId: string;
  locationId:        string;
  phase:             BloomPhase;
  notes:             string | null;
  createdBy:         string;
}): Promise<void> {
  const { error } = await supabase.from("bloom_updates").insert({
    partner_location_id: input.partnerLocationId,
    location_id:         input.locationId,
    phase:               input.phase,
    notes:               input.notes,
    source:              "partner",
    created_by:          input.createdBy,
  });
  if (error) throw new Error(error.message);
}
