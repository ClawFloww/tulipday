"use client";

// Bottom-sheet formulier voor horeca/fietsverhuur/attractie/recreatiepark/
// accommodatie. Drie velden: status (open/sluit binnenkort/dicht), drukte
// (enkel bij open) en een optionele opmerking. Submission gaat direct naar
// operational_updates; RLS zorgt dat een partner enkel eigen rijen inserts.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { insertOperationalUpdate } from "@/lib/partner/queries";
import type { CrowdLevel, OperationalStatus } from "@/lib/partner/types";

interface Props {
  partnerLocationId: string;
  userId:            string;
  onDone:            () => void;
}

const STATUS_OPTIONS: { value: OperationalStatus; emoji: string; label: string }[] = [
  { value: "open",         emoji: "🟢", label: "Open" },
  { value: "closing_soon", emoji: "🟡", label: "Sluit binnenkort" },
  { value: "closed",       emoji: "🔴", label: "Gesloten" },
];

const CROWD_OPTIONS: { value: CrowdLevel; emoji: string; label: string }[] = [
  { value: "quiet",  emoji: "😌", label: "Rustig" },
  { value: "normal", emoji: "🙂", label: "Normaal" },
  { value: "busy",   emoji: "😅", label: "Druk" },
  { value: "full",   emoji: "🚫", label: "Vol" },
];

export function OperationalUpdateForm({ partnerLocationId, userId, onDone }: Props) {
  const [status,     setStatus]     = useState<OperationalStatus | null>(null);
  const [crowd,      setCrowd]      = useState<CrowdLevel | null>(null);
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    setSubmitting(true);
    setError(null);
    try {
      await insertOperationalUpdate({
        partnerLocationId,
        status,
        crowdLevel: status === "open" ? crowd : null,
        notes:      notes.trim() || null,
        createdBy:  userId,
      });
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setError(`Kon update niet opslaan: ${msg}`);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-[11px] font-extrabold tracking-wider uppercase mb-2" style={{ color: "var(--color-text-3)" }}>
          Status
        </p>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className="rounded-xl py-3 text-sm font-bold transition-transform active:scale-95"
                style={{
                  backgroundColor: active ? "rgba(232,16,42,0.12)" : "var(--color-surface-3)",
                  color:           active ? "#E8102A" : "var(--color-text)",
                  border:          active ? "1.5px solid #E8102A" : "1.5px solid transparent",
                }}
              >
                <span className="block text-xl mb-1">{opt.emoji}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {status === "open" && (
        <div>
          <p className="text-[11px] font-extrabold tracking-wider uppercase mb-2" style={{ color: "var(--color-text-3)" }}>
            Drukte
          </p>
          <div className="grid grid-cols-4 gap-2">
            {CROWD_OPTIONS.map((opt) => {
              const active = crowd === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCrowd(opt.value)}
                  className="rounded-xl py-3 text-xs font-bold transition-transform active:scale-95"
                  style={{
                    backgroundColor: active ? "rgba(232,16,42,0.12)" : "var(--color-surface-3)",
                    color:           active ? "#E8102A" : "var(--color-text)",
                    border:          active ? "1.5px solid #E8102A" : "1.5px solid transparent",
                  }}
                >
                  <span className="block text-lg mb-1">{opt.emoji}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-extrabold tracking-wider uppercase mb-2" style={{ color: "var(--color-text-3)" }}>
          Korte opmerking (optioneel)
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 100))}
          rows={2}
          placeholder="Bv. 'Drukke happy hour, terras open'"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
          style={{
            backgroundColor: "var(--color-surface-3)",
            color:           "var(--color-text)",
            border:          "1px solid var(--color-border)",
          }}
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: "var(--color-text-3)" }}>
          {notes.length}/100
        </p>
      </div>

      {error && (
        <p className="text-xs font-semibold p-3 rounded-lg"
           style={{ backgroundColor: "rgba(232,16,42,0.08)", color: "#E8102A" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!status || submitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-white text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{
          backgroundColor: "#E8102A",
          boxShadow: "0 4px 14px rgba(232,16,42,0.32)",
        }}
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        Bijwerken
      </button>
    </form>
  );
}
