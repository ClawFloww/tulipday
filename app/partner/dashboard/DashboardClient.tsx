"use client";

// Volledig dashboard: begroeting, huidige status, update-knop met bottom
// sheet (BloomUpdateForm voor bollenveld, OperationalUpdateForm voor de
// rest). Na een succesvolle insert herladen we de huidige-status-view
// en tonen we een toast.

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X } from "lucide-react";
import toast from "react-hot-toast";

import { PartnerHeader } from "@/components/partner/PartnerHeader";
import { StatusBadge } from "@/components/partner/StatusBadge";
import { OperationalUpdateForm } from "@/components/partner/OperationalUpdateForm";
import { BloomUpdateForm } from "@/components/partner/BloomUpdateForm";

import {
  getCurrentBloomStatus,
  getCurrentOperationalStatus,
} from "@/lib/partner/queries";
import type {
  CurrentBloomStatus,
  CurrentOperationalStatus,
  PartnerSession,
} from "@/lib/partner/types";

const CATEGORY_LABEL: Record<string, string> = {
  horeca:        "Horeca",
  fietsverhuur:  "Fietsverhuur",
  attractie:     "Attractie",
  recreatiepark: "Recreatiepark",
  accommodatie:  "Accommodatie",
  bollenveld:    "Bollenveld",
  evenement:     "Evenement",
};

interface Props {
  session: PartnerSession;
}

export function DashboardClient({ session }: Props) {
  const loc = session.partnerLocations[0];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [op,    setOp]    = useState<CurrentOperationalStatus | null>(null);
  const [bloom, setBloom] = useState<CurrentBloomStatus | null>(null);

  const isBloom = loc?.category === "bollenveld";

  const refresh = useCallback(async () => {
    if (!loc) return;
    if (isBloom) {
      setBloom(await getCurrentBloomStatus(loc.location_id));
    } else {
      setOp(await getCurrentOperationalStatus(loc.id));
    }
  }, [loc, isBloom]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!loc) {
    return (
      <div className="min-h-screen">
        <PartnerHeader />
        <main className="px-4 py-10 max-w-md mx-auto text-center">
          <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
            Geen gekoppelde locatie gevonden. Neem contact op via{" "}
            <a href="mailto:info@tulipday.online" className="text-tulip-500 font-bold">
              info@tulipday.online
            </a>.
          </p>
        </main>
      </div>
    );
  }

  function handleUpdated() {
    setSheetOpen(false);
    toast.success("Status bijgewerkt ✓");
    refresh();
  }

  return (
    <div className="min-h-screen">
      <PartnerHeader />
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Begroeting */}
        <p className="text-xl font-extrabold mb-1" style={{ color: "var(--color-text)" }}>
          👋 Hallo, {session.partner.name}
        </p>
        {loc.location && (
          <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
            📍 {loc.location.title}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
          🏷️ {CATEGORY_LABEL[loc.category] ?? loc.category}
        </p>

        {/* Huidige status */}
        <div className="mt-6">
          <StatusBadge
            mode={isBloom ? "bloom" : "operational"}
            op={op}
            bloom={bloom}
          />
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="w-full mt-5 flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-white text-base active:scale-[0.98] transition-transform"
          style={{
            backgroundColor: "#E8102A",
            boxShadow: "0 6px 18px rgba(232,16,42,0.32)",
          }}
        >
          <Pencil size={16} />
          Status bijwerken
        </button>
      </main>

      {/* Bottom sheet met update-form */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSheetOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl shadow-2xl"
              style={{
                backgroundColor: "var(--color-surface)",
                paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
              }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <p className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
                  {isBloom ? "Bloeistatus bijwerken" : "Status bijwerken"}
                </p>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}
                  aria-label="Sluiten"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 pb-5 pt-2">
                {isBloom ? (
                  <BloomUpdateForm
                    partnerLocationId={loc.id}
                    locationId={loc.location_id}
                    userId={session.userId}
                    onDone={handleUpdated}
                  />
                ) : (
                  <OperationalUpdateForm
                    partnerLocationId={loc.id}
                    userId={session.userId}
                    onDone={handleUpdated}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
