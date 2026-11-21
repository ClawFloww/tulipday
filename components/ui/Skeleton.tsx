type Variant = "text" | "circle" | "rect" | "card";

export type SkeletonProps = {
  variant?:   Variant;
  className?: string;
  /** Aantal regels bij variant "text". */
  lines?:     number;
};

const BASE = "skeleton-shimmer";

/** Plaatshouder tijdens laden — gebruik in plaats van een spinner voor inhoud. */
export function Skeleton({ variant = "rect", className = "", lines = 1 }: SkeletonProps) {
  if (variant === "text") {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          // Laatste regel korter, zoals echte tekst
          <div key={i} className={`${BASE} h-3.5 rounded-md ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    );
  }
  if (variant === "circle") return <div className={`${BASE} rounded-full ${className}`} aria-hidden />;
  if (variant === "card") {
    return (
      <div className={`bg-surface-2 rounded-2xl border border-line overflow-hidden ${className}`} aria-hidden>
        <div className={`${BASE} h-36 w-full`} />
        <div className="p-4 space-y-2">
          <div className={`${BASE} h-4 w-3/4 rounded-md`} />
          <div className={`${BASE} h-3 w-1/2 rounded-md`} />
        </div>
      </div>
    );
  }
  return <div className={`${BASE} rounded-xl ${className}`} aria-hidden />;
}
