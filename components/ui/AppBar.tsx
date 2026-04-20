"use client";

// AppBar — herbruikbare paginaheader
// Gebruik op subpagina's (showBack=true) of hoofdpagina's (TulipDay-logo)
// Krimpt van 56px naar 44px bij scrollen, achtergrond wordt iets meer opaque

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface AppBarProps {
  /** Paginatitel — weergegeven in Playfair Display */
  title: string;
  /** Optionele subtitel onder de titel (verdwijnt bij scrollen) */
  subtitle?: string;
  /** Toon een terugpijl links (voor subpagina's) */
  showBack?: boolean;
  /** Navigeer naar dit pad bij de terugpijl; anders router.back() */
  backHref?: string;
  /** Contextuele actie rechts (bv. filter-icoon) */
  right?: React.ReactNode;
  className?: string;
}

export function AppBar({
  title,
  subtitle,
  showBack = false,
  backHref,
  right,
  className = "",
}: AppBarProps) {
  const router   = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Detecteer scrollen voor de krimp-animatie
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 nav-glass border-b border-black/[0.06]
        transition-shadow duration-200 ${scrolled ? "shadow-sm" : ""} ${className}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="flex items-center gap-3 px-4 max-w-[430px] mx-auto transition-all duration-200"
        style={{ height: scrolled ? 44 : 56 }}
      >
        {/* Links: terug-pijl of tulp-logo */}
        {showBack ? (
          <button
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       transition-colors flex-shrink-0 tap-scale"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
            aria-label="Terug"
          >
            <ArrowLeft size={16} />
          </button>
        ) : (
          <span className="text-tulip-500 text-lg leading-none select-none">🌷</span>
        )}

        {/* Midden: paginatitel */}
        <div className="flex-1 min-w-0">
          <h1
            className={`font-display font-bold text-[var(--color-text)] leading-tight truncate
              transition-all duration-200 ${scrolled ? "text-base" : "text-lg"}`}
          >
            {title}
          </h1>
          {subtitle && !scrolled && (
            <p className="text-xs text-[var(--color-text-3)] leading-none mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Rechts: contextuele actie */}
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </div>
  );
}
