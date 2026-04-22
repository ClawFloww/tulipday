"use client";

import { useRouter } from "next/navigation";
import { Home, Map, RouteIcon, Heart, Settings } from "lucide-react";
import { useT } from "@/lib/i18n-context";

type Tab = "home" | "map" | "routes" | "saved" | "settings";

const TABS: { id: Tab; icon: React.ReactNode; href: string }[] = [
  { id: "home",     icon: <Home      size={22} />, href: "/home"     },
  { id: "map",      icon: <Map       size={22} />, href: "/map"      },
  { id: "routes",   icon: <RouteIcon size={22} />, href: "/routes"   },
  { id: "saved",    icon: <Heart     size={22} />, href: "/saved"    },
  { id: "settings", icon: <Settings  size={22} />, href: "/settings" },
];

export function BottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  const { t } = useT();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
         style={{ backgroundColor: "var(--color-surface-2)", borderTop: "1px solid var(--color-border)" }}>
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150
                ${isActive ? "text-tulip-500" : ""}`}
              style={!isActive ? { color: "var(--color-text-3)" } : {}}
            >
              <span className={`transition-transform duration-150 ${isActive ? "scale-110" : "scale-100"}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? "text-tulip-500" : ""}`}
                    style={!isActive ? { color: "var(--color-text-3)" } : {}}>
                {t(`nav.${tab.id}`)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
