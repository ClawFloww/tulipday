"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

const TOUR_KEY = "tulipday_feature_tour_v1";

interface Step {
  selector: string;
  title: string;
  body: string;
  position: "above" | "below";
}

const STEP_DEFS: { selector: string; titleKey: string; bodyKey: string; position: "above" | "below" }[] = [
  { selector: "[data-tour='nav-fields']",  titleKey: "tour.step1_title", bodyKey: "tour.step1_body", position: "above" },
  { selector: "[data-tour='nav-map']",     titleKey: "tour.step2_title", bodyKey: "tour.step2_body", position: "above" },
  { selector: "[data-tour='nav-routes']",  titleKey: "tour.step3_title", bodyKey: "tour.step3_body", position: "above" },
  { selector: "[data-tour='nav-saved']",   titleKey: "tour.step4_title", bodyKey: "tour.step4_body", position: "above" },
  { selector: "[data-tour='nav-profile']", titleKey: "tour.step5_title", bodyKey: "tour.step5_body", position: "above" },
];

interface Rect { top: number; left: number; width: number; height: number; }

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function AppTour({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const STEPS: Step[] = STEP_DEFS.map(s => ({
    selector: s.selector,
    title:    t(s.titleKey),
    body:     t(s.bodyKey),
    position: s.position,
  }));
  const [index, setIndex] = useState(0);
  const [rect, setRect]   = useState<Rect | null>(null);

  const updateRect = useCallback(() => {
    setRect(getRect(STEP_DEFS[index].selector));
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
          <div className="rounded-2xl border border-line bg-surface-2 p-4 shadow-lg">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 className="text-headline leading-tight text-ink">{step.title}</h2>
              <IconButton variant="ghost" aria-label={t("common.close")} onClick={finish} className="-mr-2 -mt-2">
                <X size={16} />
              </IconButton>
            </div>

            {/* Body */}
            <p className="mb-4 text-body leading-relaxed text-ink-2">{step.body}</p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    aria-hidden
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-4 bg-primary" : "w-1.5 bg-line-strong"}`}
                  />
                ))}
              </div>

              {/* Knop */}
              <Button size="sm" onClick={next}>
                {isLast ? t("tour.done") : t("common.next")}
                {!isLast && <ChevronRight size={14} aria-hidden />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
