"use client";

// Toast/snackbar die verschijnt na een succesvolle bloei-status bijdrage

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface Props {
  travelersHelped: number;
  isVisible: boolean;
  onDismiss: () => void;
  /** Auto-dismiss na N milliseconden (standaard 3500) */
  autoDismissMs?: number;
}

export default function ContributorReward({
  travelersHelped,
  isVisible,
  onDismiss,
  autoDismissMs = 3500,
}: Props) {
  // Auto-dismiss timer
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [isVisible, autoDismissMs, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2"
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.92 }}
          transition={{ type: "spring", damping: 22, stiffness: 340 }}
          role="status"
          aria-live="polite"
          aria-label={`Je hielp ${travelersHelped} reizigers vandaag`}
        >
          <button
            onClick={onDismiss}
            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl
                       text-white text-sm font-bold whitespace-nowrap"
            style={{ backgroundColor: "#E8527A" }}
          >
            <Heart size={18} fill="white" className="flex-shrink-0 animate-pulse" />
            <span>
              Je hielp{" "}
              <strong className="font-extrabold">{travelersHelped}</strong>{" "}
              reizigers vandaag 🌷
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
