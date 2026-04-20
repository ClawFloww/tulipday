"use client";

// Geanimeerde bloeikwaliteitsbalk voor een fietsroute

import { motion } from "framer-motion";
import { Flower2 } from "lucide-react";
import { bloomScoreColor, bloomScoreLabel } from "@/lib/bloomRoute";

interface Props {
  score: number;          // 0–1
  fieldsInBloom: number;
  totalFields: number;
  className?: string;
}

export default function RouteBloomScore({
  score,
  fieldsInBloom,
  totalFields,
  className = "",
}: Props) {
  const color = bloomScoreColor(score);
  const label = bloomScoreLabel(score);
  const pct   = Math.round(score * 100);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-semibold text-gray-500">
          <Flower2 size={11} />
          Bloeikwaliteit
        </span>
        <span className="font-extrabold" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Progress-balk */}
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <p className="text-[10px] text-gray-400">
        {fieldsInBloom} van {totalFields} velden in bloei
      </p>
    </div>
  );
}
