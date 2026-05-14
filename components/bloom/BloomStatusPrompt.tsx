"use client";

// Bottom sheet waarmee gebruikers de bloei-status van een veld melden

import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";
import type { TulipField, BloomStatusType } from "@/lib/tulipFields";
import { STATUS_CONFIG } from "@/lib/tulipFields";
import { useT } from "@/lib/i18n-context";

interface Props {
  field: TulipField;
  isOpen: boolean;
  onSelect: (status: BloomStatusType) => void;
  onDismiss: () => void;
  onNotificationSettings: () => void;
}

const OPTION_DEFS: { status: BloomStatusType; descKey: string }[] = [
  { status: "in_bloom",  descKey: "bloom_prompt.desc_in_bloom" },
  { status: "fading",    descKey: "bloom_prompt.desc_fading" },
  { status: "finished",  descKey: "bloom_prompt.desc_finished" },
];

export default function BloomStatusPrompt({
  field,
  isOpen,
  onSelect,
  onDismiss,
  onNotificationSettings,
}: Props) {
  const { t } = useT();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label={t("bloom_prompt.aria_label")}
          >
            {/* Handvat */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" aria-hidden="true" />
            </div>

            <div className="px-5 pb-8 pt-2">
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 pr-3">
                  <p className="text-xs font-semibold uppercase tracking-wide"
                     style={{ color: "#E8527A" }}>
                    {t("bloom_prompt.header_label")}
                  </p>
                  <h2 className="text-lg font-extrabold text-gray-900 leading-tight mt-0.5">
                    {field.name}
                  </h2>
                </div>
                <button
                  onClick={onDismiss}
                  aria-label={t("common.close")}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100
                             hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-5">
                {t("bloom_prompt.question")}
              </p>

              {/* Status kaarten */}
              <div className="space-y-3 mb-6">
                {OPTION_DEFS.map(({ status, descKey }) => {
                  const cfg = STATUS_CONFIG[status];
                  const description = t(descKey);
                  return (
                    <motion.button
                      key={status}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSelect(status)}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2
                                 text-left transition-colors active:opacity-80"
                      style={{
                        backgroundColor: cfg.bg,
                        borderColor: cfg.border,
                        minHeight: 64,
                      }}
                    >
                      <span className="text-3xl flex-shrink-0" role="img" aria-label={cfg.label}>
                        {cfg.emoji}
                      </span>
                      <div>
                        <p className="font-bold text-base leading-tight" style={{ color: cfg.text }}>
                          {cfg.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: cfg.text, opacity: 0.7 }}>
                          {description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer acties */}
              <div className="flex items-center justify-between">
                <button
                  onClick={onDismiss}
                  className="text-sm font-semibold text-gray-400 hover:text-gray-600
                             transition-colors py-2 px-1"
                >
                  {t("bloom_prompt.not_now")}
                </button>
                <button
                  onClick={onNotificationSettings}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-400
                             hover:text-gray-600 transition-colors py-2 px-1"
                >
                  <Bell size={14} />
                  {t("bloom_prompt.notifications")}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
