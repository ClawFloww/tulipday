"use client";

import { forwardRef } from "react";

type Variant = "surface" | "ghost" | "overlay" | "primary";

export type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Verplicht: een icoon zonder tekst heeft een label nodig voor schermlezers. */
  "aria-label": string;
  variant?: Variant;
};

const VARIANTS: Record<Variant, string> = {
  surface: "bg-surface-2 text-ink shadow-md hover:bg-surface-3",
  ghost:   "bg-transparent text-ink-2 hover:bg-surface-3",
  // Over foto's en kaarten
  overlay: "bg-black/40 text-white backdrop-blur-md hover:bg-black/55",
  primary: "bg-primary text-on-primary shadow-md hover:bg-primary-dark",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "surface", className = "", type = "button", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex items-center justify-center h-11 w-11 rounded-full flex-shrink-0",
        "transition-[transform,background-color] duration-fast ease-out-soft active:scale-[0.92]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});
