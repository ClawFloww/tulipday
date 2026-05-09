"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Car, Bike, Footprints, Camera, Users, Clock, ArrowLeft, ChevronRight,
  Mountain, Zap, Map, SlidersHorizontal, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Route, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { isPremium, FREE_ROUTE_LIMIT } from "@/lib/premium";
import { PremiumGate } from "@/components/ui/PremiumGate";
import { useWeather } from "@/hooks/useWeather";
import { useUserLocation } from "@/hooks/useUserLocation";
import WeatherCompact from "@/components/weather/WeatherCompact";
import WeatherForecast from "@/components/weather/WeatherForecast";
import WeatherBanner from "@/components/weather/WeatherBanner";

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  activity:     string;
  distances:    string[];
  difficulty:   string | null;
  audiences:    string[];
  environments: string[];
  themes:       string[];
}

const DEFAULT_FILTERS: FilterState = {
  activity: "all", distances: [], difficulty: null,
  audiences: [], environments: [], themes: [],
};

const ACTIVITIES = [
  { id: "all",               label: "Alle",     icon: <Map        size={12} /> },
  { id: "Fietsroute",        label: "Fietsen",  icon: <Bike       size={12} /> },
  { id: "Wandelroute",       label: "Wandelen", icon: <Footprints size={12} /> },
  { id: "Mountainbikeroute", label: "MTB",      icon: <Mountain   size={12} /> },
  { id: "E-Step Route",      label: "E-Step",   icon: <Zap        size={12} /> },
];

const DISTANCES    = ["Kort", "Middellang", "Lang", "Meerdaagse route"];
const DIFFICULTIES = ["Makkelijk", "Gemiddeld", "Moeilijk", "Zeer uitdagend"];
const ENVIRONMENTS = ["Bos", "Duinen", "Strand", "Stad", "Polder", "Bollenvelden"];
const FILTER_THEMES = ["Natuur", "Cultuur", "Historisch", "Culinair", "Fotogeniek", "Bloemen"];
const AUDIENCES    = ["Gezinnen", "Beginners", "Sportief", "Senioren", "Rolstoel/Buggy"];

function countSecondary(f: FilterState): number {
  return f.distances.length + (f.difficulty ? 1 : 0) +
    f.audiences.length + f.environments.length + f.themes.length;
}

function matchesFilters(route: Route, f: FilterState): boolean {
  if (f.activity !== "all" && route.activity !== f.activity) return false;
  if (f.distances.length > 0) {
    const dc = route.distance_category ?? [];
    if (!f.distances.some((d) => dc.includes(d))) return false;
  }
  if (f.difficulty && route.difficulty !== f.difficulty) return false;
  if (f.audiences.length > 0) {
    const ta = route.target_audience ?? [];
    if (!f.audiences.some((a) =>
      a === "Sportief" ? ta.some((x) => x.startsWith("Sportieve")) : ta.includes(a)
    )) return false;
  }
  if (f.environments.length > 0) {
    const env = route.environment ?? [];
    if (!f.environments.some((e) => env.includes(e))) return false;
  }
  if (f.themes.length > 0) {
    const th = route.themes ?? [];
    if (!f.themes.some((t) => th.includes(t))) return false;
  }
  return true;
}

// ─── Card helpers ─────────────────────────────────────────────────────────────

const ROUTE_ICON: Record<string, React.ReactNode> = {
  bike:   <Bike       size={13} />,
  car:    <Car        size={13} />,
  walk:   <Footprints size={13} />,
  photo:  <Camera     size={13} />,
  family: <Users      size={13} />,
};

const ROUTE_PILL: Record<string, string> = {
  bike:   "bg-sky-100 text-sky-700",
  car:    "bg-orange-100 text-orange-700",
  walk:   "bg-forest-100 text-forest-600",
  photo:  "bg-tulip-100 text-tulip-600",
  family: "bg-petal/40 text-tulip-600",
};

function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRouteCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-card" style={{ backgroundColor: "var(--color-surface-2)" }}>
      <div className="h-52 skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-5 skeleton-shimmer rounded w-2/3" />
        <div className="h-4 skeleton-shimmer rounded w-full" />
        <div className="h-4 skeleton-shimmer rounded w-4/5" />
        <div className="flex gap-3 pt-1">
          <div className="h-4 skeleton-shimmer rounded w-16" />
          <div className="h-4 skeleton-shimmer rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// ─── Route card ───────────────────────────────────────────────────────────────

function RouteListCard({ route, onClick }: { route: Route; onClick: () => void }) {
  const { t } = useT();
  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900";
  const type = route.route_type as RouteType | undefined;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl overflow-hidden bg-surface-2 shadow-card hover:shadow-card-hover active:scale-[0.99] transition-all duration-200 text-left"
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={imgError ? fallback : (route.cover_image_url ?? fallback)}
          alt={route.title ?? "Route"}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {type && (
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${ROUTE_PILL[type]} backdrop-blur-sm`}>
              {ROUTE_ICON[type]} {t(`route_type.${type}_route`)}
            </span>
          </div>
        )}

        {route.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-amber-900">
              ⭐ {t("common.featured")}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          {route.distance_km != null && (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {type ? ROUTE_ICON[type] : <Bike size={12} />} {route.distance_km} km
            </span>
          )}
          {route.duration_minutes != null && (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              <Clock size={12} /> {formatDuration(route.duration_minutes)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-base font-extrabold leading-snug mb-1.5"
            style={{ color: "var(--color-text)" }}>{route.title}</h3>
        {route.description && (
          <p className="text-sm leading-relaxed line-clamp-2 mb-3"
             style={{ color: "var(--color-text-2)" }}>{route.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {route.distance_km != null && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${type ? ROUTE_PILL[type] : "bg-surface-3 text-[var(--color-text-2)]"}`}>
                {route.distance_km} km
              </span>
            )}
            {route.duration_minutes != null && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-surface-3 px-2.5 py-1 rounded-full"
                    style={{ color: "var(--color-text-2)" }}>
                <Clock size={11} /> {formatDuration(route.duration_minutes)}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-tulip-500">
            {t("routes.view_route")} <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Filter sheet ─────────────────────────────────────────────────────────────

function FilterPills({ options, selected, onToggle }: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-150 active:scale-95
              ${isActive ? "bg-tulip-500 border-tulip-500 text-white" : "border-[var(--color-border)]"}`}
            style={!isActive ? { backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" } : {}}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FilterSheet({ show, filters, filteredCount, onClose, onChange }: {
  show: boolean;
  filters: FilterState;
  filteredCount: number;
  onClose: () => void;
  onChange: (f: FilterState) => void;
}) {
  function toggle(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  const hasActive = countSecondary(filters) > 0;

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300
        ${show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl flex flex-col max-h-[88vh]
          transition-transform duration-300
          ${show ? "translate-y-0" : "translate-y-full"}`}
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-[var(--color-border)]">
          <button
            onClick={() => onChange({ ...DEFAULT_FILTERS, activity: filters.activity })}
            className={`text-sm font-semibold transition-opacity ${hasActive ? "opacity-100" : "opacity-30 cursor-default"}`}
            style={{ color: "var(--color-text-2)" }}
          >
            Wis filters
          </button>
          <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Filters</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pt-5 pb-2">
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-2.5" style={{ color: "var(--color-text)" }}>Afstand</h3>
            <FilterPills options={DISTANCES} selected={filters.distances}
              onToggle={(v) => onChange({ ...filters, distances: toggle(filters.distances, v) })} />
          </div>
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-2.5" style={{ color: "var(--color-text)" }}>Moeilijkheid</h3>
            <FilterPills options={DIFFICULTIES} selected={filters.difficulty ? [filters.difficulty] : []}
              onToggle={(v) => onChange({ ...filters, difficulty: filters.difficulty === v ? null : v })} />
          </div>
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-2.5" style={{ color: "var(--color-text)" }}>Omgeving</h3>
            <FilterPills options={ENVIRONMENTS} selected={filters.environments}
              onToggle={(v) => onChange({ ...filters, environments: toggle(filters.environments, v) })} />
          </div>
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-2.5" style={{ color: "var(--color-text)" }}>Thema</h3>
            <FilterPills options={FILTER_THEMES} selected={filters.themes}
              onToggle={(v) => onChange({ ...filters, themes: toggle(filters.themes, v) })} />
          </div>
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-2.5" style={{ color: "var(--color-text)" }}>Doelgroep</h3>
            <FilterPills options={AUDIENCES} selected={filters.audiences}
              onToggle={(v) => onChange({ ...filters, audiences: toggle(filters.audiences, v) })} />
          </div>
        </div>

        {/* Sticky apply button */}
        <div className="px-5 py-4 flex-shrink-0 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-tulip-500 text-white font-bold rounded-2xl text-sm
                       active:scale-[0.98] transition-transform"
          >
            Toon {filteredCount} route{filteredCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RoutesPage() {
  const router   = useRouter();
  const { t }    = useT();
  const location = useUserLocation();
  const weather  = useWeather(location.coords);

  const [routes,    setRoutes]    = useState<Route[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [premium,   setPremium]   = useState(true);
  const [filters,   setFilters]   = useState<FilterState>(DEFAULT_FILTERS);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => { setPremium(isPremium()); }, []);

  useEffect(() => {
    supabase.from("routes").select("*").eq("is_active", true)
      .order("is_featured", { ascending: false })
      .then(({ data }) => { setRoutes(data ?? []); setLoading(false); });
  }, []);

  const filtered       = routes.filter((r) => matchesFilters(r, filters));
  const secondaryCount = countSecondary(filters);

  return (
    <div className="min-h-screen bg-surface pb-28">

      <div className="bg-surface-2 px-5 pt-12 pb-4 border-b border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push("/home")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 tap-scale"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-text)] leading-tight">
              {t("routes.title")}
            </h1>
            <p className="text-xs text-[var(--color-text-3)]">
              {loading
                ? t("common.loading")
                : t(filtered.length === 1 ? "routes.count_one" : "routes.count", { count: filtered.length })}
            </p>
          </div>
        </div>

        <WeatherCompact current={weather.current} locationLabel={location.locationLabel} />

        {/* Activiteit pills + filters-knop */}
        <div className="flex items-center gap-2 pt-3 pb-0.5">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
            {ACTIVITIES.map((a) => {
              const isActive = filters.activity === a.id;
              const count = routes.filter((r) =>
                matchesFilters(r, { ...filters, activity: a.id })
              ).length;
              return (
                <button
                  key={a.id}
                  onClick={() => setFilters((f) => ({ ...f, activity: a.id }))}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold
                              border transition-all duration-200 active:scale-95
                              ${isActive ? "bg-tulip-500 border-tulip-500 text-white shadow-sm" : "border-[var(--color-border)]"}`}
                  style={!isActive ? { backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" } : {}}
                >
                  {a.icon} {a.label}
                  {!loading && count > 0 && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none
                                   ${isActive ? "bg-white/25 text-white" : ""}`}
                      style={!isActive ? { backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" } : {}}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters knop */}
          <button
            onClick={() => setShowSheet(true)}
            className={`relative flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold
                        border transition-all duration-200 active:scale-95
                        ${secondaryCount > 0
                          ? "bg-tulip-50 border-tulip-300 text-tulip-600"
                          : "border-[var(--color-border)]"}`}
            style={secondaryCount === 0 ? { backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" } : {}}
          >
            <SlidersHorizontal size={13} />
            {secondaryCount > 0 && (
              <span
                className="absolute flex items-center justify-center bg-tulip-500 text-white font-extrabold rounded-full"
                style={{ top: "-6px", right: "-6px", width: "18px", height: "18px", fontSize: "9px", lineHeight: 1 }}
              >
                {secondaryCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Weerbanner */}
      <WeatherBanner current={weather.current} scoreThreshold={40} />

      {/* Route lijst */}
      <div className="px-4 pt-5 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRouteCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-20 h-20 rounded-full bg-tulip-50 flex items-center justify-center mb-5">
              <span className="text-4xl">🚴</span>
            </div>
            <h3 className="font-display font-bold text-[var(--color-text)] text-lg mb-1.5">
              {t("routes.no_routes_title")}
            </h3>
            <p className="text-sm text-[var(--color-text-3)] mb-5">{t("routes.no_routes_desc")}</p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="px-5 py-2.5 bg-tulip-500 text-white text-sm font-bold rounded-full
                         tap-scale hover:bg-tulip-600 transition-colors"
            >
              {t("routes.show_all")}
            </button>
          </div>
        ) : (
          <>
            {filtered.slice(0, FREE_ROUTE_LIMIT).map((route) => (
              <RouteListCard key={route.id} route={route} onClick={() => router.push(`/routes/${route.slug}`)} />
            ))}
            {filtered.length > FREE_ROUTE_LIMIT && (
              <PremiumGate>
                <div className="space-y-4">
                  {filtered.slice(FREE_ROUTE_LIMIT).map((route) => (
                    <RouteListCard key={route.id} route={route} onClick={premium ? () => router.push(`/routes/${route.slug}`) : () => {}} />
                  ))}
                </div>
              </PremiumGate>
            )}
          </>
        )}
      </div>

      {/* 7-daagse voorspelling */}
      {weather.daily.length > 0 && (
        <div className="pt-6 pb-4">
          <WeatherForecast daily={weather.daily} />
        </div>
      )}

      <FilterSheet
        show={showSheet}
        filters={filters}
        filteredCount={filtered.length}
        onClose={() => setShowSheet(false)}
        onChange={setFilters}
      />
    </div>
  );
}
