"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Map, ImageIcon, Camera } from "lucide-react";
import { CorsoRouteMap } from "@/components/corso/CorsoRouteMap";
import { CorsoPhotoFeed }  from "@/components/corso/CorsoPhotoFeed";
import { CorsoPhotoUpload } from "@/components/corso/CorsoPhotoUpload";

type Tab = "route" | "feed" | "upload";

export default function CorsoPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("route");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-warm pb-20">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 leading-tight">🌸 Bloemencorso</h1>
            <p className="text-xs text-gray-400 font-medium">Bollenstreek · Noordwijk → Haarlem</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {([
            { id: "route",  icon: <Map       size={15} />, label: "Route"  },
            { id: "feed",   icon: <ImageIcon size={15} />, label: "Feed"   },
            { id: "upload", icon: <Camera    size={15} />, label: "Upload" },
          ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors
                ${tab === t.id
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content — route map gets no extra padding, others do */}
      {tab === "route" && <CorsoRouteMap />}

      {tab === "feed" && (
        <div className="pt-4">
          <CorsoPhotoFeed key={refreshKey} />
        </div>
      )}

      {tab === "upload" && (
        <div className="pt-4">
          <CorsoPhotoUpload
            onUploaded={() => {
              setRefreshKey((k) => k + 1);
              setTab("feed");
            }}
          />
        </div>
      )}
    </div>
  );
}
