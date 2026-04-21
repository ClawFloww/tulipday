"use client";

// Live-banner voor de homepagina — verschijnt alleen tijdens het Bloemencorso (19–21 apr 2026)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Corso-venster: start op 19 april 09:00 en eindigt op 21 april 22:00 (lokaal NL)
const CORSO_START = new Date("2026-04-19T09:00:00+02:00");
const CORSO_END   = new Date("2026-04-21T22:00:00+02:00");

function isCorsoActive(): boolean {
  const now = new Date();
  return now >= CORSO_START && now <= CORSO_END;
}

export function CorsoLiveBanner() {
  const router = useRouter();
  const [photoCount, setPhotoCount] = useState<number | null>(null);

  // Haal actueel aantal foto's op
  useEffect(() => {
    if (!isCorsoActive()) return;

    async function fetchCount() {
      const { count } = await supabase
        .from("corso_photos")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("is_reported", false);
      if (count !== null) setPhotoCount(count);
    }

    fetchCount();

    // Luister naar nieuwe foto's voor live teller
    const channel = supabase
      .channel("corso_banner_count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "corso_photos" },
        () => { setPhotoCount((c) => (c !== null ? c + 1 : 1)); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!isCorsoActive()) return null;

  return (
    <div className="mx-4 mb-6">
      <button
        onClick={() => router.push("/corso")}
        className="w-full px-5 py-4 rounded-2xl text-white flex items-center justify-between gap-3 shadow-md active:scale-95 transition-all"
        style={{ background: "linear-gradient(135deg, #F0306A 0%, #FF6B9D 100%)" }}
      >
        <div className="text-left">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">
              Live · 19–21 april 2026
            </span>
          </div>

          <p className="text-base font-extrabold leading-tight">🌸 Bloemencorso Live</p>

          <p className="text-xs opacity-80 mt-0.5">
            {photoCount !== null
              ? `${photoCount} foto${photoCount !== 1 ? "'s" : ""} gedeeld · Deel de jouwe!`
              : "Deel je foto's van de stoet"}
          </p>
        </div>

        <ChevronRight size={20} className="flex-shrink-0 opacity-80" />
      </button>
    </div>
  );
}
