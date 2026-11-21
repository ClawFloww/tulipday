"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { IconButton } from "@/components/ui/IconButton";

type Size = "auto" | "half" | "full";

export type BottomSheetProps = {
  open:       boolean;
  onClose:    () => void;
  title?:     React.ReactNode;
  children:   React.ReactNode;
  /** auto = hoogte van de inhoud (max 90%), half = 50%, full = 92%. */
  size?:      Size;
  /** Toont een sluitknop rechts in de kop. */
  showClose?: boolean;
  /** false = geen overlay en geen scroll-lock; wat erachter ligt (bijv. de kaart) blijft bedienbaar. */
  modal?:     boolean;
  className?: string;
};

const HEIGHTS: Record<Size, string> = {
  auto: "max-h-[90dvh]",
  half: "h-[50dvh]",
  full: "h-[92dvh]",
};

// Vegen naar beneden sluit de sheet bij voldoende afstand of snelheid
const DISMISS_OFFSET   = 100;
const DISMISS_VELOCITY = 500;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Grijpgreep bovenaan een sheet. Sleepbaar wanneer onPointerDown is gezet. */
export function SheetHandle({ onPointerDown }: { onPointerDown?: (e: React.PointerEvent) => void }) {
  return (
    <div onPointerDown={onPointerDown} className="flex justify-center pt-2.5 pb-1.5 touch-none cursor-grab active:cursor-grabbing">
      <div className="h-1.5 w-10 rounded-full bg-line-strong" />
    </div>
  );
}

export function BottomSheet({ open, onClose, title, children, size = "auto", showClose = false, modal = true, className = "" }: BottomSheetProps) {
  const { t } = useT();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Pagina erachter niet laten scrollen; focus naar de sheet en terug bij sluiten
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    if (modal) document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (!modal || e.key !== "Tab" || !sheetRef.current) return;
      // Focus binnen de sheet houden
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last  = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, modal]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[70] flex items-end justify-center ${modal ? "" : "pointer-events-none"}`}>
          {modal && (
            <motion.div
              className="absolute inset-0 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              aria-hidden
            />
          )}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal={modal}
            aria-labelledby={title ? titleId : undefined}
            className={[
              "relative w-full max-w-[480px] flex flex-col bg-surface-2 rounded-t-3xl shadow-sheet pb-safe pointer-events-auto",
              HEIGHTS[size],
              className,
            ].join(" ")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
          >
            {/* Alleen greep en kop zijn sleepbaar, zodat scrollen in de inhoud blijft werken */}
            <div onPointerDown={(e) => dragControls.start(e)} className="touch-none flex-shrink-0">
              <SheetHandle />
              {(title || showClose) && (
                <div className="flex items-center gap-3 px-5 pb-2">
                  {title && <h2 id={titleId} className="flex-1 text-headline text-ink">{title}</h2>}
                  {showClose && (
                    <IconButton variant="ghost" aria-label={t("common.close")} onClick={onClose} className="-mr-2 ml-auto">
                      <X size={20} />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
