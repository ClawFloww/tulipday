"use client";

// Demo-pagina: laat alle bloom-status componenten zien in gesimuleerde mobiele viewport

import { useState, useCallback } from "react";
import BloomStatusPrompt from "@/components/bloom/BloomStatusPrompt";
import BloomStatusFollowUp from "@/components/bloom/BloomStatusFollowUp";
import BloomStatusBadge from "@/components/bloom/BloomStatusBadge";
import ContributorReward from "@/components/bloom/ContributorReward";
import NotificationPreferences from "@/components/bloom/NotificationPreferences";
import { useBloomPromptTrigger } from "@/hooks/useBloomPromptTrigger";
import {
  TULIP_FIELDS,
  MOCK_BLOOM_STATUSES,
  STATUS_CONFIG,
  type BloomStatusType,
  type FieldBloomStatus,
  type UserContributionPrefs,
} from "@/lib/tulipFields";

// Gesimuleerde gebruikerslocatie: 18 m van field_001 (Frank van Borselenlaan 5)
const SIM_LAT = 52.22920;
const SIM_LNG = 4.51250;

// 5 velden die we tonen in de badge-lijst
const BADGE_FIELDS = ["field_001", "field_062", "field_080", "field_144", "field_160"];

type FlowStep = "idle" | "prompt" | "followup" | "done";

export default function BloomDemoPage() {
  const [statuses, setStatuses] = useState<FieldBloomStatus[]>(MOCK_BLOOM_STATUSES);
  const [step, setStep] = useState<FlowStep>("prompt");
  const [selectedStatus, setSelectedStatus] = useState<BloomStatusType | null>(null);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Pick<UserContributionPrefs, "statusUpdates" | "photoRequests" | "reviews">>({
    statusUpdates: true,
    photoRequests: true,
    reviews: false,
  });

  // Hook met gesimuleerde locatie
  const { dismissField, markSubmitted } = useBloomPromptTrigger(SIM_LAT, SIM_LNG);

  // Altijd field_001 tonen in demo (zodat prompt direct zichtbaar is)
  const demoField = TULIP_FIELDS.find((f) => f.id === "field_001")!;

  function handleStatusSelect(status: BloomStatusType) {
    setSelectedStatus(status);
    setStep("followup");
  }

  function handleDismiss() {
    dismissField(demoField.id);
    setStep("idle");
  }

  const handleFollowUpComplete = useCallback(
    (data: { photoUrl?: string; rating?: number; reviewText?: string }) => {
      // Voeg nieuwe status toe aan lokale mock state
      const newStatus: FieldBloomStatus = {
        id: `demo_${Date.now()}`,
        fieldId: demoField.id,
        userId: "demo_user",
        status: selectedStatus!,
        photoUrl: data.photoUrl,
        rating: data.rating,
        reviewText: data.reviewText,
        timestamp: new Date(),
        confirmedBy: 0,
        reliabilityScore: 1.0,
      };
      setStatuses((prev) => [newStatus, ...prev]);
      markSubmitted(demoField.id);
      setStep("done");
      setRewardVisible(true);
    },
    [demoField.id, selectedStatus, markSubmitted],
  );

  return (
    <div
      className="min-h-screen flex items-start justify-center py-8 px-4"
      style={{ backgroundColor: "#FAFAF7" }}
    >
      {/* Gesimuleerde mobiele viewport */}
      <div
        className="relative flex flex-col gap-0 rounded-3xl overflow-hidden shadow-2xl"
        style={{ width: 375, minHeight: 700, backgroundColor: "#FAFAF7" }}
      >
        {/* Status bar mock */}
        <div
          className="flex items-center justify-between px-5 pt-4 pb-2"
          style={{ backgroundColor: "#FAFAF7" }}
        >
          <span className="text-xs font-semibold text-gray-400">9:41</span>
          <span className="text-xs font-semibold" style={{ color: "#E8527A" }}>
            TulipDay · Bloom Demo
          </span>
          <span className="text-xs font-semibold text-gray-400">●●●</span>
        </div>

        {/* Scroll-container */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">

          {/* ── Sectie: locatiesimulatie ─────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
              Gesimuleerde locatie
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: "#FEF0F3" }}
              >
                📍
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">{demoField.name}</p>
                <p className="text-xs text-gray-400">~18 m · binnen trigger-radius (150 m)</p>
              </div>
              <span
                className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#FEF0F3", color: "#E8527A" }}
              >
                Dichtbij
              </span>
            </div>
          </section>

          {/* ── Sectie: flow-knoppen ─────────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">
              Bloei-status flow
            </p>

            {step === "done" ? (
              <div
                className="flex flex-col items-center py-4 gap-2 rounded-xl"
                style={{ backgroundColor: "#F0FDF4" }}
              >
                <span className="text-3xl">✅</span>
                <p className="font-bold text-sm text-green-700">Status ingediend!</p>
                <p className="text-xs text-green-600 text-center">
                  Bedankt voor je bijdrage. De badge hieronder is bijgewerkt.
                </p>
                <button
                  onClick={() => { setStep("prompt"); setSelectedStatus(null); }}
                  className="mt-1 text-xs font-semibold px-4 py-2 rounded-xl"
                  style={{ backgroundColor: "#E8527A", color: "white" }}
                >
                  Opnieuw proberen
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {(["in_bloom", "fading", "finished"] as BloomStatusType[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => { setStep("prompt"); setSelectedStatus(null); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-opacity hover:opacity-80"
                      style={{ backgroundColor: cfg.bg, color: cfg.text }}
                    >
                      <span className="text-xl">{cfg.emoji}</span>
                      {cfg.label}
                    </button>
                  );
                })}
                <p className="text-xs text-center text-gray-400 pt-1">
                  Tap een status → prompt opent automatisch hieronder
                </p>
              </div>
            )}
          </section>

          {/* ── Sectie: BloomStatusBadge ─────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">
              Bloei-badges (5 velden)
            </p>
            <div className="space-y-3">
              {BADGE_FIELDS.map((fieldId) => {
                const field = TULIP_FIELDS.find((f) => f.id === fieldId);
                if (!field) return null;
                return (
                  <div key={fieldId} className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-gray-500">{field.name}</p>
                    <BloomStatusBadge fieldId={fieldId} statuses={statuses} extended />
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Sectie: NotificationPreferences ─────────────────────── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">
              Notificatie-instellingen
            </p>
            <NotificationPreferences
              prefs={notifPrefs}
              onChange={(patch) => setNotifPrefs(patch)}
            />
          </section>
        </div>

        {/* ── Overlays (bottom sheets + reward) ───────────────────────── */}

        {/* Stap 1: BloomStatusPrompt */}
        <BloomStatusPrompt
          field={demoField}
          isOpen={step === "prompt"}
          onSelect={(s) => { handleStatusSelect(s); }}
          onDismiss={handleDismiss}
          onNotificationSettings={() => { setStep("idle"); setShowNotifPrefs(true); }}
        />

        {/* Stap 2: BloomStatusFollowUp */}
        {selectedStatus && (
          <BloomStatusFollowUp
            field={demoField}
            selectedStatus={selectedStatus}
            isOpen={step === "followup"}
            onComplete={handleFollowUpComplete}
            onClose={() => setStep("idle")}
          />
        )}

        {/* Beloning toast */}
        <ContributorReward
          travelersHelped={247}
          isVisible={rewardVisible}
          onDismiss={() => setRewardVisible(false)}
        />
      </div>

      {/* Notificatie-prefs modal buiten viewport (voor demo) */}
      {showNotifPrefs && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowNotifPrefs(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-[375px] bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <h2 className="text-base font-extrabold text-gray-900 mb-4">Meldingen aanpassen</h2>
            <NotificationPreferences
              prefs={notifPrefs}
              onChange={(patch) => setNotifPrefs(patch)}
            />
            <button
              onClick={() => setShowNotifPrefs(false)}
              className="w-full mt-4 py-3 rounded-2xl text-white text-sm font-bold"
              style={{ backgroundColor: "#E8527A" }}
            >
              Opslaan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
