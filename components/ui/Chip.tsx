"use client";

import { tap } from "@/lib/haptics";

export type ChipProps = {
  children:   React.ReactNode;
  selected?:  boolean;
  onClick?:   () => void;
  icon?:      React.ReactNode;
  className?: string;
};

/** Selecteerbaar filterlabel. Visueel 36px hoog, raakvlak 44px. */
export function Chip({ children, selected = false, onClick, icon, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => { tap(); onClick?.(); }}
      className={[
        "relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-label whitespace-nowrap flex-shrink-0",
        // Onzichtbare uitbreiding van het raakvlak tot 44px
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        "transition-[transform,background-color,color] duration-fast ease-out-soft active:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "bg-primary text-on-primary shadow-sm"
          : "bg-surface-2 text-ink-2 border border-line hover:border-line-strong",
        className,
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}
