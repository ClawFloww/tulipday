"use server";

// Server actions voor de Afbeeldingen-tab in het admin-paneel.
//
// De upload loopt bewust via een server action met de service-role client:
// het admin-paneel draait client-side op de anon key (zie supabase-admin-client),
// en de storage-policies op `location-images` staan geen anonieme insert toe.
// De browser comprimeert de foto eerst, hier gaat alleen de kant-en-klare
// JPEG naar Storage.

import { getAdminClient } from "@/lib/supabase-admin-client";

const BUCKET = "location-images";

export type ImageAuditKind = "location" | "route";

export interface ImageAuditItem {
  kind:       ImageAuditKind;
  id:         string;
  title:      string;
  slug:       string;
  group:      string;          // category bij locaties, activity bij routes
  imageUrl:   string | null;
  sharedWith: number;          // aantal andere items met dezelfde URL (0 = uniek)
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function adminGetImageAudit(): Promise<ImageAuditItem[]> {
  const sb = getAdminClient();

  const [locRes, routeRes] = await Promise.all([
    sb.from("locations").select("id, title, slug, category, image_url").eq("is_active", true),
    sb.from("routes").select("id, title, slug, activity, route_type, cover_image_url").eq("is_active", true),
  ]);
  if (locRes.error)   throw locRes.error;
  if (routeRes.error) throw routeRes.error;

  const items: ImageAuditItem[] = [
    ...(locRes.data ?? []).map((l) => ({
      kind:       "location" as const,
      id:         l.id,
      title:      l.title,
      slug:       l.slug,
      group:      l.category ?? "—",
      imageUrl:   l.image_url || null,
      sharedWith: 0,
    })),
    ...(routeRes.data ?? []).map((r) => ({
      kind:       "route" as const,
      id:         r.id,
      title:      r.title,
      slug:       r.slug,
      group:      r.activity ?? r.route_type ?? "—",
      imageUrl:   r.cover_image_url || null,
      sharedWith: 0,
    })),
  ];

  // Tel per URL hoe vaak hij voorkomt — locaties en routes apart, want een
  // route die toevallig dezelfde foto als een locatie heeft is geen probleem.
  for (const kind of ["location", "route"] as const) {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (it.kind !== kind || !it.imageUrl) continue;
      counts.set(it.imageUrl, (counts.get(it.imageUrl) ?? 0) + 1);
    }
    for (const it of items) {
      if (it.kind !== kind || !it.imageUrl) continue;
      it.sharedWith = (counts.get(it.imageUrl) ?? 1) - 1;
    }
  }

  return items.sort((a, b) => a.title.localeCompare(b.title, "nl"));
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function adminUploadImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const kind = formData.get("kind") as ImageAuditKind | null;
  const id   = formData.get("id")   as string | null;
  const slug = formData.get("slug") as string | null;
  const file = formData.get("file") as File | null;

  if (!kind || !id || !file) return { error: "Ontbrekende velden" };
  if (!file.type.startsWith("image/")) return { error: "Geen afbeelding" };

  const sb = getAdminClient();

  // Timestamp in het pad zodat een vervangen foto niet blijft hangen in caches.
  const safeSlug = (slug || id).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const path     = kind === "route"
    ? `routes/${safeSlug}-${Date.now()}.jpg`
    : `admin/${safeSlug}-${Date.now()}.jpg`;

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, file, { contentType: "image/jpeg", upsert: false });
  if (upErr) return { error: upErr.message };

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);
  const url = urlData.publicUrl;

  const { error: dbErr } = kind === "route"
    ? await sb.from("routes").update({ cover_image_url: url }).eq("id", id)
    : await sb.from("locations").update({ image_url: url }).eq("id", id);
  if (dbErr) return { error: dbErr.message };

  return { url };
}

// ─── Losse URL koppelen ───────────────────────────────────────────────────────
// Voor stockfoto's die al ergens online staan, of een handmatig geüploade URL.

export async function adminSetImageUrl(
  kind: ImageAuditKind,
  id: string,
  url: string
): Promise<{ error?: string }> {
  const clean = url.trim();
  if (clean && !/^https?:\/\//i.test(clean)) return { error: "URL moet met http(s):// beginnen" };

  const sb = getAdminClient();
  const { error } = kind === "route"
    ? await sb.from("routes").update({ cover_image_url: clean || null }).eq("id", id)
    : await sb.from("locations").update({ image_url: clean || null }).eq("id", id);

  return { error: error?.message };
}
