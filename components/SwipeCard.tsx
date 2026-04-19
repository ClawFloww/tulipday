"use client";

import { useRef, useState, useCallback } from "react";
import { getBloomLabel, getBloomColor, getDaysLabel } from "@/lib/bloomStatus";
import type { FieldData } from "@/lib/bloomStatus";

export type { FieldData };

interface SwipeCardProps {
  field: FieldData;
  onSwipeRight: (id: string) => void;
  onSwipeLeft:  (id: string) => void;
  onSave:       (id: string) => void;
  isTop:        boolean;
}

const SWIPE_THRESHOLD  = 80;
const OVERLAY_START    = 40;
const MAX_ROTATE_DEG   = 20;
const FLY_DURATION_MS  = 380;

export function SwipeCard({ field, onSwipeRight, onSwipeLeft, onSave, isTop }: SwipeCardProps) {
  const [dx,      setDx]      = useState(0);
  const [dy,      setDy]      = useState(0);
  const [active,  setActive]  = useState(false);
  const [flyOut,  setFlyOut]  = useState<"left" | "right" | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);

  const colors     = getBloomColor(field.bloomStatus);
  const statusLabel = getBloomLabel(field.bloomStatus);
  const daysLabel   = getDaysLabel(field.daysRemaining);

  /* ── overlay opacities ─────────────────────────────────────── */
  const visitOpacity = dx > OVERLAY_START
    ? Math.min((dx - OVERLAY_START) / (SWIPE_THRESHOLD - OVERLAY_START), 1)
    : 0;
  const skipOpacity  = dx < -OVERLAY_START
    ? Math.min((-dx - OVERLAY_START) / (SWIPE_THRESHOLD - OVERLAY_START), 1)
    : 0;

  /* ── fly-out helper ─────────────────────────────────────────── */
  const triggerSwipe = useCallback((dir: "left" | "right") => {
    setFlyOut(dir);
    setTimeout(() => {
      if (dir === "right") onSwipeRight(field.id);
      else                 onSwipeLeft(field.id);
    }, FLY_DURATION_MS);
  }, [field.id, onSwipeRight, onSwipeLeft]);

  /* ── pointer handlers ───────────────────────────────────────── */
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isTop || flyOut) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startY.current = e.clientY;
    setActive(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!active || !isTop) return;
    setDx(e.clientX - startX.current);
    setDy(e.clientY - startY.current);
  }

  function onPointerUp() {
    if (!isTop) return;
    setActive(false);
    if (dx > SWIPE_THRESHOLD)       triggerSwipe("right");
    else if (dx < -SWIPE_THRESHOLD) triggerSwipe("left");
    else { setDx(0); setDy(0); }
  }

  /* ── computed transform ─────────────────────────────────────── */
  const rotation = (dx / 320) * MAX_ROTATE_DEG;

  const transform = flyOut
    ? `translateX(${flyOut === "right" ? "165%" : "-165%"}) rotate(${flyOut === "right" ? 18 : -18}deg)`
    : active
    ? `translateX(${dx}px) translateY(${dy * 0.25}px) rotate(${rotation}deg)`
    : undefined;

  const transition = active
    ? "none"
    : flyOut
    ? `transform ${FLY_DURATION_MS}ms cubic-bezier(.5,.2,.8,.8), opacity ${FLY_DURATION_MS}ms ease`
    : "transform 280ms cubic-bezier(.25,.46,.45,.94)";

  return (
    <div
      style={{
        transform,
        transition,
        opacity: flyOut ? 0 : 1,
        touchAction: "none",
        willChange: "transform",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="w-full select-none"
    >
      <div
        className="rounded-3xl overflow-hidden bg-white"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
      >
        {/* ── Image area ──────────────────────────────────────── */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{ height: 220, backgroundColor: field.imageBgColor }}
        >
          {field.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={field.imageUrl}
              alt={field.name}
              className="w-full h-full object-cover"
              style={{ userSelect: "none", pointerEvents: "none" }}
            />
          ) : (
            <span
              role="img"
              aria-label={field.name}
              style={{ fontSize: 72, lineHeight: 1, userSelect: "none" }}
            >
              {field.imageEmoji}
            </span>
          )}

          {/* BEZOEKEN overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: visitOpacity, backgroundColor: "rgba(99,153,34,0.2)" }}
          >
            <span
              className="font-extrabold text-2xl px-4 py-2 rounded-xl"
              style={{
                border: "3px solid #639922",
                color: "#27500A",
                backgroundColor: "rgba(255,255,255,0.88)",
                transform: "rotate(-14deg)",
              }}
            >
              BEZOEKEN ✓
            </span>
          </div>

          {/* SLAAN overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: skipOpacity, backgroundColor: "rgba(226,75,74,0.2)" }}
          >
            <span
              className="font-extrabold text-2xl px-4 py-2 rounded-xl"
              style={{
                border: "3px solid #E24B4A",
                color: "#791F1F",
                backgroundColor: "rgba(255,255,255,0.88)",
                transform: "rotate(14deg)",
              }}
            >
              SLAAN ✗
            </span>
          </div>

          {/* Distance pill — top left */}
          <div className="absolute top-3 left-3 pointer-events-none">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.42)", backdropFilter: "blur(4px)" }}
            >
              📍 {field.distanceKm} km
            </span>
          </div>

          {/* Bloom status pill — top right */}
          <div className="absolute top-3 right-3 pointer-events-none">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors.dot }}
              />
              {statusLabel}
            </span>
          </div>
        </div>

        {/* ── Card info ───────────────────────────────────────── */}
        <div style={{ padding: "14px 16px 0" }} className="space-y-2">
          <h2
            className="font-bold leading-tight text-[#1A1A1A]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20 }}
          >
            {field.name}
          </h2>

          <p className="text-gray-500" style={{ fontSize: 13 }}>
            {field.location} · {field.flowerTypes.join(", ")}
          </p>

          {field.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {field.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-gray-500 bg-gray-100 border border-gray-200"
                  style={{ fontSize: 11, borderRadius: 999, padding: "2px 10px" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-1 pb-1">
            <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height: 4 }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${field.bloomPercent}%`,
                  backgroundColor: colors.bar,
                  transition: "width 400ms ease",
                }}
              />
            </div>
            <p className="text-gray-400" style={{ fontSize: 11 }}>
              {field.bloomPercent}% bloeikracht · {daysLabel}
            </p>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────── */}
        <div className="flex items-center justify-center gap-5 px-4 py-4">
          {/* ✕ Skip */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { if (isTop && !flyOut) triggerSwipe("left"); }}
            className="flex items-center justify-center rounded-full bg-white transition-transform hover:scale-105 active:scale-95"
            style={{
              width: 56, height: 56,
              border: "2px solid #E24B4A",
              boxShadow: "0 2px 12px rgba(226,75,74,0.2)",
            }}
            aria-label="Overslaan"
          >
            <span style={{ color: "#E24B4A", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>✕</span>
          </button>

          {/* ♥ Save */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSave(field.id)}
            className="flex items-center justify-center rounded-full bg-white transition-transform hover:scale-105 active:scale-95"
            style={{
              width: 48, height: 48,
              border: "2px solid #F472B6",
              boxShadow: "0 2px 10px rgba(244,114,182,0.2)",
            }}
            aria-label="Opslaan"
          >
            <span style={{ color: "#F472B6", fontSize: 20, lineHeight: 1 }}>♥</span>
          </button>

          {/* 📍 Visit */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { if (isTop && !flyOut) triggerSwipe("right"); }}
            className="flex items-center justify-center rounded-full bg-white transition-transform hover:scale-105 active:scale-95"
            style={{
              width: 56, height: 56,
              border: "2px solid #639922",
              boxShadow: "0 2px 12px rgba(99,153,34,0.2)",
            }}
            aria-label="Bezoeken"
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>📍</span>
          </button>
        </div>
      </div>
    </div>
  );
}
