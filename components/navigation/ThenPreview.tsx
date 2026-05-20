"use client";

// Dunne preview-strip onder de ManeuverBanner. Toont de volgende manoeuvre
// ("Daarna → rechtsaf op X-straat") of de volgende stop ("Daarna → stop 3:
// Roze tulpenveld") zodat de gebruiker kan anticiperen op snel opeenvolgende
// afslagen of stops.

import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  icon:  ReactNode;
  label: string;
  text:  string;
}

export default function ThenPreview({ icon, label, text }: Props) {
  return (
    <motion.div
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.05, duration: 0.2 }}
      className="ml-3 inline-flex items-center gap-2 rounded-b-xl px-3 py-1.5 shadow-lg"
      style={{ backgroundColor: "rgba(31,41,55,0.92)" }}
    >
      <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
        {label}
      </span>
      <span className="flex items-center justify-center text-white/80">
        {icon}
      </span>
      <span className="text-white text-[12px] font-bold truncate max-w-[180px]">
        {text}
      </span>
    </motion.div>
  );
}
