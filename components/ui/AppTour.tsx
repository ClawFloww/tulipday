"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const TOUR_KEY = "tulipday_feature_tour_v1";

const SLIDES = [
  {
    emoji: "🌷",
    bg: "from-pink-50 to-rose-100",
    accent: "#E8102A",
    title: "Welkom bij TulipDay",
    body: "Ontdek de mooiste bollenvelden, horeca en attracties in de Bollenstreek. We leggen je even alles uit.",
  },
  {
    emoji: "🗺️",
    bg: "from-sky-50 to-blue-100",
    accent: "#0ea5e9",
    title: "Interactieve kaart",
    body: "Bekijk alle locaties op de kaart. Tik op een pin voor details, foto's en openingstijden.",
  },
  {
    emoji: "🌸",
    bg: "from-green-50 to-emerald-100",
    accent: "#15803d",
    title: "Bloei-status",
    body: "Gekleurde stippen tonen de actuele bloei:\n🟢 Donkergroen = piek  🟩 Groen = bloeiend\n🩶 Lichtgroen = vroeg  🔴 Rood = eindfase",
  },
  {
    emoji: "☕",
    bg: "from-amber-50 to-orange-100",
    accent: "#d97706",
    title: "Horeca open/gesloten",
    body: "Bij eetgelegenheden zie je een groene stip als ze nu open zijn, en een rode stip als ze gesloten zijn. Altijd up-to-date.",
  },
  {
    emoji: "🚴",
    bg: "from-violet-50 to-purple-100",
    accent: "#7c3aed",
    title: "Routes",
    body: "Kies een kant-en-klare route of teken je eigen route op de kaart. Deel hem daarna met vrienden via een link.",
  },
  {
    emoji: "❤️",
    bg: "from-rose-50 to-pink-100",
    accent: "#E8102A",
    title: "Bewaar je favorieten",
    body: "Sla locaties en routes op via het hart-icoon. Alles is terug te vinden onder 'Opgeslagen' in het menu.",
  },
];

export function AppTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);

  function next() {
    if (index < SLIDES.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
    }
  }

  function finish() {
    localStorage.setItem(TOUR_KEY, "1");
    onDone();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) next();
    else if (dx > 50) prev();
    touchStartX.current = null;
  }

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          initial={{ x: direction * 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction * -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`absolute inset-0 bg-gradient-to-b ${slide.bg} flex flex-col`}
        >
          {/* Overslaan knop */}
          <div className="flex justify-end px-5 pt-12">
            <button
              onClick={finish}
              className="flex items-center gap-1 text-sm text-gray-400 font-medium"
            >
              <X size={15} />
              Overslaan
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
            <div className="text-8xl leading-none select-none">{slide.emoji}</div>
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-gray-900">{slide.title}</h1>
              <p className="text-gray-600 text-[15px] leading-relaxed whitespace-pre-line">
                {slide.body}
              </p>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 pb-6">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 20 : 8,
                  backgroundColor: i === index ? slide.accent : "#d1d5db",
                }}
              />
            ))}
          </div>

          {/* Knop */}
          <div className="px-6 pb-12">
            <button
              onClick={next}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-base shadow-md active:scale-95 transition-transform"
              style={{ backgroundColor: slide.accent }}
            >
              {isLast ? "Begin! 🌷" : "Volgende"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function useShouldShowTour() {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(TOUR_KEY);
}
