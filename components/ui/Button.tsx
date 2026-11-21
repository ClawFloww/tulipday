"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { tap } from "@/lib/haptics";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:   Variant;
  size?:      Size;
  /** Toont een spinner in de knop en blokkeert klikken. */
  loading?:   boolean;
  fullWidth?: boolean;
  /** Lucide-icoon vóór de tekst. */
  icon?:      React.ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-primary text-on-primary shadow-sm hover:bg-primary-dark",
  secondary: "bg-surface-2 text-ink border border-line-strong hover:bg-surface-3",
  ghost:     "bg-transparent text-ink-2 hover:bg-surface-3",
  danger:    "bg-danger text-on-primary shadow-sm hover:opacity-90",
};

// Alle maten halen minimaal 44px hoogte (touch target)
const SIZES: Record<Size, string> = {
  sm: "min-h-touch px-3.5 text-label gap-1.5 rounded-xl",
  md: "min-h-[48px] px-4 text-[15px] font-bold gap-2 rounded-xl",
  lg: "min-h-[54px] px-5 text-headline gap-2 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = false, icon, className = "", children, onClick, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (variant === "primary") tap();
        onClick?.(e);
      }}
      className={[
        "inline-flex items-center justify-center font-bold select-none",
        "transition-[transform,background-color,opacity] duration-fast ease-out-soft active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
