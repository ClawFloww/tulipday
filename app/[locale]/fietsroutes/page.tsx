"use client";

// Demo-pagina: auto-gegenereerde fietsroutes langs Bollenstreek bollenvelden

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import RouteListScreen from "@/components/routes/RouteListScreen";
import { MOCK_BLOOM_STATUSES } from "@/lib/tulipFields";

export default function FietsroutesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF7" }}>

      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center
                       text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Terug"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight">
              🚴 Fietsroutes
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
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
