"use client";

type Padding = "none" | "sm" | "md" | "lg";

const PADDINGS: Record<Padding, string> = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-5",
};

export type CardProps = {
  children:   React.ReactNode;
  padding?:   Padding;
  className?: string;
  /** Maakt de kaart klikbaar (als knop, met tikfeedback). */
  onClick?:   () => void;
  "aria-label"?: string;
};

const BASE = "bg-surface-2 rounded-2xl shadow-card border border-line overflow-hidden";

export function Card({ children, padding = "md", className = "", onClick, ...rest }: CardProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          BASE, PADDINGS[padding], "w-full text-left block",
          "transition-[transform,box-shadow] duration-fast ease-out-soft active:scale-[0.98] hover:shadow-card-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </button>
    );
  }
  return <div className={[BASE, PADDINGS[padding], className].join(" ")} {...rest}>{children}</div>;
}
