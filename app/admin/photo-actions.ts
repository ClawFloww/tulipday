"use server";

import { getAdminClient } from "@/lib/supabase-admin-client";
import { LocationPhoto } from "@/lib/types";

export async function adminGetPhotos(status: string): Promise<LocationPhoto[]> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("location_photos")
    .select("*, locations(title)")
    .eq("status", status)
    .order("uploaded_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as LocationPhoto[];
}

export async function adminGetPendingCount(): Promise<number> {
  const sb = getAdminClient();
  const { count } = await sb
    .from("location_photos")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export async function adminApprovePhoto(id: string): Promise<void> {
  const sb = getAdminClient();

  // Fetch photo to check bloom_confirmed and location_id
  const { data: photo } = await sb
    .from("location_photos")
    .select("location_id, bloom_confirmed")
    .eq("id", id)
    .single();

  const { error } = await sb
    .from("location_photos")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: "admin" })
    .eq("id", id);
  if (error) throw error;

  // Auto-update bloom_status based on crowd-sourced confirmations
  if (photo?.bloom_confirmed && photo.location_id) {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from("location_photos")
      .select("*", { count: "exact", head: true })
      .eq("location_id", photo.location_id)
      .eq("status", "approved")
      .eq("bloom_confirmed", true)
      .gte("approved_at", cutoff);

    const confirmed = (count ?? 0) + 1; // +1 for the one we just approved
    let newStatus: string | null = null;
    if (confirmed >= 6) newStatus = "peak";
    else if (confirmed >= 3) newStatus = "blooming";
    else if (confirmed >= 1) newStatus = "early";

    if (newStatus) {
      await sb.from("locations").update({ bloom_status: newStatus }).eq("id", photo.location_id);
    }
  }
}

export async function adminRejectPhoto(id: string, reason: string): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb
    .from("location_photos")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id);
  if (error) throw error;
}

export async function adminEnsurePhotoBucket(): Promise<void> {
  const sb = getAdminClient();
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "location-photos");
  if (!exists) {
    await sb.storage.createBucket("location-photos", {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/webp", "image/heic"],
      fileSizeLimit: 8 * 1024 * 1024,
    });
  }
}
