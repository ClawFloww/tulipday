"use client";

// Afbeeldingen-tab voor het admin-paneel: toont in één lijst welke locaties en
// routes nog geen eigen afbeelding hebben, en laat je er direct een uploaden.
//
// Losstaand component zodat app/admin/page.tsx (al ~1600 regels) niet groeit.
//
// "Gedeeld" is een aparte status: die items hébben een afbeelding, maar delen
// hem met andere items (de overig-*.jpg foto's die over meerdere bollenvelden
// verdeeld zijn). Voor de gebruiker ziet dat eruit als een generiek plaatje.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ExternalLink, ImageOff, Layers, Loader2, RefreshCw, Search, Upload } from "lucide-react";

import {
  adminGetImageAudit,
  adminSetImageUrl,
  adminUploadImage,
  type ImageAuditItem,
} from "@/app/admin/image-actions";

type Toast = (msg: string, type?: "ok" | "err") => void;
type StatusFilter = "missing" | "shared" | "done" | "all";
type KindFilter   = "all" | "location" | "route";

// Server actions hebben standaard een body-limiet van 1 MB, dus comprimeren we
// ruim daaronder. 2000px breed is genoeg voor de detailheaders in de app.
const COMPRESS_OPTS = {
  maxSizeMB:        0.8,
  maxWidthOrHeight: 2000,
  useWebWorker:     true,
  initialQuality:   0.85,
  exifOrientation:  -1,
};

const GROUP_LABELS: Record<string, string> = {
  flower_field: "Bollenveld",
  photo_spot:   "Fotospot",
  attraction:   "Attractie",
  food:         "Horeca",
  parking:      "Parkeren",
  bike_rental:  "Fietsverhuur",
};

function groupLabel(g: string) {
  return GROUP_LABELS[g] ?? g;
}

export function ImagesSection({ toast }: { toast: Toast }) {
  const [items, setItems]   = useState<ImageAuditItem[]>([]);
  const [loading, setLoad]  = useState(true);
  const [status, setStatus] = useState<StatusFilter>("missing");
  const [kind, setKind]     = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      setItems(await adminGetImageAudit());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Laden mislukt", "err");
    } finally {
      setLoad(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    missing: items.filter((i) => !i.imageUrl).length,
    shared:  items.filter((i) => i.imageUrl && i.sharedWith > 0).length,
    done:    items.filter((i) => i.imageUrl && i.sharedWith === 0).length,
    all:     items.length,
  }), [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (kind !== "all" && i.kind !== kind) return false;
      if (status === "missing" && i.imageUrl) return false;
      if (status === "shared"  && !(i.imageUrl && i.sharedWith > 0)) return false;
      if (status === "done"    && !(i.imageUrl && i.sharedWith === 0)) return false;
      if (q && !i.title.toLowerCase().includes(q) && !i.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, kind, status, search]);

  function applyUrl(item: ImageAuditItem, url: string) {
    setItems((prev) => prev.map((i) =>
      i.id === item.id ? { ...i, imageUrl: url, sharedWith: 0 } : i
    ));
  }

  async function handleFile(item: ImageAuditItem, file: File) {
    if (!file.type.startsWith("image/")) { toast("Dat is geen afbeelding", "err"); return; }
    setBusyId(item.id);
    try {
      const compressed = await imageCompression(file, COMPRESS_OPTS);

      const fd = new FormData();
      fd.set("kind", item.kind);
      fd.set("id",   item.id);
      fd.set("slug", item.slug);
      fd.set("file", new File([compressed], "image.jpg", { type: "image/jpeg" }));

      const res = await adminUploadImage(fd);
      if (res.error || !res.url) { toast(res.error ?? "Upload mislukt", "err"); return; }

      applyUrl(item, res.url);
      toast(`${item.title} ✓`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload mislukt", "err");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePasteUrl(item: ImageAuditItem) {
    const url = prompt(`Afbeeldings-URL voor "${item.title}":`, item.imageUrl ?? "");
    if (url === null) return;
    setBusyId(item.id);
    const res = await adminSetImageUrl(item.kind, item.id, url);
    setBusyId(null);
    if (res.error) { toast(res.error, "err"); return; }
    applyUrl(item, url.trim());
    toast("URL opgeslagen ✓");
  }

  return (
    <div className="space-y-4">
      {/* Statusfilters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={status === "missing"} onClick={() => setStatus("missing")}
                    label="Ontbreekt" count={counts.missing} tone="rose" />
        <FilterPill active={status === "shared"}  onClick={() => setStatus("shared")}
                    label="Gedeeld"   count={counts.shared}  tone="amber" />
        <FilterPill active={status === "done"}    onClick={() => setStatus("done")}
                    label="Eigen foto" count={counts.done}   tone="green" />
        <FilterPill active={status === "all"}     onClick={() => setStatus("all")}
                    label="Alles"     count={counts.all}     tone="gray" />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
          >
            <RefreshCw size={13} /> Ververs
          </button>
        </div>
      </div>

      {/* Type + zoeken */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {([["all", "Alles"], ["location", "Locaties"], ["route", "Routes"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors
                ${kind === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op titel of slug…"
            className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition"
          />
        </div>
      </div>

      {/* Lijst */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-rose-400" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-16">Niets gevonden in deze selectie.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <ImageRow
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onFile={(f) => handleFile(item, f)}
              onPasteUrl={() => handlePasteUrl(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rij ──────────────────────────────────────────────────────────────────────

function ImageRow({
  item, busy, onFile, onPasteUrl,
}: {
  item: ImageAuditItem;
  busy: boolean;
  onFile: (file: File) => void;
  onPasteUrl: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`flex items-center gap-3 p-3 bg-white border rounded-2xl transition-all
        ${over ? "border-rose-400 ring-2 ring-rose-200" : "border-gray-200"}`}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={18} className="text-gray-300" />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 size={18} className="animate-spin text-rose-500" />
          </div>
        )}
      </div>

      {/* Tekst */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-gray-900 truncate">{item.title}</p>
          {item.imageUrl && (
            <a
              href={item.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-gray-600 flex-shrink-0"
              aria-label="Open afbeelding"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
            {item.kind === "route" ? "Route" : groupLabel(item.group)}
          </span>
          {item.kind === "route" && item.group !== "—" && (
            <span className="text-[11px] text-gray-400">{item.group}</span>
          )}
          {!item.imageUrl && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700">
              geen afbeelding
            </span>
          )}
          {item.imageUrl && item.sharedWith > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
              <Layers size={10} /> gedeeld met {item.sharedWith}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.slug}</p>
      </div>

      {/* Acties */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onPasteUrl}
          disabled={busy}
          className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-40"
        >
          URL
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl
                     hover:bg-rose-700 disabled:opacity-40 transition-colors"
        >
          <Upload size={13} /> {item.imageUrl ? "Vervang" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

// ─── Filterpil ────────────────────────────────────────────────────────────────

const TONES: Record<string, { on: string; off: string }> = {
  rose:  { on: "bg-rose-600 text-white",   off: "bg-rose-50 text-rose-700 hover:bg-rose-100"    },
  amber: { on: "bg-amber-500 text-white",  off: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  green: { on: "bg-green-600 text-white",  off: "bg-green-50 text-green-700 hover:bg-green-100" },
  gray:  { on: "bg-gray-800 text-white",   off: "bg-gray-100 text-gray-600 hover:bg-gray-200"   },
};

function FilterPill({
  active, onClick, label, count, tone,
}: {
  active: boolean; onClick: () => void; label: string; count: number; tone: keyof typeof TONES;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors
        ${active ? TONES[tone].on : TONES[tone].off}`}
    >
      {label}
      <span className={`px-1.5 rounded-md text-[11px] ${active ? "bg-white/20" : "bg-white/70"}`}>{count}</span>
    </button>
  );
}
