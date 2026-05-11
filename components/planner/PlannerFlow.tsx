"use client";

// 5-stappen plannerflow — animateert door vragen heen
// Slaat profiel op in localStorage en redirect naar /plan/results

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserRound, Baby, Smile, Clock, Bike, Car, Footprints, Flower2, Camera, Landmark, UtensilsCrossed, Trees, Gauge, ChevronRight } from "lucide-react";
import { PLANNER_PROFILE_KEY } from "@/lib/planner/types";
import type { GroupType, TimeBudget, Transport, Vibe, Pace, PlannerProfile } from "@/lib/planner/types";

// ── Stap-definitie ────────────────────────────────────────────────────────────

interface Option<T> {
  value: T;
  label: string;
  sub?:  string;
  icon:  React.ReactNode;
}

const GROUP_OPTIONS: Option<GroupType>[] = [
  { value: "solo",    label: "Solo",      sub: "Alleen op pad",        icon: <UserRound size={26} /> },
  { value: "couple",  label: "Stel",      sub: "Romantisch uitje",     icon: <Smile     size={26} /> },
  { value: "family",  label: "Familie",   sub: "Met kinderen",         icon: <Baby      size={26} /> },
  { value: "friends", label: "Vrienden",  sub: "Groepsuitje",          icon: <Users     size={26} /> },
];

const TIME_OPTIONS: Option<TimeBudget>[] = [
  { value: "2h",   label: "~2 uur",      sub: "Snel de hoogtepunten",       icon: <Clock size={26} /> },
  { value: "half", label: "Halve dag",   sub: "Rustige ochtend of middag",  icon: <Clock size={26} /> },
  { value: "full", label: "Hele dag",    sub: "Alles meepakken",            icon: <Clock size={26} /> },
];

const TRANSPORT_OPTIONS: Option<Transport>[] = [
  { value: "walking", label: "Te voet",  sub: "Rustig wandelen",     icon: <Footprints size={26} /> },
  { value: "cycling", label: "Fiets",    sub: "Fietsen door de velden", icon: <Bike    size={26} /> },
  { value: "car",     label: "Auto",     sub: "Rijden tussen locaties", icon: <Car     size={26} /> },
];

const VIBE_OPTIONS: Option<Vibe>[] = [
  { value: "bloemen",    label: "Bloemen",      sub: "Kleurrijke bollenvelden",    icon: <Flower2          size={24} /> },
  { value: "fotografie", label: "Fotografie",   sub: "Perfecte plaatjes schieten", icon: <Camera           size={24} /> },
  { value: "cultuur",    label: "Cultuur",      sub: "Bezienswaardigheden",        icon: <Landmark         size={24} /> },
  { value: "eten",       label: "Eten & drinken", sub: "Lekker lunchen of dineren", icon: <UtensilsCrossed size={24} /> },
  { value: "natuur",     label: "Natuur",       sub: "Buiten in het groen",        icon: <Trees            size={24} /> },
];

const PACE_OPTIONS: Option<Pace>[] = [
  { value: "relaxed", label: "Rustig",  sub: "Echt ontspannen",       icon: <Gauge size={26} /> },
  { value: "normal",  label: "Normaal", sub: "Goede balans",           icon: <Gauge size={26} /> },
  { value: "active",  label: "Actief",  sub: "Zoveel mogelijk zien",   icon: <Gauge size={26} /> },
];

// ── Animate-varianten ────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

// ── Herbruikbare stap-layout ──────────────────────────────────────────────────

function StepCard<T>({
  title,
  sub,
  options,
  selected,
  multi,
  onSelect,
  onNext,
  onBack,
  step,
  total,
  nextLabel = "Volgende",
  nextDisabled,
}: {
  title:        string;
  sub?:         string;
  options:      Option<T>[];
  selected:     T | T[];
  multi?:       boolean;
  onSelect:     (v: T) => void;
  onNext:       () => void;
  onBack?:      () => void;
  step:         number;
  total:        number;
  nextLabel?:   string;
  nextDisabled?: boolean;
}) {
  function isSelected(v: T): boolean {
    return multi
      ? (selected as T[]).includes(v)
      : selected === v;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              flex:            i === step ? 2 : 1,
              backgroundColor: i <= step ? "var(--color-primary)" : "var(--color-border)",
            }}
          />
        ))}
      </div>

      {/* Vraag */}
      <div className="mb-6">
        <h2 className="text-xl font-bold leading-snug" style={{ color: "var(--color-text)" }}>
          {title}
        </h2>
        {sub && (
          <p className="text-sm mt-1" style={{ color: "var(--color-text-3)" }}>
            {sub}
          </p>
        )}
      </div>

      {/* Opties */}
      <div className={`flex flex-col gap-2.5 flex-1 overflow-y-auto pb-2 ${multi ? "" : ""}`}>
        {options.map((opt) => {
          const active = isSelected(opt.value);
          return (
            <button
              key={String(opt.value)}
              onClick={() => onSelect(opt.value)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                backgroundColor: active ? "var(--color-primary)" : "var(--color-surface-2)",
                border:          `2px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                color:           active ? "#fff" : "var(--color-text)",
              }}
            >
              <span style={{ opacity: active ? 1 : 0.6 }}>{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{opt.label}</p>
                {opt.sub && (
                  <p className="text-xs mt-0.5" style={{ color: active ? "rgba(255,255,255,0.8)" : "var(--color-text-3)" }}>
                    {opt.sub}
                  </p>
                )}
              </div>
              {active && !multi && (
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
              )}
              {active && multi && (
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigatie */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1.5px solid var(--color-border)" }}
          >
            Terug
          </button>
        )}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {nextLabel}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────────────

export default function PlannerFlow() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [step,      setStep]      = useState(0);
  const [direction, setDirection] = useState(1);

  // Antwoorden
  const [group,     setGroup]     = useState<GroupType | null>(null);
  const [time,      setTime]      = useState<TimeBudget | null>(null);
  const [transport, setTransport] = useState<Transport | null>(null);
  const [vibes,     setVibes]     = useState<Vibe[]>([]);
  const [pace,      setPace]      = useState<Pace | null>(null);

  const TOTAL = 5;

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }
  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function toggleVibe(v: Vibe) {
    setVibes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function finish() {
    const profile: PlannerProfile = {
      group:     group!,
      time:      time!,
      transport: transport!,
      vibes,
      pace:      pace!,
    };
    localStorage.setItem(PLANNER_PROFILE_KEY, JSON.stringify(profile));
    router.push(`/${locale}/plan/results`);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-4" style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--color-primary)" }}>
          Jouw dagroute
        </p>
        <h1 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
          Plan de perfecte tulpendag
        </h1>
      </div>

      {/* Stappen */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute inset-0 px-5 pt-6 pb-20 flex flex-col"
          >
            {step === 0 && (
              <StepCard
                title="Met wie ga je op pad?"
                options={GROUP_OPTIONS}
                selected={group ?? ("" as GroupType)}
                onSelect={(v) => { setGroup(v); goNext(); }}
                onNext={goNext}
                step={step}
                total={TOTAL}
                nextDisabled={!group}
              />
            )}
            {step === 1 && (
              <StepCard
                title="Hoeveel tijd heb je?"
                options={TIME_OPTIONS}
                selected={time ?? ("" as TimeBudget)}
                onSelect={(v) => { setTime(v); goNext(); }}
                onNext={goNext}
                onBack={goBack}
                step={step}
                total={TOTAL}
                nextDisabled={!time}
              />
            )}
            {step === 2 && (
              <StepCard
                title="Hoe verplaats je je?"
                options={TRANSPORT_OPTIONS}
                selected={transport ?? ("" as Transport)}
                onSelect={(v) => { setTransport(v); goNext(); }}
                onNext={goNext}
                onBack={goBack}
                step={step}
                total={TOTAL}
                nextDisabled={!transport}
              />
            )}
            {step === 3 && (
              <StepCard
                title="Wat past bij jou?"
                sub="Kies één of meerdere onderwerpen"
                options={VIBE_OPTIONS}
                selected={vibes}
                multi
                onSelect={toggleVibe}
                onNext={goNext}
                onBack={goBack}
                step={step}
                total={TOTAL}
              />
            )}
            {step === 4 && (
              <StepCard
                title="Welk tempo past bij je?"
                options={PACE_OPTIONS}
                selected={pace ?? ("" as Pace)}
                onSelect={(v) => { setPace(v); }}
                onNext={finish}
                onBack={goBack}
                step={step}
                total={TOTAL}
                nextLabel="Maak mijn route"
                nextDisabled={!pace}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
