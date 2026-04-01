"use client";

import { usePathname, useParams, useRouter } from "next/navigation";

type TabId = "discover" | "saved" | "map" | "profile";

interface Tab {
  id:      TabId;
  label:   string;
  segment: string;
  icon:    (active: boolean) => React.ReactNode;
}

const ACTIVE_COLOR   = "#3B6D11";
const INACTIVE_COLOR = "#9CA3AF";

function IconGrid(active: boolean) {
  const c = active ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="2"  y="2"  width="8" height="8" rx="1.5" fill={c} />
      <rect x="12" y="2"  width="8" height="8" rx="1.5" fill={c} />
      <rect x="2"  y="12" width="8" height="8" rx="1.5" fill={c} />
      <rect x="12" y="12" width="8" height="8" rx="1.5" fill={c} />
    </svg>
  );
}

function IconBookmark(active: boolean) {
  const c = active ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M5 3h12a1 1 0 0 1 1 1v15l-7-4-7 4V4a1 1 0 0 1 1-1z"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? c : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function IconMapPin(active: boolean) {
  const c = active ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M11 2a6 6 0 0 1 6 6c0 5-6 12-6 12S5 13 5 8a6 6 0 0 1 6-6z"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? c : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <circle cx="11" cy="8" r="2.5" fill={c} />
    </svg>
  );
}

function IconPerson(active: boolean) {
  const c = active ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="7" r="3.5" stroke={c} strokeWidth="2" fill={active ? c : "none"} fillOpacity={active ? 0.15 : 0} />
      <path
        d="M3.5 20c0-4.142 3.358-7 7.5-7s7.5 2.858 7.5 7"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS: Tab[] = [
  { id: "discover", label: "Ontdekken", segment: "home",     icon: IconGrid     },
  { id: "saved",    label: "Mijn lijst", segment: "saved",   icon: IconBookmark },
  { id: "map",      label: "Kaart",     segment: "map",     icon: IconMapPin   },
  { id: "profile",  label: "Profiel",   segment: "settings", icon: IconPerson  },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const params   = useParams();
  const router   = useRouter();
  const locale   = (params?.locale as string | undefined) ?? "nl";

  const activeId: TabId =
    TABS.find((t) => pathname.includes(`/${t.segment}`))?.id ?? "discover";

  return (
    <nav
      style={{
        position:        "fixed",
        bottom:          0,
        left:            0,
        right:           0,
        zIndex:          50,
        backgroundColor: "var(--background, #fff)",
        borderTop:       "0.5px solid #E5E7EB",
      }}
    >
      <div
        style={{
          display:       "flex",
          alignItems:    "stretch",
          height:        60,
          maxWidth:      430,
          margin:        "0 auto",
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/${locale}/${tab.segment}`)}
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            3,
                background:     "none",
                border:         "none",
                cursor:         "pointer",
                padding:        0,
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon(isActive)}
              <span
                style={{
                  fontSize:   10,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  lineHeight: 1,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
