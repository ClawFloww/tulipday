"use client";

import { useState, useRef, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Camera, ImageIcon, Upload, Check, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { success as hapticSuccess } from "@/lib/haptics";
import { useT } from "@/lib/i18n-context";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  locationId: string;
  onClose: () => void;
  onUploaded: (photoId: string, previewUrl: string) => void;
}

type Step = "pick" | "crop" | "details" | "uploading" | "success";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 8 * 1024 * 1024;
const MIN_W = 800;
const MIN_H = 600;
const ASPECT = 4 / 3;

function centerAspectCrop(w: number, h: number): Crop {
  return centerCrop(makeAspectCrop({ unit: "%", width: 90 }, ASPECT, w, h), w, h);
}

async function getCroppedBlob(img: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height,
  );
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas toBlob failed"))), "image/jpeg", 0.92),
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 text-label rounded-xl px-4 py-3 bg-surface-3 text-ink">
      <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" aria-hidden />
      {children}
    </div>
  );
}

export default function PhotoUploadSheet({ open, locationId, onClose, onUploaded }: Props) {
  const { t } = useT();
  const { upload, progress } = usePhotoUpload();
  const [step, setStep] = useState<Step>("pick");
  const [error, setError] = useState<string | null>(null);

  // Crop state
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  // Cropped blob opslaan zodat het beschikbaar is in de upload stap (imgRef is dan unmounted)
  const croppedBlobRef = useRef<Blob | null>(null);

  // Details state
  const [caption, setCaption] = useState("");
  const [bloomConfirmed, setBloomConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => { if (srcUrl) URL.revokeObjectURL(srcUrl); };
  }, [srcUrl]);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) return t("photos.error_format");
    if (file.size > MAX_BYTES) return t("photos.error_size");
    return null;
  }

  async function checkResolution(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.naturalWidth < MIN_W || img.naturalHeight < MIN_H ? t("photos.error_resolution") : null);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  async function handleFileSelected(file: File) {
    setError(null);
    const typeErr = validateFile(file);
    if (typeErr) { setError(typeErr); return; }
    const resErr = await checkResolution(file);
    if (resErr) { setError(resErr); return; }
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setSrcUrl(URL.createObjectURL(file));
    setStep("crop");
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const c = centerAspectCrop(width, height);
    setCrop(c);
    // Zet completedCrop meteen zodat de "Verder"-knop enabled is zonder te hoeven slepen
    setCompletedCrop({
      unit: "px",
      x: Math.round((c.x / 100) * width),
      y: Math.round((c.y / 100) * height),
      width: Math.round((c.width / 100) * width),
      height: Math.round((c.height / 100) * height),
    });
  }

  async function handleCropDone() {
    if (!completedCrop || !imgRef.current) return;
    const blob = await getCroppedBlob(imgRef.current, completedCrop);
    croppedBlobRef.current = blob;  // bewaar voor gebruik in upload (imgRef is dan unmounted)
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setSrcUrl(URL.createObjectURL(blob));
    setStep("details");
  }

  async function handleUpload() {
    if (!consent) { setError(t("photos.error_consent")); return; }
    if (!croppedBlobRef.current) return;
    setError(null);
    setStep("uploading");

    const result = await upload({
      croppedBlob:    croppedBlobRef.current,
      locationId,
      caption,
      bloomConfirmed,
    });

    if (result) {
      hapticSuccess();
      setPreviewUrl(result.publicUrl);
      setStep("success");
      onUploaded(result.photoId, result.publicUrl);
    } else {
      setError(t("photos.error_upload"));
      setStep("details");
    }
  }

  function handleReset() {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setSrcUrl(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    croppedBlobRef.current = null;
    setCaption("");
    setBloomConfirmed(false);
    setConsent(false);
    setError(null);
    setPreviewUrl(null);
    setStep("pick");
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("photos.sheet_title")} showClose>
      <div className="pt-2 pb-4">

        {/* ── Stap: kiezen ── */}
        {step === "pick" && (
          <div className="space-y-4">
            <p className="text-body text-ink-2">{t("photos.step_pick")}</p>
            {error && <ErrorBox>{error}</ErrorBox>}
            <div className="grid grid-cols-2 gap-3">
              <PickButton icon={<Camera size={26} />} label={t("photos.pick_camera")} capture="environment" onFile={handleFileSelected} />
              <PickButton icon={<ImageIcon size={26} />} label={t("photos.pick_gallery")} onFile={handleFileSelected} />
            </div>
          </div>
        )}

        {/* ── Stap: bijsnijden ── */}
        {step === "crop" && srcUrl && (
          <div className="space-y-4">
            <p className="text-body text-ink-2">{t("photos.step_crop")}</p>
            <div className="rounded-2xl overflow-hidden bg-surface-3">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={ASPECT}
                minWidth={100}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={srcUrl}
                  alt={t("photos.preview_alt")}
                  onLoad={onImageLoad}
                  className="w-full object-contain max-h-[45dvh]"
                />
              </ReactCrop>
            </div>
            <Button size="lg" fullWidth onClick={handleCropDone} disabled={!completedCrop}>
              {t("photos.step_details")} <ChevronRight size={18} aria-hidden />
            </Button>
          </div>
        )}

        {/* ── Stap: details ── */}
        {step === "details" && srcUrl && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={srcUrl} alt={t("photos.preview_alt")} className="w-full aspect-[4/3] object-cover rounded-2xl bg-surface-3" />

            {error && <ErrorBox>{error}</ErrorBox>}

            <div>
              <label htmlFor="photo-caption" className="text-caption font-semibold uppercase tracking-wide block mb-1.5 text-ink-3">
                {t("photos.caption_label")}
              </label>
              <textarea
                id="photo-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 80))}
                placeholder={t("photos.caption_placeholder")}
                rows={2}
                className="w-full px-3.5 py-3 text-[15px] rounded-xl resize-none text-ink bg-surface-3 border-2 border-line
                           placeholder:text-ink-3 focus:outline-none focus:border-primary transition-colors duration-fast"
              />
              <p className="text-caption text-ink-3 text-right mt-1 font-mono">
                {t("photos.caption_hint").replace("{n}", String(caption.length))}
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer min-h-touch">
              <input
                type="checkbox"
                checked={bloomConfirmed}
                onChange={(e) => setBloomConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-[var(--color-primary)] flex-shrink-0"
              />
              <span>
                <span className="block text-[15px] font-semibold text-ink">{t("photos.bloom_confirm_label")}</span>
                <span className="block text-label font-normal text-ink-3 mt-0.5">{t("photos.bloom_confirm_hint")}</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-xl p-3 bg-primary-subtle">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 flex-shrink-0 rounded accent-[var(--color-primary)]"
              />
              <span className="text-label font-normal leading-snug text-ink">{t("photos.consent_label")}</span>
            </label>

            <Button size="lg" fullWidth icon={<Upload size={18} />} onClick={handleUpload} disabled={!consent}>
              {t("photos.upload_btn")}
            </Button>
          </div>
        )}

        {/* ── Stap: uploaden ── */}
        {step === "uploading" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4" aria-live="polite">
            <Loader2 size={36} className="text-primary animate-spin" aria-hidden />
            <p className="text-body text-ink-2 font-medium">{progress ?? t("photos.uploading")}</p>
          </div>
        )}

        {/* ── Stap: gelukt ── */}
        {step === "success" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-surface-3 flex items-center justify-center">
                <Check size={28} className="text-success" />
              </div>
              <h3 className="text-title text-ink">{t("photos.success_title")}</h3>
              <p className="text-body text-ink-2 leading-relaxed">{t("photos.success_body")}</p>
            </div>
            {previewUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt={t("photos.preview_alt")} className="w-full aspect-[4/3] object-cover rounded-2xl" />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={handleReset}>{t("photos.add_another")}</Button>
              <Button onClick={onClose}>{t("photos.done_btn")}</Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// ── Hulpcomponent voor foto picker knop ──────────────────────────────────────

function PickButton({
  icon, label, capture, onFile,
}: {
  icon: React.ReactNode;
  label: string;
  capture?: "environment" | "user";
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl text-primary
                 bg-surface-3 border-2 border-dashed border-line-strong
                 hover:border-primary hover:bg-primary-subtle active:scale-[0.98] transition-[transform,background-color,border-color] duration-fast
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {icon}
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/webp,image/heic,image/heif"
        capture={capture}
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
