"use client";

// Opwaartse bottom-sheet voor het uploaden van corso-foto's
// Stap 1 — Bron kiezen  |  Stap 2 — Preview + bijschrift  |  Stap 3 — Voortgang / resultaat

import { useRef, useState } from "react";
import Image from "next/image";
import { X, Camera, ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCorsoUpload } from "@/hooks/useCorsoUpload";

const STOPS = ["Noordwijk", "Sassenheim", "Lisse", "Hillegom", "Haarlem"];

interface Props {
  onClose:    () => void;
  onUploaded: () => void;
}

type Step = "source" | "preview" | "uploading" | "done" | "error";

export function CorsoUploadSheet({ onClose, onUploaded }: Props) {
  const { upload, progress, isUploading, error } = useCorsoUpload();

  const [step,     setStep]     = useState<Step>("source");
  const [preview,  setPreview]  = useState<string | null>(null);
  const [file,     setFile]     = useState<File | null>(null);
  const [caption,  setCaption]  = useState("");
  const [location, setLocation] = useState<string | null>(null);

  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // ── Bestand gekozen (camera of galerij) ──────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep("preview");
  }

  // ── Upload starten ────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!file) return;
    setStep("uploading");
    const ok = await upload({ file, caption: caption || undefined, location: location ?? undefined });
    setStep(ok ? "done" : "error");
    if (ok) {
      setTimeout(() => {
        onUploaded();
        onClose();
      }, 1800);
    }
  }

  // ── Overlay sluiten ───────────────────────────────────────────────────────
  function handleClose() {
    if (isUploading) return;       // niet sluiten tijdens upload
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60"
        onClick={handleClose}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{ backgroundColor: "var(--color-surface-2)" }}
      >
        {/* Drag-indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--color-border-strong)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            📷 Foto uploaden
          </h2>
          {!isUploading && (
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Stap 1: Bron kiezen ── */}
        {step === "source" && (
          <div className="px-5 pb-10">
            <p className="text-sm mb-5" style={{ color: "var(--color-text-3)" }}>
              Deel je beleving van het Bloemencorso
            </p>
            <div className="flex gap-3">
              {/* Camera */}
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed active:scale-95 transition-all"
                style={{ borderColor: "var(--color-border-strong)" }}
              >
                <Camera size={32} style={{ color: "#F0306A" }} />
                <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Camera</span>
              </button>

              {/* Galerij */}
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed active:scale-95 transition-all"
                style={{ borderColor: "var(--color-border-strong)" }}
              >
                <ImageIcon size={32} style={{ color: "#F0306A" }} />
                <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Galerij</span>
              </button>
            </div>

            {/* Verborgen inputs */}
            <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <input ref={galleryRef} type="file" accept="image/*"                       className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {/* ── Stap 2: Preview + bijschrift + locatie ── */}
        {step === "preview" && preview && (
          <div className="px-5 pb-10">
            {/* Preview */}
            <div className="relative rounded-2xl overflow-hidden mb-4 bg-black">
              <Image
                src={preview}
                alt="Preview"
                width={400}
                height={300}
                className="w-full max-h-56 object-contain"
              />
              <button
                onClick={() => { setStep("source"); setPreview(null); setFile(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
              >
                <X size={14} />
              </button>
            </div>

            {/* Bijschrift */}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Voeg een bijschrift toe… (optioneel)"
              maxLength={120}
              rows={2}
              className="w-full text-sm px-3 py-2.5 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-[#F0306A]/40 mb-3"
              style={{
                backgroundColor: "var(--color-surface-3)",
                borderColor:     "var(--color-border)",
                color:           "var(--color-text)",
              }}
            />

            {/* Locatie-chips */}
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-3)" }}>
              Waar ben je?
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {STOPS.map((stop) => (
                <button
                  key={stop}
                  onClick={() => setLocation(location === stop ? null : stop)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    location === stop
                      ? "text-white"
                      : "border"
                  }`}
                  style={
                    location === stop
                      ? { backgroundColor: "#F0306A" }
                      : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }
                  }
                >
                  {stop}
                </button>
              ))}
            </div>

            {/* Upload knop */}
            <button
              onClick={handleUpload}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
              style={{ backgroundColor: "#F0306A" }}
            >
              Foto delen 🌸
            </button>
          </div>
        )}

        {/* ── Stap 3: Uploaden ── */}
        {step === "uploading" && (
          <div className="px-5 pb-12 flex flex-col items-center gap-4">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-3)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#F0306A" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-2)" }}>
              {progress < 40 ? "Afbeelding comprimeren…"
               : progress < 85 ? "Uploaden…"
               : progress < 100 ? "Opslaan…"
               : "Bijna klaar…"}
            </p>
          </div>
        )}

        {/* ── Succes ── */}
        {step === "done" && (
          <div className="px-5 pb-12 flex flex-col items-center gap-3">
            <CheckCircle size={44} className="text-green-500" />
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Foto gedeeld!
            </p>
            <p className="text-sm text-center" style={{ color: "var(--color-text-3)" }}>
              Je foto staat nu in de live feed
            </p>
          </div>
        )}

        {/* ── Fout ── */}
        {step === "error" && (
          <div className="px-5 pb-10 flex flex-col items-center gap-3">
            <AlertCircle size={44} className="text-red-500" />
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Upload mislukt
            </p>
            <p className="text-sm text-center mb-2" style={{ color: "var(--color-text-3)" }}>
              {error ?? "Probeer het opnieuw"}
            </p>
            <button
              onClick={() => setStep("preview")}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#F0306A" }}
            >
              Opnieuw proberen
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
