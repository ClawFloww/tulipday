"use client";

import { useState, useMemo } from "react";
import { SwipeCard }   from "@/components/SwipeCard";
import { FilterChips } from "@/components/FilterChips";
import {
  type FieldData,
  filterByStatus,
  filterByDistance,
} from "@/lib/bloomStatus";

/* ── Mock data ─────────────────────────────────────────────────── */
const ALL_FIELDS: FieldData[] = [
  {
    id:           "1",
    name:         "Keukenhof Bollenveld",
    location:     "Lisse",
    distanceKm:   12,
    flowerTypes:  ["tulpen", "narcissen"],
    bloomStatus:  "in_bloom",
    bloomPercent: 88,
    daysRemaining: 18,
    tags:         ["Gratis", "Parkeren aanwezig"],
    imageEmoji:   "🌷",
    imageBgColor: "#FFE4E8",
  },
  {
    id:           "2",
    name:         "Bollenroute Noordwijk",
    location:     "Noordwijk aan Zee",
    distanceKm:   8,
    flowerTypes:  ["tulpen", "hyacinten"],
    bloomStatus:  "in_bloom",
    bloomPercent: 72,
    daysRemaining: 11,
    tags:         ["Fietsvriendelijk", "Gratis"],
    imageEmoji:   "🌸",
    imageBgColor: "#FDE8F5",
  },
  {
    id:           "3",
    name:         "Koolzaadvelden Zeeland",
    location:     "Middelburg",
    distanceKm:   38,
    flowerTypes:  ["koolzaad"],
    bloomStatus:  "in_bloom",
    bloomPercent: 65,
    daysRemaining: 9,
    tags:         ["Gratis", "Rustig"],
    imageEmoji:   "🌻",
    imageBgColor: "#FFF8D6",
  },
  {
    id:           "4",
    name:         "Tulpenveld Anna Paulowna",
    location:     "Anna Paulowna",
    distanceKm:   56,
    flowerTypes:  ["tulpen"],
    bloomStatus:  "almost",
    bloomPercent: 32,
    daysRemaining: 7,
    tags:         ["Parkeren aanwezig"],
    imageEmoji:   "🌺",
    imageBgColor: "#FFE0E0",
  },
  {
    id:           "5",
    name:         "Narcissenveld Teylingen",
    location:     "Sassenheim",
    distanceKm:   15,
    flowerTypes:  ["narcissen"],
    bloomStatus:  "almost",
    bloomPercent: 28,
    daysRemaining: 5,
    tags:         ["Gratis", "Honden welkom"],
    imageEmoji:   "🌼",
    imageBgColor: "#FFFBCC",
  },
  {
    id:           "6",
    name:         "Hyacintenvelden Bollenstreek",
    location:     "Hillegom",
    distanceKm:   19,
    flowerTypes:  ["hyacinten"],
    bloomStatus:  "almost",
    bloomPercent: 20,
    daysRemaining: 4,
    tags:         ["Gratis"],
    imageEmoji:   "💜",
    imageBgColor: "#EFE0FF",
  },
  {
    id:           "7",
    name:         "Tulpenveld Venhuizen",
    location:     "Venhuizen",
    distanceKm:   72,
    flowerTypes:  ["tulpen", "koolzaad"],
    bloomStatus:  "over",
    bloomPercent: 8,
    daysRemaining: 0,
    tags:         ["Parkeren aanwezig"],
    imageEmoji:   "🍂",
    imageBgColor: "#F0EDE8",
  },
  {
    id:           "8",
    name:         "Krokussenveld Amstelveen",
    location:     "Amstelveen",
    distanceKm:   5,
    flowerTypes:  ["krokussen"],
    bloomStatus:  "over",
    bloomPercent: 6,
    daysRemaining: 0,
    tags:         ["Gratis", "Openbaar vervoer"],
    imageEmoji:   "🌾",
    imageBgColor: "#E8F0E8",
  },
];

const CHIPS = ["Alle", "In bloei", "Bijna", "Voorbij", "Tulpen", "Koolzaad", "< 20 km", "Gratis"];

function applyChipFilter(fields: FieldData[], chip: string): FieldData[] {
  switch (chip) {
    case "In bloei":
    case "Bijna":
    case "Voorbij":
      return filterByStatus(fields, chip);
    case "< 20 km":
      return filterByDistance(fields, 20);
    case "Tulpen":
      return fields.filter((f) =>
        f.flowerTypes.some((t) => t.toLowerCase().includes("tulp"))
      );
    case "Koolzaad":
      return fields.filter((f) =>
        f.flowerTypes.some((t) => t.toLowerCase().includes("koolzaad"))
      );
    case "Gratis":
      return fields.filter((f) => f.tags.includes("Gratis"));
    default:
      return fields;
  }
}

/* ── Component ─────────────────────────────────────────────────── */
export default function DiscoverPage() {
  const [activeChip,  setActiveChip]  = useState("Alle");
  const [dismissed,   setDismissed]   = useState<Set<string>>(new Set());
  const [savedIds,    setSavedIds]    = useState<Set<string>>(new Set());
  const [visitedIds,  setVisitedIds]  = useState<Set<string>>(new Set());

  /* Filtered + un-dismissed deck */
  const deck = useMemo(() => {
    const base = ALL_FIELDS.filter((f) => !dismissed.has(f.id));
    return applyChipFilter(base, activeChip);
  }, [dismissed, activeChip]);

  const visibleFields = deck.slice(0, 3);

  function handleSwipeRight(id: string) {
    setVisitedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    setDismissed((prev)  => { const s = new Set(prev); s.add(id); return s; });
  }

  function handleSwipeLeft(id: string) {
    setDismissed((prev) => { const s = new Set(prev); s.add(id); return s; });
  }

  function handleSave(id: string) {
    setSavedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else           s.add(id);
      return s;
    });
  }

  function handleReset() {
    setDismissed(new Set());
    setActiveChip("Alle");
  }

  return (
    <div
      className="min-h-screen bg-warm"
      style={{ paddingBottom: 80 }}
    >
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-extrabold text-[#1A1A1A] mb-4">🌷 Ontdek velden</h1>
        <FilterChips
          chips={CHIPS}
          active={activeChip}
          onChange={setActiveChip}
        />
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-5 py-3 text-xs font-semibold text-gray-400">
        <span>{deck.length} velden</span>
        {visitedIds.size > 0 && (
          <span style={{ color: "#639922" }}>{visitedIds.size} te bezoeken 📍</span>
        )}
        {savedIds.size > 0 && (
          <span style={{ color: "#F472B6" }}>{savedIds.size} opgeslagen ♥</span>
        )}
      </div>

      {/* Card deck */}
      <div
        className="relative mx-auto"
        style={{
          maxWidth:     430,
          paddingLeft:  16,
          paddingRight: 16,
          /* Height = tallest visible card; enough for the back-card stack offset */
          minHeight:    520,
        }}
      >
        {visibleFields.length === 0 ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center rounded-3xl bg-white text-center"
            style={{
              height: 460,
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <span style={{ fontSize: 56 }}>🌷</span>
            <p className="text-lg font-extrabold text-[#1A1A1A] mt-4 mb-2">
              Alle velden bekeken!
            </p>
            <p className="text-sm text-gray-400 mb-6 px-8">
              Probeer een ander filter of begin opnieuw.
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#639922" }}
            >
              Opnieuw beginnen
            </button>
          </div>
        ) : (
          visibleFields.map((field, index) => {
            const stackTransforms = [
              "scale(1)     translateY(0px)",
              "scale(0.955) translateY(11px)",
              "scale(0.91)  translateY(22px)",
            ];
            return (
              <div
                key={field.id}
                style={{
                  position:      index === 0 ? "relative" : "absolute",
                  top:           index === 0 ? undefined : 0,
                  left:          index === 0 ? undefined : 16,
                  right:         index === 0 ? undefined : 16,
                  transform:     index === 0 ? undefined : stackTransforms[index],
                  transformOrigin: "top center",
                  transition:    "transform 300ms cubic-bezier(.25,.46,.45,.94)",
                  zIndex:        visibleFields.length - index,
                  pointerEvents: index === 0 ? "auto" : "none",
                }}
              >
                <SwipeCard
                  field={field}
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onSave={handleSave}
                  isTop={index === 0}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Hint text */}
      {visibleFields.length > 0 && (
        <p className="text-center text-xs text-gray-300 mt-4 pb-2">
          sleep of gebruik de knoppen
        </p>
      )}
    </div>
  );
}
