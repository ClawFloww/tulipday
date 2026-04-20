"use client";

// TulipDay Bottom Navigation
// Vijf tabs: Kaart, Routes, Velden, Weer, Profiel
// Frosted glass achtergrond, spring-animaties via Framer Motion
// Actieve tab: tulip-roze capsule + label; inactieve tabs: grijs icoon

import { usePathname, useParams, useRouter } from "next/navigation";
import { Map, Bike, Flower2, Sun, User, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type TabId = "map" | "routes" | "fields" | "weather" | "profile";

interface Tab {
  id:      TabId;
  label:   string;
  segment: string;
  Icon:    LucideIcon;
}

// Kleuren — actief gebruikt CSS variabele voor automatische donker-modus
const ACTIVE_COLOR   = "var(--color-primary)";
const INACTIVE_COLOR = "#B0B0B0";

const TABS: Tab[] = [
  { id: "map",     label: "Kaart",   segment: "map",      Icon: Map     },
  { id: "routes",  label: "Routes",  segment: "routes",   Icon: Bike    },
  { id: "fields",  label: "Velden",  segment: "home",     Icon: Flower2 },
  { id: "weather", label: "Weer",    segment: "weather",  Icon: Sun     },
  { id: "profile", label: "Profiel", segment: "settings", Icon: User    },
];

// Welke tab is actief op basis van URL
function getActiveTab(pathname: string): TabId {
  // Langst passende segment wint (voorkomt false matches)
  const matches = TABS.filter((t) => pathname.includes(`/${t.segment}`));
  if (matches.length === 0) return "fields";
  return matches.sort((a, b) => b.segment.length - a.segment.length)[0].id;
}

export function BottomNavigation() {
  const pathname = usePathname();
  const params   = useParams();
  const router   = useRouter();
  const locale   = (params?.locale as string | undefined) ?? "nl";

  const activeId = getActiveTab(pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 nav-glass border-t border-black/[0.06]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-[60px] max-w-[430px] mx-auto">
        {TABS.map((tab) => {
          const isActive = tab.id === activeId;

          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/${locale}/${tab.segment}`)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex-1 flex flex-col items-center justify-center tap-scale"
            >
              {/* Verschuivende achtergrond-capsule — gebruik CSS var voor donker thema */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-x-1.5 top-2 bottom-2 rounded-full"
                  style={{ backgroundColor: "var(--color-primary-subtle)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}

              {/* Icoon — spring-schaal bij activeren */}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1.0,
                  y:     isActive ? -1  : 0,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative z-10"
              >
                <tab.Icon
                  size={22}
                  style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
                />
              </motion.div>

              {/* Label — alleen zichtbaar bij actieve tab, klapt in/uit */}
              <motion.span
                initial={false}
                animate={{
                  opacity:    isActive ? 1  : 0,
                  height:     isActive ? 13 : 0,
                  marginTop:  isActive ? 2  : 0,
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="relative z-10 text-[10px] font-bold leading-none overflow-hidden whitespace-nowrap"
                style={{ color: ACTIVE_COLOR }}
              >
                {tab.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
