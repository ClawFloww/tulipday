"use client";

// Strook onder de instructiebanner: de afslag die er vlak achteraan komt
// ("Daarna ↰ Stationsweg"), zodat je op snel opeenvolgende afslagen kunt anticiperen.

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
      className="ml-3 inline-flex items-center gap-2 rounded-b-xl bg-primary-dark px-3 py-1.5 text-on-primary shadow-md"
    >
      <span className="text-caption opacity-75">{label}</span>
      <span className="flex items-center justify-center">{icon}</span>
      <span className="max-w-[180px] truncate text-label">{text}</span>
    </motion.div>
  );
}
