"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Check, X, Loader2, RefreshCw, MapPin, Clock } from "lucide-react";
import { getAdminClient } from "@/lib/supabase-admin-client";

interface CorsoPhoto {
  id: string;
  created_at: string;
  caption: string | null;
  image_url: string;
  stop_id: string;
  stop_naam: string;
  lat: number | null;
  lng: number | null;
  status: "pending" | "approved" | "rejected";
  uploader_ip: string | null;
}

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "tulipday2024";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}u`;
}

export default function CorsoAdminPage() {
  const [authed, setAuthed]   = useState(false);
  const [pw, setPw]           = useState("");
  const [photos, setPhotos]   = useState<CorsoPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busy, setBusy]       = useState<Record<string, boolean>>({});

  const sb = getAdminClient(); // service role — bypasses RLS

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    let q = sb.from("corso_photos").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setPhotos(data ?? []);
    setLoading(false);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authed) fetchPhotos();
  }, [authed, fetchPhotos]);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setBusy((b) => ({ ...b, [id]: true }));
    await sb.from("corso_photos").update({ status }).eq("id", id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setBusy((b) => { const n = { ...b }; delete n[id]; return n; });
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm w-full max-w-sm">
          <h1 className="text-xl font-extrabold text-gray-900 mb-6 text-center">🌸 Corso Foto Moderatie</h1>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { if (pw === ADMIN_PW) setAuthed(true); } }}
            placeholder="Wachtwoord"
            className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-rose-300 mb-3"
            autoFocus
          />
          <button
            onClick={() => { if (pw === ADMIN_PW) setAuthed(true); }}
            className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 active:scale-95 transition-all"
          >
            Inloggen
          </button>
        </div>
      </div>
    );
  }

  const counts = {
    pending:  photos.filter((p) => p.status === "pending").length,
    approved: photos.filter((p) => p.status === "approved").length,
    rejected: photos.filter((p) => p.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-gray-900">🌸 Corso Foto&apos;s</h1>
          <p className="text-xs text-gray-400">Moderatie panel</p>
        </div>
        <button onClick={fetchPhotos} className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Vernieuwen
        </button>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1">
        {(["pending","approved","rejected","all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); }}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors
              ${filter === f ? "border-rose-500 text-rose-600" : "border-transparent text-gray-400"}`}
          >
            {f === "pending"  ? `In behandeling (${counts.pending})` :
             f === "approved" ? `Goedgekeurd (${counts.approved})` :
             f === "rejected" ? `Afgekeurd (${counts.rejected})` : "Alles"}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && (
          <div className="col-span-full flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        )}

        {!loading && photos.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 font-medium">
            Geen foto&apos;s gevonden
          </div>
        )}

        {photos.map((photo) => (
          <div key={photo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="relative h-48 w-full">
              <Image
                src={photo.image_url}
                alt={photo.caption ?? "corso foto"}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold
                ${photo.status === "pending"  ? "bg-yellow-100 text-yellow-700" :
                  photo.status === "approved" ? "bg-green-100 text-green-700" :
                                               "bg-red-100 text-red-700"}`}
              >
                {photo.status === "pending" ? "In behandeling" : photo.status === "approved" ? "Goedgekeurd" : "Afgekeurd"}
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                <span className="flex items-center gap-1"><MapPin size={11} /> {photo.stop_naam}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(photo.created_at)}</span>
                {photo.uploader_ip && <span className="font-mono">{photo.uploader_ip}</span>}
              </div>

              {photo.caption && (
                <p className="text-sm text-gray-700 font-medium mb-3">{photo.caption}</p>
              )}

              {photo.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(photo.id, "approved")}
                    disabled={busy[photo.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {busy[photo.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Goedkeuren
                  </button>
                  <button
                    onClick={() => updateStatus(photo.id, "rejected")}
                    disabled={busy[photo.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    {busy[photo.id] ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    Afkeuren
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
