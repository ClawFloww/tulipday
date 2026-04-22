"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Search, MapPin, Route, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Location, Route as RouteType } from "@/lib/types";

interface SearchResults {
  locations: Location[];
  routes:    RouteType[];
}

const EMPTY: SearchResults = { locations: [], routes: [] };
const FALLBACK = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400";

export default function SearchPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "nl";
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResults>(EMPTY);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus bij mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced zoeken
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(EMPTY); setSearched(false); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      const [{ data: locs }, { data: routes }] = await Promise.all([
        supabase
          .from("locations")
          .select("*")
          .eq("is_active", true)
          .ilike("title", `%${q}%`)
          .limit(10),
        supabase
          .from("routes")
          .select("*")
          .eq("is_active", true)
          .ilike("title", `%${q}%`)
          .limit(6),
      ]);
      setResults({ locations: locs ?? [], routes: routes ?? [] });
      setSearched(true);
      setLoading(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  const total = results.locations.length + results.routes.length;

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* Header met zoekbalk */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3"
           style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
               style={{ backgroundColor: "var(--color-surface-3)", border: "1px solid var(--color-border)" }}>
            <Search size={16} style={{ color: "var(--color-text-3)" }} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek locaties of routes..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--color-text)" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ color: "var(--color-text-3)" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {loading && <Loader2 size={18} className="animate-spin flex-shrink-0 text-tulip-400" />}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">

        {/* Lege staat */}
        {!searched && !loading && (
          <div className="flex flex-col items-center pt-16 text-center gap-3">
            <Search size={40} style={{ color: "var(--color-text-3)", opacity: 0.4 }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-3)" }}>
              Typ minimaal 2 tekens om te zoeken
            </p>
          </div>
        )}

        {/* Geen resultaten */}
        {searched && !loading && total === 0 && (
          <div className="flex flex-col items-center pt-16 text-center gap-3">
            <span className="text-4xl">🌷</span>
            <p className="font-bold" style={{ color: "var(--color-text)" }}>
              Niets gevonden voor &ldquo;{query}&rdquo;
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
              Probeer een andere zoekterm
            </p>
          </div>
        )}

        {/* Locaties */}
        {results.locations.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                style={{ color: "var(--color-text-3)" }}>
              <MapPin size={12} /> Locaties ({results.locations.length})
            </h2>
            <div className="space-y-2">
              {results.locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => router.push(`/${locale}/location/${loc.slug}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.98] transition-all"
                  style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={loc.image_url ?? FALLBACK}
                      alt={loc.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                      {loc.title}
                    </p>
                    {loc.address && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-3)" }}>
                        {loc.address}
                      </p>
                    )}
                    {loc.bloom_status && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-tulip-50 text-tulip-600">
                        {loc.bloom_status === "peak"     ? "🌷 Piekbloei"
                       : loc.bloom_status === "blooming" ? "🌸 In bloei"
                       : loc.bloom_status === "early"    ? "🌱 Vroeg seizoen"
                       :                                   "🍂 Seizoen voorbij"}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Routes */}
        {results.routes.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                style={{ color: "var(--color-text-3)" }}>
              <Route size={12} /> Routes ({results.routes.length})
            </h2>
            <div className="space-y-2">
              {results.routes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => router.push(`/${locale}/routes/${route.slug}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.98] transition-all"
                  style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={route.cover_image_url ?? FALLBACK}
                      alt={route.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                      {route.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
                      {[
                        route.distance_km != null && `${route.distance_km} km`,
                        route.route_type && route.route_type === "bike"   ? "🚴 Fiets"
                          : route.route_type === "walk"  ? "🚶 Wandelen"
                          : route.route_type === "car"   ? "🚗 Auto"
                          : route.route_type === "family"? "👨‍👩‍👧 Gezin"
                          : route.route_type === "photo" ? "📷 Foto"
                          : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
