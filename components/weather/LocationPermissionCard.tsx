"use client";

// Eenmalige vraag om de locatie te gebruiken voor het weer (boven de WeatherCard).

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { Button } from "@/components/ui/Button";

interface Props {
  onGrant:   () => void;
  onDecline: () => void;
}

export default function LocationPermissionCard({ onGrant, onDecline }: Props) {
  const { t } = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className="mx-4 mb-3 overflow-hidden rounded-2xl bg-surface-2 shadow-card"
    >
      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-subtle">
          <MapPin size={18} className="text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-headline leading-tight text-ink">{t("weather.permission_title")}</p>
          <p className="mb-3 text-caption leading-snug text-ink-2">{t("weather.permission_body")}</p>
          <div className="flex gap-2">
            <Button size="sm" fullWidth onClick={onGrant}>{t("weather.permission_allow")}</Button>
            <Button size="sm" fullWidth variant="secondary" onClick={onDecline}>{t("weather.permission_decline")}</Button>
          </div>
        </div>
      </div>
      <p className="px-4 pb-3 text-center text-caption leading-snug text-ink-3">{t("weather.permission_privacy")}</p>
    </motion.div>
  );
}
