"use client";

// Partner-beheer voor het admin-paneel. Losstaand component zodat
// app/admin/page.tsx (al ~1600 regels) niet verder groeit.
//
// De belangrijkste flow hier is "gebruiker uitnodigen": zonder een
// partner_users-koppeling loopt elke partner-login vast op
// "no_partner_account", en die koppeling kan pas bestaan als er een
// auth-user is. adminInvitePartnerUser() doet beide in één stap.

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  Mail,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  adminCreatePartner,
  adminDeletePartner,
  adminGeneratePartnerLink,
  adminGetLocationOptions,
  adminGetPartnerUpdates,
  adminGetPartners,
  adminInvitePartnerUser,
  adminLinkLocation,
  adminRemovePartnerUser,
  adminUnlinkLocation,
  adminUpdatePartner,
} from "@/app/admin/partner-actions";
import type {
  AdminPartner,
  AdminPartnerUpdate,
  PartnerCategory,
  PartnerTier,
} from "@/lib/partner/types";

type Toast = (msg: string, type?: "ok" | "err") => void;

const CATEGORIES: { id: PartnerCategory; label: string }[] = [
  { id: "horeca",        label: "Horeca"        },
  { id: "fietsverhuur",  label: "Fietsverhuur"  },
  { id: "attractie",     label: "Attractie"     },
  { id: "recreatiepark", label: "Recreatiepark" },
  { id: "accommodatie",  label: "Accommodatie"  },
  { id: "bollenveld",    label: "Bollenveld"    },
  { id: "evenement",     label: "Evenement"     },
];

const TIERS: { id: PartnerTier; label: string; color: string }[] = [
  { id: "free",     label: "Free",     color: "bg-gray-100 text-gray-600 border-gray-200"     },
  { id: "featured", label: "Featured", color: "bg-amber-50 text-amber-700 border-amber-200"   },
  { id: "premium",  label: "Premium",  color: "bg-violet-50 text-violet-700 border-violet-200" },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "zojuist";
  if (s < 3600)  return `${Math.floor(s / 60)} min geleden`;
  if (s < 86400) return `${Math.floor(s / 3600)} uur geleden`;
  return `${Math.floor(s / 86400)} dgn geleden`;
}

export function PartnersSection({ toast }: { toast: Toast }) {
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [locations, setLocations] = useState<
    { id: string; title: string; address: string | null; category: string | null }[]
  >([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [adding, setAdding]     = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l] = await Promise.all([adminGetPartners(), adminGetLocationOptions()]);
      setPartners(p);
      setLocations(l);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Laden mislukt", "err");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.contact_email.toLowerCase().includes(q) ||
      p.locations.some((l) => l.title.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Kop */}
      <div className="flex items-center gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op partner, e-mail of locatie…"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-300"
        />
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors"
        >
          <Plus size={15} /> Nieuwe partner
        </button>
      </div>

      {adding && (
        <NewPartnerForm
          onCancel={() => setAdding(false)}
          onCreated={() => { setAdding(false); load(); }}
          toast={toast}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Laden…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {partners.length === 0
            ? "Nog geen partners. Maak er één aan om te beginnen."
            : "Geen partners gevonden voor deze zoekopdracht."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PartnerCard
              key={p.id}
              partner={p}
              locations={locations}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onChanged={load}
              toast={toast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Nieuwe partner ───────────────────────────────────────────────────────────

function NewPartnerForm({
  onCancel,
  onCreated,
  toast,
}: {
  onCancel:  () => void;
  onCreated: () => void;
  toast:     Toast;
}) {
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");
  const [kvk,    setKvk]    = useState("");
  const [tier,   setTier]   = useState<PartnerTier>("free");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await adminCreatePartner({
      name:          name.trim(),
      contact_email: email,
      contact_phone: phone.trim() || null,
      kvk_number:    kvk.trim() || null,
      tier,
    });
    setSaving(false);
    if (res.error) { toast(res.error, "err"); return; }
    toast("Partner aangemaakt ✓");
    onCreated();
  }

  const input =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-300";
  const label = "block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1";

  return (
    <form onSubmit={submit} className="mb-5 p-5 bg-white border border-gray-200 rounded-xl">
      <p className="font-extrabold text-gray-900 mb-4">Nieuwe partner</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Bedrijfsnaam *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Contact e-mail *</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Telefoon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>KvK-nummer</label>
          <input value={kvk} onChange={(e) => setKvk(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Tier</label>
          <select value={tier} onChange={(e) => setTier(e.target.value as PartnerTier)} className={input}>
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Na aanmaken koppel je een locatie en nodig je een gebruiker uit — pas dan kan de
        partner inloggen op het portal.
      </p>
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Aanmaken
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}

// ─── Partnerkaart ─────────────────────────────────────────────────────────────

function PartnerCard({
  partner,
  locations,
  expanded,
  onToggle,
  onChanged,
  toast,
}: {
  partner:   AdminPartner;
  locations: { id: string; title: string; address: string | null; category: string | null }[];
  expanded:  boolean;
  onToggle:  () => void;
  onChanged: () => void;
  toast:     Toast;
}) {
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [linkLocId, setLinkLocId]     = useState("");
  const [linkCat, setLinkCat]         = useState<PartnerCategory>("horeca");
  const [updates, setUpdates]         = useState<AdminPartnerUpdate[] | null>(null);

  // Updates pas ophalen als de kaart opengeklapt wordt
  useEffect(() => {
    if (!expanded || updates !== null) return;
    adminGetPartnerUpdates(partner.id)
      .then(setUpdates)
      .catch(() => setUpdates([]));
  }, [expanded, updates, partner.id]);

  const tier = TIERS.find((t) => t.id === partner.tier) ?? TIERS[0];
  const linkedIds = new Set(partner.locations.map((l) => l.location_id));
  const available = locations.filter((l) => !linkedIds.has(l.id));

  async function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) { toast(res.error, "err"); return false; }
    toast(okMsg);
    onChanged();
    return true;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    const res = await adminInvitePartnerUser(partner.id, inviteEmail, window.location.origin);
    setBusy(false);
    if (res.error) { toast(res.error, "err"); return; }
    toast(
      res.outcome === "invited"
        ? "Uitnodiging verstuurd ✓"
        : "Bestaand account gekoppeld ✓ — partner logt in via /partner/login",
    );
    setInviteEmail("");
    onChanged();
  }

  async function handleCopyLink(email: string) {
    setBusy(true);
    const res = await adminGeneratePartnerLink(email, window.location.origin);
    setBusy(false);
    if (res.error || !res.link) { toast(res.error ?? "Geen link", "err"); return; }
    try {
      await navigator.clipboard.writeText(res.link);
      toast("Inloglink gekopieerd ✓");
    } catch {
      // Clipboard kan geweigerd worden; toon 'm dan zodat de link niet verloren gaat
      window.prompt("Kopieer de inloglink:", res.link);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Kop van de kaart */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 transition-colors">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="flex-1 min-w-0" onClick={onToggle} role="presentation">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 truncate">{partner.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.color}`}>
              {tier.label}
            </span>
            {!partner.active && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                Inactief
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">
            {partner.contact_email}
            {" · "}
            {partner.locations.length} locatie{partner.locations.length === 1 ? "" : "s"}
            {" · "}
            {partner.users.length} gebruiker{partner.users.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Waarschuwing als de partner nog niet kan inloggen */}
        {partner.users.length === 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            Kan niet inloggen
          </span>
        )}

        <button
          onClick={() => run(() => adminUpdatePartner(partner.id, { active: !partner.active }), partner.active ? "Op inactief gezet" : "Geactiveerd")}
          disabled={busy}
          className="text-xs font-bold text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors"
        >
          {partner.active ? "Deactiveren" : "Activeren"}
        </button>

        <button
          onClick={async () => {
            if (!confirm(`Partner "${partner.name}" verwijderen? Locatiekoppelingen en status-updates gaan mee.`)) return;
            run(() => adminDeletePartner(partner.id), "Partner verwijderd");
          }}
          disabled={busy}
          className="text-gray-300 hover:text-red-600 disabled:opacity-40 transition-colors"
          aria-label="Verwijderen"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/60 space-y-5">
          {/* Locaties */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Gekoppelde locaties
            </p>
            {partner.locations.length === 0 ? (
              <p className="text-xs text-gray-400 mb-2">
                Nog geen locatie gekoppeld — het dashboard blijft leeg tot je er één toevoegt.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {partner.locations.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700"
                  >
                    {l.title}
                    <span className="text-gray-400 font-normal">
                      {CATEGORY_LABEL[l.category] ?? l.category}
                    </span>
                    <button
                      onClick={() => run(() => adminUnlinkLocation(l.id), "Locatie ontkoppeld")}
                      disabled={busy}
                      className="text-gray-300 hover:text-red-600 disabled:opacity-40 transition-colors"
                      aria-label={`${l.title} ontkoppelen`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <select
                value={linkLocId}
                onChange={(e) => setLinkLocId(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-300"
              >
                <option value="">Kies een locatie…</option>
                {available.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}{l.address ? ` — ${l.address}` : ""}
                  </option>
                ))}
              </select>
              <select
                value={linkCat}
                onChange={(e) => setLinkCat(e.target.value as PartnerCategory)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-300"
              >
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button
                onClick={async () => {
                  if (!linkLocId) { toast("Kies eerst een locatie", "err"); return; }
                  const ok = await run(() => adminLinkLocation(partner.id, linkLocId, linkCat), "Locatie gekoppeld ✓");
                  if (ok) setLinkLocId("");
                }}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Link2 size={14} /> Koppelen
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Categorie <strong>Bollenveld</strong> geeft de partner het bloeistatus-formulier;
              alle andere categorieën het open/druk-formulier.
            </p>
          </div>

          {/* Portal-gebruikers */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Portal-gebruikers
            </p>
            {partner.users.length === 0 ? (
              <p className="text-xs text-gray-400 mb-2">
                Nog niemand uitgenodigd. Zonder gebruiker krijgt de partner
                &ldquo;geen partner-account gevonden&rdquo; bij het inloggen.
              </p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {partner.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <span className="flex-1 truncate text-gray-900">{u.email}</span>
                    {u.last_sign_in_at ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                        Actief · {timeAgo(u.last_sign_in_at)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        Uitgenodigd
                      </span>
                    )}
                    <button
                      onClick={() => handleCopyLink(u.email)}
                      disabled={busy}
                      className="text-[11px] font-bold text-gray-400 hover:text-gray-800 disabled:opacity-40 transition-colors whitespace-nowrap"
                      title="Genereer een inloglink om handmatig door te sturen"
                    >
                      Link kopiëren
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Toegang van ${u.email} intrekken?`)) return;
                        run(() => adminRemovePartnerUser(u.id), "Toegang ingetrokken");
                      }}
                      disabled={busy}
                      className="text-gray-300 hover:text-red-600 disabled:opacity-40 transition-colors"
                      aria-label={`${u.email} verwijderen`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
              <button
                type="submit"
                disabled={busy || !inviteEmail.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-40 transition-colors"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Uitnodigen
              </button>
            </form>
          </div>

          {/* Recente updates */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Recente status-updates
            </p>
            {updates === null ? (
              <p className="text-xs text-gray-400">Laden…</p>
            ) : updates.length === 0 ? (
              <p className="text-xs text-gray-400">Deze partner heeft nog niets doorgegeven.</p>
            ) : (
              <div className="space-y-1">
                {updates.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-16 shrink-0 text-gray-400">
                      {u.kind === "bloom" ? "🌷 bloei" : "🕒 open"}
                    </span>
                    <span className="font-semibold text-gray-900">{u.status}</span>
                    {u.crowd && <span className="text-gray-400">· {u.crowd}</span>}
                    <span className="truncate text-gray-400">· {u.title}</span>
                    {u.notes && <span className="truncate italic text-gray-400">“{u.notes}”</span>}
                    <span className="ml-auto shrink-0 text-gray-300">{timeAgo(u.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
