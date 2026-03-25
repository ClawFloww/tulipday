"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  LogOut, Plus, Pencil, Trash2, Save, X, ChevronUp, ChevronDown,
  Loader2, MapPin, RefreshCw, Check, AlertCircle,
} from "lucide-react";
import {
  verifyAdminPassword,
  adminGetLocations, adminCreateLocation, adminUpdateLocation, adminDeleteLocation,
  adminGetRoutes, adminCreateRoute, adminUpdateRoute, adminDeleteRoute,
  adminGetRouteStops, adminAddRouteStop, adminRemoveRouteStop, adminReorderStops,
  adminSetFeatured,
} from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "locations" | "routes" | "home";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const CATEGORIES  = ["flower_field","photo_spot","attraction","food","parking"];
const BLOOM_OPTS  = ["early","blooming","peak","ending"];
const ACCESS_OPTS = ["roadside_only","public_access","private_view_only"];
const ROUTE_TYPES = ["car","bike","walk","family","photo"];

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition";

function Input({ value, onChange, type = "text", placeholder }: {
  value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value ?? ""} rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} resize-y`}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">— select —</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-rose-500" : "bg-gray-200"}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-xl
      ${type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
      {type === "ok" ? <Check size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  );
}

// ─── Location form ────────────────────────────────────────────────────────────

const EMPTY_LOC: Rec = {
  title: "", slug: "", category: "", latitude: "", longitude: "", address: "",
  short_description: "", full_description: "", flower_type: "", bloom_status: "",
  photo_score: "", crowd_score: "", access_type: "", parking_info: "",
  best_visit_time: "", image_url: "", is_featured: false, is_active: true,
};

function LocationForm({
  initial, onSave, onCancel, busy,
}: { initial: Rec; onSave: (d: Rec) => void; onCancel: () => void; busy: boolean }) {
  const [d, setD] = useState<Rec>({ ...EMPTY_LOC, ...initial });
  const set = (k: string) => (v: string | boolean) => setD((p: Rec) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!d.slug && d.title) setD((p: Rec) => ({ ...p, slug: slugify(d.title) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.title]);

  return (
    <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="font-extrabold text-gray-900">{d.id ? "Edit location" : "New location"}</h3>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Title *"><Input value={d.title} onChange={set("title")} /></Field>
        <Field label="Slug"><Input value={d.slug} onChange={set("slug")} /></Field>
        <Field label="Category"><Select value={d.category} onChange={set("category")} options={CATEGORIES} /></Field>
        <Field label="Bloom status"><Select value={d.bloom_status} onChange={set("bloom_status")} options={BLOOM_OPTS} /></Field>
        <Field label="Latitude"><Input value={d.latitude} onChange={set("latitude")} type="number" placeholder="52.2558" /></Field>
        <Field label="Longitude"><Input value={d.longitude} onChange={set("longitude")} type="number" placeholder="4.5567" /></Field>
        <Field label="Photo score (1-5)"><Input value={d.photo_score} onChange={set("photo_score")} type="number" /></Field>
        <Field label="Crowd score (1-5)"><Input value={d.crowd_score} onChange={set("crowd_score")} type="number" /></Field>
        <Field label="Access type"><Select value={d.access_type} onChange={set("access_type")} options={ACCESS_OPTS} /></Field>
        <Field label="Flower type"><Input value={d.flower_type} onChange={set("flower_type")} placeholder="tulip, narcis" /></Field>
        <Field label="Best visit time"><Input value={d.best_visit_time} onChange={set("best_visit_time")} /></Field>
        <Field label="Parking info"><Input value={d.parking_info} onChange={set("parking_info")} /></Field>
      </div>

      <Field label="Address"><Input value={d.address} onChange={set("address")} /></Field>
      <Field label="Image URL"><Input value={d.image_url} onChange={set("image_url")} placeholder="https://…" /></Field>
      <Field label="Short description"><Textarea value={d.short_description} onChange={set("short_description")} rows={2} /></Field>
      <Field label="Full description"><Textarea value={d.full_description} onChange={set("full_description")} rows={4} /></Field>

      <div className="flex gap-6">
        <Toggle checked={!!d.is_featured} onChange={set("is_featured")} label="Featured" />
        <Toggle checked={!!d.is_active}   onChange={set("is_active")}   label="Active"   />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(d)} disabled={busy || !d.title}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl
                     hover:bg-rose-700 disabled:opacity-40 transition-all">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Locations section ────────────────────────────────────────────────────────

function LocationsSection({ toast }: { toast: (msg: string, type?: "ok" | "err") => void }) {
  const [locations, setLocations] = useState<Rec[]>([]);
  const [editing, setEditing]     = useState<Rec | null>(null);
  const [adding, setAdding]       = useState(false);
  const [search, setSearch]       = useState("");
  const [isPending, startT]       = useTransition();

  const load = useCallback(() => {
    startT(async () => { setLocations(await adminGetLocations()); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Rec) {
    const clean: Rec = {
      ...data,
      latitude:    data.latitude    !== "" ? parseFloat(data.latitude)    : null,
      longitude:   data.longitude   !== "" ? parseFloat(data.longitude)   : null,
      photo_score: data.photo_score !== "" ? parseInt(data.photo_score)   : null,
      crowd_score: data.crowd_score !== "" ? parseInt(data.crowd_score)   : null,
      bloom_status: data.bloom_status || null,
      category:     data.category   || null,
      access_type:  data.access_type || null,
    };
    const { id, created_at, updated_at, ...fields } = clean;
    const res = id
      ? await adminUpdateLocation(id, fields)
      : await adminCreateLocation(fields);
    if (res.error) { toast(res.error, "err"); return; }
    toast(id ? "Location updated" : "Location created");
    setEditing(null); setAdding(false); load();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    const res = await adminDeleteLocation(id);
    if (res.error) { toast(res.error, "err"); return; }
    toast("Deleted"); load();
  }

  async function handleBloom(id: string, status: string) {
    const res = await adminUpdateLocation(id, { bloom_status: status || null });
    if (res.error) { toast(res.error, "err"); return; }
    setLocations((prev) => prev.map((l) => l.id === id ? { ...l, bloom_status: status } : l));
    toast("Bloom status updated");
  }

  const filtered = locations.filter((l) =>
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.category?.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search locations…" className={`${inputCls} flex-1`} />
        <button onClick={() => { setAdding(true); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 flex-shrink-0">
          <Plus size={15} /> Add
        </button>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-700">
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <LocationForm initial={{}} onSave={handleSave} onCancel={() => setAdding(false)} busy={isPending} />
      )}

      {/* Edit form */}
      {editing && (
        <LocationForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} busy={isPending} />
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Category</th>
              <th className="px-4 py-3 text-left font-semibold">Bloom status</th>
              <th className="px-4 py-3 text-center font-semibold">Featured</th>
              <th className="px-4 py-3 text-center font-semibold">Active</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No locations found</td></tr>
            )}
            {filtered.map((loc) => (
              <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                  <p className="truncate">{loc.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">{loc.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    {loc.category ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={loc.bloom_status ?? ""}
                    onChange={(e) => handleBloom(loc.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-rose-300"
                  >
                    <option value="">—</option>
                    {BLOOM_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => adminSetFeatured("locations", loc.id, !loc.is_featured).then(load)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-colors
                      ${loc.is_featured ? "bg-rose-500 border-rose-500 text-white" : "border-gray-300 hover:border-rose-400"}`}>
                    {loc.is_featured && <Check size={11} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => adminUpdateLocation(loc.id, { is_active: !loc.is_active }).then(load)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-colors
                      ${loc.is_active ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-green-400"}`}>
                    {loc.is_active && <Check size={11} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(loc); setAdding(false); window.scrollTo(0, 0); }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(loc.id, loc.title)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-right">{filtered.length} of {locations.length} locations</p>
    </div>
  );
}

// ─── Route form ───────────────────────────────────────────────────────────────

const EMPTY_ROUTE: Rec = {
  title: "", slug: "", description: "", route_type: "",
  duration_minutes: "", distance_km: "", cover_image_url: "",
  is_featured: false, is_active: true,
};

interface StopRow {
  id: string;
  sort_order: number;
  location_id: string;
  locations: { id: string; title: string; image_url: string | null; category: string };
}

function RouteStopsEditor({ routeId, allLocations }: { routeId: string; allLocations: Rec[] }) {
  const [stops, setStops]     = useState<StopRow[]>([]);
  const [addLocId, setAddLocId] = useState("");
  const [busy, setBusy]       = useState(false);

  const load = useCallback(async () => {
    const data = await adminGetRouteStops(routeId);
    setStops(data as StopRow[]);
  }, [routeId]);

  useEffect(() => { load(); }, [load]);

  async function addStop() {
    if (!addLocId) return;
    setBusy(true);
    await adminAddRouteStop(routeId, addLocId, stops.length + 1);
    setAddLocId(""); await load(); setBusy(false);
  }

  async function removeStop(id: string) {
    setBusy(true);
    await adminRemoveRouteStop(id); await load(); setBusy(false);
  }

  async function move(idx: number, dir: -1 | 1) {
    const reordered = [...stops];
    const swap = idx + dir;
    if (swap < 0 || swap >= reordered.length) return;
    [reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]];
    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i + 1 }));
    setStops(withOrder);
    setBusy(true);
    await adminReorderStops(withOrder.map((s) => ({ id: s.id, sort_order: s.sort_order })));
    setBusy(false);
  }

  const usedIds = new Set(stops.map((s) => s.location_id));

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Stops ({stops.length})</p>

      {stops.map((stop, i) => (
        <div key={stop.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <span className="flex-1 text-sm font-medium text-gray-800 truncate">{stop.locations.title}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => move(i, -1)} disabled={i === 0 || busy}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronUp size={14} />
            </button>
            <button onClick={() => move(i, 1)} disabled={i === stops.length - 1 || busy}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronDown size={14} />
            </button>
            <button onClick={() => removeStop(stop.id)} disabled={busy}
              className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30">
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <select value={addLocId} onChange={(e) => setAddLocId(e.target.value)}
          className={`${inputCls} flex-1 text-xs`}>
          <option value="">Add stop…</option>
          {allLocations.filter((l) => !usedIds.has(l.id)).map((l) => (
            <option key={l.id} value={l.id}>{l.title}</option>
          ))}
        </select>
        <button onClick={addStop} disabled={!addLocId || busy}
          className="px-3 py-2 bg-rose-100 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-200 disabled:opacity-40 flex items-center gap-1">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
        </button>
      </div>
    </div>
  );
}

function RouteForm({
  initial, allLocations, onSave, onCancel, busy,
}: { initial: Rec; allLocations: Rec[]; onSave: (d: Rec) => void; onCancel: () => void; busy: boolean }) {
  const [d, setD] = useState<Rec>({ ...EMPTY_ROUTE, ...initial });
  const set = (k: string) => (v: string | boolean) => setD((p: Rec) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!d.slug && d.title) setD((p: Rec) => ({ ...p, slug: slugify(d.title) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.title]);

  return (
    <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="font-extrabold text-gray-900">{d.id ? "Edit route" : "New route"}</h3>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Title *"><Input value={d.title} onChange={set("title")} /></Field>
        <Field label="Slug"><Input value={d.slug} onChange={set("slug")} /></Field>
        <Field label="Route type"><Select value={d.route_type} onChange={set("route_type")} options={ROUTE_TYPES} /></Field>
        <Field label="Duration (min)"><Input value={d.duration_minutes} onChange={set("duration_minutes")} type="number" /></Field>
        <Field label="Distance (km)"><Input value={d.distance_km} onChange={set("distance_km")} type="number" /></Field>
        <Field label="Cover image URL"><Input value={d.cover_image_url} onChange={set("cover_image_url")} placeholder="https://…" /></Field>
      </div>

      <Field label="Description"><Textarea value={d.description} onChange={set("description")} rows={3} /></Field>

      <div className="flex gap-6">
        <Toggle checked={!!d.is_featured} onChange={set("is_featured")} label="Featured" />
        <Toggle checked={!!d.is_active}   onChange={set("is_active")}   label="Active"   />
      </div>

      {d.id && (
        <RouteStopsEditor routeId={d.id} allLocations={allLocations} />
      )}
      {!d.id && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <MapPin size={11} /> Save the route first, then you can add stops.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(d)} disabled={busy || !d.title}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 disabled:opacity-40 transition-all">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Routes section ───────────────────────────────────────────────────────────

function RoutesSection({ toast }: { toast: (msg: string, type?: "ok" | "err") => void }) {
  const [routes, setRoutes]   = useState<Rec[]>([]);
  const [locations, setLocs]  = useState<Rec[]>([]);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [adding, setAdding]   = useState(false);
  const [isPending, startT]   = useTransition();

  const load = useCallback(() => {
    startT(async () => {
      const [r, l] = await Promise.all([adminGetRoutes(), adminGetLocations()]);
      setRoutes(r); setLocs(l);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Rec) {
    const clean: Rec = {
      ...data,
      duration_minutes: data.duration_minutes !== "" ? parseInt(data.duration_minutes) : null,
      distance_km:      data.distance_km      !== "" ? parseFloat(data.distance_km)    : null,
      route_type: data.route_type || null,
    };
    const { id, created_at, ...fields } = clean;
    let res;
    if (id) {
      res = await adminUpdateRoute(id, fields);
    } else {
      const r = await adminCreateRoute(fields);
      res = r;
      if (r.id && !r.error) {
        // Open edit mode for the new route so stops can be added
        setAdding(false);
        setEditing({ ...clean, id: r.id });
        toast("Route created — add stops below");
        load();
        return;
      }
    }
    if (res.error) { toast(res.error, "err"); return; }
    toast("Route saved");
    setEditing(null); setAdding(false); load();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This also removes all its stops.`)) return;
    const res = await adminDeleteRoute(id);
    if (res.error) { toast(res.error, "err"); return; }
    toast("Deleted"); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-gray-600 flex-1">{routes.length} routes</h2>
        <button onClick={() => { setAdding(true); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700">
          <Plus size={15} /> Add
        </button>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-700">
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {adding  && <RouteForm initial={{}}      allLocations={locations} onSave={handleSave} onCancel={() => setAdding(false)}  busy={isPending} />}
      {editing && <RouteForm initial={editing} allLocations={locations} onSave={handleSave} onCancel={() => setEditing(null)} busy={isPending} />}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Distance / Time</th>
              <th className="px-4 py-3 text-center font-semibold">Featured</th>
              <th className="px-4 py-3 text-center font-semibold">Active</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {routes.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No routes yet</td></tr>
            )}
            {routes.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                  <p className="truncate">{r.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">{r.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{r.route_type ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {r.distance_km ? `${r.distance_km} km` : "—"} &nbsp;
                  {r.duration_minutes ? `${r.duration_minutes} min` : ""}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => adminSetFeatured("routes", r.id, !r.is_featured).then(load)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-colors
                      ${r.is_featured ? "bg-rose-500 border-rose-500 text-white" : "border-gray-300 hover:border-rose-400"}`}>
                    {r.is_featured && <Check size={11} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => adminUpdateRoute(r.id, { is_active: !r.is_active }).then(load)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-colors
                      ${r.is_active ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-green-400"}`}>
                    {r.is_active && <Check size={11} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(r); setAdding(false); window.scrollTo(0, 0); }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(r.id, r.title)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Home / Featured section ──────────────────────────────────────────────────

function HomeSection({ toast }: { toast: (msg: string, type?: "ok" | "err") => void }) {
  const [locations, setLocations] = useState<Rec[]>([]);
  const [routes, setRoutes]       = useState<Rec[]>([]);
  const [isPending, startT]       = useTransition();

  const load = useCallback(() => {
    startT(async () => {
      const [l, r] = await Promise.all([adminGetLocations(), adminGetRoutes()]);
      setLocations(l); setRoutes(r);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleFeatured(table: "locations" | "routes", id: string, current: boolean) {
    await adminSetFeatured(table, id, !current);
    toast(!current ? "Marked as featured" : "Removed from featured");
    load();
  }

  return (
    <div className="space-y-6">
      {isPending && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</p>}

      {/* Featured locations */}
      <div>
        <h3 className="text-sm font-extrabold text-gray-700 mb-3 uppercase tracking-wide">
          📍 Featured locations ({locations.filter((l) => l.is_featured).length})
        </h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {locations.length === 0 && (
            <p className="p-4 text-sm text-gray-400">No locations yet</p>
          )}
          {locations.map((loc) => (
            <label key={loc.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
              <input type="checkbox" checked={!!loc.is_featured}
                onChange={() => toggleFeatured("locations", loc.id, loc.is_featured)}
                className="w-4 h-4 accent-rose-600 rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{loc.title}</p>
                <p className="text-xs text-gray-400">{loc.category} · {loc.bloom_status ?? "no bloom"}</p>
              </div>
              {loc.is_featured && (
                <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Featured</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Featured routes */}
      <div>
        <h3 className="text-sm font-extrabold text-gray-700 mb-3 uppercase tracking-wide">
          🗺 Featured routes ({routes.filter((r) => r.is_featured).length})
        </h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {routes.length === 0 && (
            <p className="p-4 text-sm text-gray-400">No routes yet</p>
          )}
          {routes.map((route) => (
            <label key={route.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
              <input type="checkbox" checked={!!route.is_featured}
                onChange={() => toggleFeatured("routes", route.id, route.is_featured)}
                className="w-4 h-4 accent-rose-600 rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{route.title}</p>
                <p className="text-xs text-gray-400">{route.route_type} · {route.distance_km ? `${route.distance_km} km` : "—"}</p>
              </div>
              {route.is_featured && (
                <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Featured</span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Login gate ───────────────────────────────────────────────────────────────

function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd]     = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy]   = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(false);
    const ok = await verifyAdminPassword(pwd);
    if (ok) { sessionStorage.setItem("admin_auth", "1"); onLogin(); }
    else { setError(true); setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <span className="text-5xl">🌷</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3">TulipDay Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your admin password</p>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <input
            type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
            placeholder="Password" autoFocus
            className={`${inputCls} ${error ? "border-red-400 bg-red-50" : ""}`}
          />
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle size={12} /> Incorrect password
            </p>
          )}
          <button type="submit" disabled={busy || !pwd}
            className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700
                       disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "locations", label: "Locations", emoji: "📍" },
  { id: "routes",    label: "Routes",    emoji: "🗺"  },
  { id: "home",      label: "Home",      emoji: "⭐"  },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab]       = useState<Tab>("locations");
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Check sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "1") setAuthed(true);
  }, []);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 2500);
  }

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌷</span>
            <span className="font-extrabold text-gray-900 text-base">TulipDay Admin</span>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("admin_auth"); setAuthed(false); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-semibold transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-5 flex gap-0 border-t border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-bold border-b-2 transition-colors
                ${tab === t.id
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-5 py-6">
        {tab === "locations" && <LocationsSection toast={showToast} />}
        {tab === "routes"    && <RoutesSection    toast={showToast} />}
        {tab === "home"      && <HomeSection      toast={showToast} />}
      </div>
    </div>
  );
}
