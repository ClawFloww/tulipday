"use client";

import { Button } from "@/components/ui/Button";

export type EmptyStateProps = {
  /** Lucide-icoon, bijv. <Heart size={28} />. */
  icon:          React.ReactNode;
  title:         string;
  description?:  string;
  actionLabel?:  string;
  onAction?:     () => void;
  /** Foutstaat: icoon in waarschuwingskleur en rol "alert". */
  tone?:         "neutral" | "error";
  className?:    string;
};

/** Lege lijst, geen zoekresultaten, laden mislukt of offline. */
export function EmptyState({ icon, title, description, actionLabel, onAction, tone = "neutral", className = "" }: EmptyStateProps) {
  return (
    <div role={tone === "error" ? "alert" : undefined}
         className={`flex flex-col items-center text-center px-8 py-12 ${className}`}>
      <div className={[
        "h-16 w-16 rounded-full flex items-center justify-center mb-4",
        tone === "error" ? "bg-surface-3 text-warning" : "bg-primary-subtle text-primary",
      ].join(" ")}>
        {icon}
      </div>
      <h3 className="text-headline text-ink mb-1.5">{title}</h3>
      {description && <p className="text-body text-ink-2 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <Button variant={tone === "error" ? "secondary" : "primary"} onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
