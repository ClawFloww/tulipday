"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";

const TOUR_KEY = "tulipday_feature_tour_v1";

interface Step {
  selector: string;
  title: string;
  body: string;
  position: "above" | "below";
}

const STEPS: Step[] = [
  {
    selector: "[data-tour='nav-fields']",
    title: "🌷 Startpagina",
    body: "Hier vind je aanbevolen bollenvelden, routes en het actuele weer op één plek.",
    position: "above",
  },
  {
    selector: "[data-tour='nav-map']",
    title: "🗺️ Kaart",
    body: "Bekijk alle locaties op de kaart. Gekleurde stippen tonen de bloei-status. Bij horeca zie je groen (open) of rood (gesloten).",
    position: "above",
  },
  {
    selector: "[data-tour='nav-routes']",
    title: "🚴 Routes",
    body: "Kies een kant-en-klare route of teken zelf een route op de kaart. Deel hem daarna via een link.",
    position: "above",
  },
  {
    selector: "[data-tour='nav-weather']",
    title: "⛅ Weer",
    body: "Bekijk het actuele weer en de verwachting voor de komende dagen in de Bollenstreek.",
    position: "above",
  },
  {
    selector: "[data-tour='nav-profile']",
    title: "❤️ Opgeslagen & Instellingen",
    body: "Sla je favoriete locaties en routes op. Pas taal en andere voorkeuren aan via Instellingen.",
    position: "above",
  },
];

interface Rect { top: number; left: number; width: number; height: number; }

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function AppTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect]   = useState<Rect | null>(null);

  const updateRect = useCallback(() => {
    setRect(getRect(STEPS[index].selector));
  }, [index]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [updateRect]);

  function next() {
    if (index < STEPS.length - 1) setIndex((i) => i + 1);
    else finish();
  }

  function finish() {
    localStorage.setItem(TOUR_KEY, "1");
    onDone();
  }

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const PAD = 6;

  // Spotlight box
  const spotlight = rect
    ? {
        left:   rect.left  - PAD,
        top:    rect.top   - PAD,
        width:  rect.width  + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Tooltip positie: boven of onder het spotlight
  const tooltipTop = spotlight
    ? step.position === "above"
      ? spotlight.top - 8   // tooltip bottom → just above spotlight
      : spotlight.top + spotlight.height + 8
    : window.innerHeight / 2;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Donker overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={finish} />

      {/* Spotlight cutout */}
      {spotlight && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            left:      spotlight.left,
            top:       spotlight.top,
            width:     spotlight.width,
            height:    spotlight.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
            zIndex:    1,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: step.position === "above" ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{    opacity: 0, y: step.position === "above" ? 8 : -8 }}
          transition={{ duration: 0.2 }}
          className="absolute left-4 right-4 pointer-events-auto"
          style={{
            bottom: step.position === "above" ? `calc(100vh - ${tooltipTop}px)` : undefined,
            top:    step.position === "below" ? tooltipTop : undefined,
            zIndex: 2,
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 className="text-base font-extrabold text-gray-900 leading-tight">{step.title}</h2>
              <button onClick={finish} className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{step.body}</p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width:           i === index ? 16 : 6,
                      backgroundColor: i === index ? "#E8102A" : "#e5e7eb",
                    }}
                  />
                ))}
              </div>

              {/* Knop */}
              <button
                onClick={next}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#E8102A" }}
              >
                {isLast ? "Klaar!" : "Volgende"}
                {!isLast && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
