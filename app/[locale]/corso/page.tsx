"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Map, ImageIcon, Plus } from "lucide-react";
import { CorsoRouteMap }    from "@/components/corso/CorsoRouteMap";
import { CorsoFeed }        from "@/components/corso/CorsoFeed";
import { CorsoUploadSheet } from "@/components/corso/CorsoUploadSheet";

type Tab = "route" | "feed";

export default function CorsoPage() {
  const router = useRouter();
  const [tab,          setTab]          = useState<Tab>("feed");
  const [showUpload,   setShowUpload]   = useState(false);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* Header */}
      <div
        className="px-4 pt-12 pb-0 sticky top-0 z-20"
        style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--color-text-3)" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
              🌸 Bloemencorso
            </h1>
            <p className="text-xs font-medium" style={{ color: "var(--color-text-3)" }}>
              Bollenstreek · Noordwijk → Haarlem
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid var(--color-border)" }}>
          {([
            { id: "feed",  icon: <ImageIcon size={15} />, label: "Feed"  },
            { id: "route", icon: <Map       size={15} />, label: "Route" },
          ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id ? "border-[#F0306A] text-[#F0306A]" : "border-transparent"
              }`}
              style={tab !== t.id ? { color: "var(--color-text-3)" } : undefined}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "route" && <CorsoRouteMap />}
      {tab === "feed"  && <CorsoFeed />}

      {/* Upload FAB — alleen zichtbaar op feed tab */}
      {tab === "feed" && (
        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white active:scale-90 transition-all"
          style={{ backgroundColor: "#F0306A" }}
          aria-label="Foto uploaden"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* Upload sheet */}
      {showUpload && (
        <CorsoUploadSheet
          onClose={() => setShowUpload(false)}
          onUploaded={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
