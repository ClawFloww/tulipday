"use client";

// Demo-pagina: auto-gegenereerde fietsroutes langs Bollenstreek bollenvelden

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import RouteListScreen from "@/components/routes/RouteListScreen";
import { MOCK_BLOOM_STATUSES } from "@/lib/tulipFields";

export default function FietsroutesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10"
           style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
            aria-label="Terug"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
              🚴 Fietsroutes
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
              Fietsroutes langs bollenvelden
            </p>
          </div>
        </div>
      </div>

      {/* Routes — start automatisch vanuit Keukenhof */}
      <RouteListScreen
        initialFilters={{
          startKey:      "keukenhof",
          maxDistanceKm: 10,
          fieldCount:    "normaal",
          sort:          "dichtstbij",
        }}
        statuses={MOCK_BLOOM_STATUSES}
      />
    </div>
  );
}
