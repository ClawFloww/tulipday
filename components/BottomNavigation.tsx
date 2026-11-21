"use client";

// TulipDay Bottom Navigation — de enige navigatiebalk van de app
// Vijf tabs met altijd zichtbare labels; actieve tab in merkrood met
// glijdende capsule. Hoogte = --nav-height + safe area (home-indicator).

import { usePathname, useParams, useRouter } from "next/navigation";
import { Map, CalendarDays, Flower2, Heart, User, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { tap } from "@/lib/haptics";
import { useT } from "@/lib/i18n-context";

type TabId = "map" | "plan" | "fields" | "saved" | "profile";

interface Tab {
  id:       TabId;
  labelKey: string;
  segment:  string;
  Icon:     LucideIcon;
}

const TABS: Tab[] = [
  { id: "map",     labelKey: "nav.map",     segment: "map",      Icon: Map          },
  { id: "plan",    labelKey: "nav.plan",    segment: "plan",     Icon: CalendarDays },
  { id: "fields",  labelKey: "nav.fields",  segment: "home",     Icon: Flower2      },
  { id: "saved",   labelKey: "nav.saved",   segment: "saved",    Icon: Heart        },
  { id: "profile", labelKey: "nav.profile", segment: "settings", Icon: User         },
];

// Subpagina's die onder een tab vallen zonder dat het segment in de URL staat
const SUBPAGE_TABS: Record<string, TabId> = {
  account: "profile",
  premium: "profile",
};

// Welke tab is actief op basis van URL
function getActiveTab(pathname: string): TabId {
  const sub = Object.keys(SUBPAGE_TABS).find((segment) => pathname.includes(`/${segment}`));
  if (sub) return SUBPAGE_TABS[sub];
  // Langst passende segment wint (voorkomt false matches)
  const matches = TABS.filter((t) => pathname.includes(`/${t.segment}`));
  if (matches.length === 0) return "fields";
  return matches.sort((a, b) => b.segment.length - a.segment.length)[0].id;
}

export function BottomNavigation() {
  const pathname = usePathname();
  const params   = useParams();
  const router   = useRouter();
  const { t }    = useT();
  const locale   = (params?.locale as string | undefined) ?? "nl";

  // Verberg op fullscreen-ervaringen waar de tabs over de eigen
  // bottom-UI van de pagina heen vallen (navigatie, actieve route, onboarding).
  if (pathname.includes("/navigate") || pathname.includes("/active-route") || pathname.includes("/onboarding")) {
    return null;
  }

  const activeId = getActiveTab(pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-glass border-t border-line pb-safe">
      <div className="flex items-stretch h-[var(--nav-height)] max-w-[430px] mx-auto">
        {TABS.map((tab) => {
          const isActive = tab.id === activeId;

          return (
            <button
              key={tab.id}
              data-tour={`nav-${tab.id}`}
              onClick={() => {
                if (!isActive) tap();
                router.push(`/${locale}/${tab.segment}`);
              }}
              aria-current={isActive ? "page" : undefined}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-touch
                         transition-transform duration-fast active:scale-[0.94]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary rounded-2xl"
            >
              {/* Glijdende capsule achter het icoon van de actieve tab */}
              <span className="relative flex items-center justify-center h-7 w-14">
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-primary-subtle"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <tab.Icon
                  size={21}
                  strokeWidth={isActive ? 2.4 : 2}
                  className={`relative z-10 transition-colors duration-fast ${isActive ? "text-primary" : "text-ink-3"}`}
                />
              </span>
              <span className={`text-[10.5px] leading-none font-bold transition-colors duration-fast ${isActive ? "text-primary" : "text-ink-3"}`}>
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
