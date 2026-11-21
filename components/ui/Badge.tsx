type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

// Tekstkleur per toon; de achtergrond is dezelfde kleur op lage dekking
const TONES: Record<Tone, { text: string; bg: string }> = {
  neutral: { text: "text-ink-2",   bg: "bg-ink-3"   },
  primary: { text: "text-primary", bg: "bg-primary" },
  success: { text: "text-success", bg: "bg-success" },
  warning: { text: "text-warning", bg: "bg-warning" },
  danger:  { text: "text-danger",  bg: "bg-danger"  },
  info:    { text: "text-info",    bg: "bg-info"    },
};

export type BadgeProps = {
  children:   React.ReactNode;
  tone?:      Tone;
  icon?:      React.ReactNode;
  className?: string;
};

/** Statisch label (niet klikbaar). Werkt in licht en donker zonder extra kleuren. */
export function Badge({ children, tone = "neutral", icon, className = "" }: BadgeProps) {
  const { text, bg } = TONES[tone];
  return (
    <span className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold ${text} ${className}`}>
      {/* CSS-var-kleuren ondersteunen geen /opacity-modifier; vandaar een aparte laag */}
      <span aria-hidden className={`absolute inset-0 rounded-full opacity-[0.14] ${bg}`} />
      {icon && <span className="relative">{icon}</span>}
      <span className="relative">{children}</span>
    </span>
  );
}
