"use server";

// Server actions voor partner-beheer in /admin. Draaien uitsluitend server-side
// met de service role key, zodat we RLS kunnen omzeilen én de Supabase Auth
// admin-API mogen aanroepen (uitnodigingen versturen).
//
// We gebruiken bewust createAdminClient() uit lib/supabase-admin.ts en niet
// getAdminClient(): die laatste valt stilzwijgend terug op de anon key als de
// service role key ontbreekt. Voor het aanmaken van auth-users is die stille
// fallback een bug in plaats van een vangnet.

import { createAdminClient } from "@/lib/supabase-admin";
import type {
  AdminPartner,
  AdminPartnerUpdate,
  PartnerCategory,
  PartnerTier,
} from "@/lib/partner/types";

type Res = { error?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Zoekt een auth-user op e-mailadres. De admin-API heeft geen directe
 * getUserByEmail, dus we lopen door de pagina's tot we een match hebben.
 * Vergelijking is case-insensitief; Supabase slaat e-mail lowercase op maar
 * de admin kan hoofdletters intypen.
 */
async function findUserByEmail(
  sb: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ id: string; last_sign_in_at: string | null } | null> {
  const needle = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === needle);
    if (hit) return { id: hit.id, last_sign_in_at: hit.last_sign_in_at ?? null };

    if (data.users.length < perPage) break;
  }
  return null;
}

/** Haalt e-mail + laatste login voor een set user-ids op via de admin-API. */
async function resolveUserMeta(
  sb: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, { email: string; last_sign_in_at: string | null }>> {
  const map = new Map<string, { email: string; last_sign_in_at: string | null }>();
  if (userIds.length === 0) return map;

  const wanted = new Set(userIds);
  const perPage = 1000;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) break; // e-mails zijn nice-to-have; de lijst mag niet klappen

    for (const u of data.users) {
      if (wanted.has(u.id)) {
        map.set(u.id, {
          email: u.email ?? "—",
          last_sign_in_at: u.last_sign_in_at ?? null,
        });
      }
    }
    if (map.size === wanted.size || data.users.length < perPage) break;
  }
  return map;
}

// ─── Partners lezen ───────────────────────────────────────────────────────────

export async function adminGetPartners(): Promise<AdminPartner[]> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from("partners")
    .select(`
      id, name, contact_email, contact_phone, kvk_number, tier, active, created_at,
      partner_locations ( id, location_id, category, locations ( title, address ) ),
      partner_users ( id, user_id, role, created_at )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string; name: string; contact_email: string; contact_phone: string | null;
    kvk_number: string | null; tier: PartnerTier; active: boolean; created_at: string;
    partner_locations: Array<{
      id: string; location_id: string; category: PartnerCategory;
      locations: { title: string; address: string | null } | { title: string; address: string | null }[] | null;
    }>;
    partner_users: Array<{ id: string; user_id: string; role: string; created_at: string }>;
  }>;

  const allUserIds = rows.flatMap((p) => p.partner_users.map((u) => u.user_id));
  const meta = await resolveUserMeta(sb, allUserIds);

  return rows.map((p) => ({
    id:            p.id,
    name:          p.name,
    contact_email: p.contact_email,
    contact_phone: p.contact_phone,
    kvk_number:    p.kvk_number,
    tier:          p.tier,
    active:        p.active,
    created_at:    p.created_at,
    locations: p.partner_locations.map((pl) => {
      // PostgREST geeft de genestte relatie soms als array terug
      const l = Array.isArray(pl.locations) ? pl.locations[0] : pl.locations;
      return {
        id:          pl.id,
        location_id: pl.location_id,
        category:    pl.category,
        title:       l?.title ?? "— onbekende locatie —",
        address:     l?.address ?? null,
      };
    }),
    users: p.partner_users.map((u) => ({
      id:              u.id,
      user_id:         u.user_id,
      role:            u.role,
      created_at:      u.created_at,
      email:           meta.get(u.user_id)?.email ?? "—",
      last_sign_in_at: meta.get(u.user_id)?.last_sign_in_at ?? null,
    })),
  }));
}

/** Compacte locatielijst voor de koppel-picker (185+ rijen, dus geen select *). */
export async function adminGetLocationOptions(): Promise<
  { id: string; title: string; address: string | null; category: string | null }[]
> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("locations")
    .select("id, title, address, category")
    .eq("is_active", true)
    .order("title");
  if (error) throw error;
  return data ?? [];
}

/** Recente status-updates van één partner, voor controle in admin. */
export async function adminGetPartnerUpdates(partnerId: string): Promise<AdminPartnerUpdate[]> {
  const sb = createAdminClient();

  const { data: links } = await sb
    .from("partner_locations")
    .select("id, locations ( title )")
    .eq("partner_id", partnerId);

  const linkRows = (links ?? []) as unknown as Array<{
    id: string;
    locations: { title: string } | { title: string }[] | null;
  }>;
  if (linkRows.length === 0) return [];

  const titleByLink = new Map(
    linkRows.map((l) => {
      const loc = Array.isArray(l.locations) ? l.locations[0] : l.locations;
      return [l.id, loc?.title ?? "—"] as const;
    }),
  );
  const linkIds = linkRows.map((l) => l.id);

  const [{ data: ops }, { data: blooms }] = await Promise.all([
    sb.from("operational_updates")
      .select("id, partner_location_id, status, crowd_level, notes, created_at")
      .in("partner_location_id", linkIds)
      .order("created_at", { ascending: false })
      .limit(25),
    sb.from("bloom_updates")
      .select("id, partner_location_id, phase, notes, created_at")
      .in("partner_location_id", linkIds)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const merged: AdminPartnerUpdate[] = [
    ...(ops ?? []).map((o) => ({
      id:         o.id as string,
      kind:       "operational" as const,
      status:     o.status as string,
      crowd:      (o.crowd_level as string | null) ?? null,
      notes:      (o.notes as string | null) ?? null,
      created_at: o.created_at as string,
      title:      titleByLink.get(o.partner_location_id as string) ?? "—",
    })),
    ...(blooms ?? []).map((b) => ({
      id:         b.id as string,
      kind:       "bloom" as const,
      status:     b.phase as string,
      crowd:      null,
      notes:      (b.notes as string | null) ?? null,
      created_at: b.created_at as string,
      title:      titleByLink.get(b.partner_location_id as string) ?? "—",
    })),
  ];

  merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return merged.slice(0, 25);
}

// ─── Partners schrijven ───────────────────────────────────────────────────────

export async function adminCreatePartner(fields: {
  name:          string;
  contact_email: string;
  contact_phone: string | null;
  kvk_number:    string | null;
  tier:          PartnerTier;
}): Promise<{ id?: string; error?: string }> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("partners")
    .insert({ ...fields, contact_email: fields.contact_email.trim().toLowerCase() })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id as string };
}

export async function adminUpdatePartner(
  id: string,
  fields: Partial<{
    name:          string;
    contact_email: string;
    contact_phone: string | null;
    kvk_number:    string | null;
    tier:          PartnerTier;
    active:        boolean;
  }>,
): Promise<Res> {
  const sb = createAdminClient();
  const patch = fields.contact_email
    ? { ...fields, contact_email: fields.contact_email.trim().toLowerCase() }
    : fields;
  const { error } = await sb.from("partners").update(patch).eq("id", id);
  return error ? { error: error.message } : {};
}

/** Verwijdert de partner; koppelingen en updates gaan mee via ON DELETE CASCADE. */
export async function adminDeletePartner(id: string): Promise<Res> {
  const sb = createAdminClient();
  const { error } = await sb.from("partners").delete().eq("id", id);
  return error ? { error: error.message } : {};
}

// ─── Locatiekoppelingen ───────────────────────────────────────────────────────

export async function adminLinkLocation(
  partnerId: string,
  locationId: string,
  category: PartnerCategory,
): Promise<Res> {
  const sb = createAdminClient();
  const { error } = await sb
    .from("partner_locations")
    .insert({ partner_id: partnerId, location_id: locationId, category });
  if (error) {
    // unique(partner_id, location_id)
    if (error.code === "23505") return { error: "Deze locatie is al gekoppeld aan deze partner." };
    return { error: error.message };
  }
  return {};
}

export async function adminUnlinkLocation(partnerLocationId: string): Promise<Res> {
  const sb = createAdminClient();
  const { error } = await sb.from("partner_locations").delete().eq("id", partnerLocationId);
  return error ? { error: error.message } : {};
}

// ─── Gebruikers uitnodigen ────────────────────────────────────────────────────

/**
 * Kern van de onboarding: koppelt een e-mailadres als portal-gebruiker aan een
 * partner. Zonder deze stap loopt een partner vast op "no_partner_account",
 * want de partner_users-rij kan pas bestaan als er een auth-user is.
 *
 * Twee gevallen:
 *  - Nieuw adres → inviteUserByEmail() maakt de auth-user én mailt een link.
 *  - Bestaand adres → we zoeken de user op en koppelen alleen; de partner logt
 *    in met de gewone magic-link op /partner/login.
 *
 * `origin` komt van de client (window.location.origin) zodat previews naar hun
 * eigen deployment terugkeren in plaats van naar productie.
 */
export async function adminInvitePartnerUser(
  partnerId: string,
  email: string,
  origin: string,
): Promise<{ error?: string; outcome?: "invited" | "linked" }> {
  const sb = createAdminClient();
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: "Vul een e-mailadres in." };

  const redirectTo = `${origin.replace(/\/$/, "")}/partner/auth/callback`;

  let userId: string;
  let outcome: "invited" | "linked";

  const { data, error } = await sb.auth.admin.inviteUserByEmail(clean, { redirectTo });

  if (error) {
    // Bestaat het adres al, dan is dat geen fout maar het tweede geval.
    const existing = await findUserByEmail(sb, clean).catch(() => null);
    if (!existing) return { error: `Uitnodigen mislukt: ${error.message}` };
    userId  = existing.id;
    outcome = "linked";
  } else if (data?.user) {
    userId  = data.user.id;
    outcome = "invited";
  } else {
    return { error: "Uitnodigen mislukt: geen gebruiker teruggekregen van Supabase." };
  }

  const { error: linkErr } = await sb
    .from("partner_users")
    .upsert(
      { user_id: userId, partner_id: partnerId, role: "owner" },
      { onConflict: "user_id,partner_id" },
    );

  if (linkErr) return { error: `Gebruiker gevonden, maar koppelen mislukte: ${linkErr.message}` };

  return { outcome };
}

export async function adminRemovePartnerUser(partnerUserId: string): Promise<Res> {
  const sb = createAdminClient();
  const { error } = await sb.from("partner_users").delete().eq("id", partnerUserId);
  return error ? { error: error.message } : {};
}

/**
 * Genereert een inloglink voor een al gekoppelde gebruiker en geeft die terug.
 * generateLink() verstuurt zélf geen e-mail — het is bedoeld voor eigen mail-
 * providers. Voor support ("ik krijg de mail niet binnen") is dat juist handig:
 * de admin kopieert de link en stuurt 'm persoonlijk door.
 */
export async function adminGeneratePartnerLink(
  email: string,
  origin: string,
): Promise<{ link?: string; error?: string }> {
  const sb = createAdminClient();
  const redirectTo = `${origin.replace(/\/$/, "")}/partner/auth/callback`;

  const { data, error } = await sb.auth.admin.generateLink({
    type:  "magiclink",
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  });
  if (error) return { error: error.message };

  const link = data?.properties?.action_link;
  if (!link) return { error: "Geen link teruggekregen van Supabase." };
  return { link };
}
