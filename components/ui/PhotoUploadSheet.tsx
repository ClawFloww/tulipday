"use client";

import { useState, useRef, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import imageCompression from "browser-image-compression";
import { X, Camera, ImageIcon, Upload, Check, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateSessionId } from "@/lib/session";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n-context";

interface Props {
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

export default function PhotoUploadSheet({ locationId, onClose, onUploaded }: Props) {
  const { t } = useT();
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
  const [progress, setProgress] = useState<string | null>(null);
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

    try {
      setProgress(t("photos.compress_progress"));
      const croppedFile = new File([croppedBlobRef.current], "photo.jpg", { type: "image/jpeg" });

      // 2. Comprimeer + strip EXIF
      const compressed = await imageCompression(croppedFile, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.85,
        exifOrientation: -1,
      });

      // 3. Upload naar Supabase Storage
      const sessionId = getOrCreateSessionId();
      const timestamp = Date.now();
      const path = `${locationId}/${sessionId}/${timestamp}.jpg`;

      const { error: storageError } = await supabase.storage
        .from("location-photos")
        .upload(path, compressed, { contentType: "image/jpeg", upsert: false });

      if (storageError) throw new Error(storageError.message);

      const { data: urlData } = supabase.storage.from("location-photos").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // 4. Sla record op in DB
      const { data: record, error: dbError } = await supabase
        .from("location_photos")
        .insert({
          location_id: locationId,
          session_id: sessionId,
          storage_path: path,
          public_url: publicUrl,
          caption: caption.trim() || null,
          bloom_confirmed: bloomConfirmed,
          status: "pending",
        })
        .select("id")
        .single();

      if (dbError) throw new Error(dbError.message);

      setPreviewUrl(publicUrl);
      setProgress(null);
      setStep("success");
      track("photo_upload", { location_id: locationId, bloom_confirmed: bloomConfirmed });
      onUploaded(record.id, publicUrl);
    } catch (err) {
      setProgress(null);
      setError(t("photos.error_upload"));
      setStep("details");
      console.error(err);
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("photos.sheet_title")}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-extrabold text-gray-900">{t("photos.sheet_title")}</h2>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 pb-8">

          {/* ── Step: pick ── */}
          {step === "pick" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{t("photos.step_pick")}</p>
              {error && (
                <div role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 font-medium">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <PickButton
                  icon={<Camera size={24} className="text-tulip-500" />}
                  label={t("photos.pick_camera")}
                  capture="environment"
                  onFile={handleFileSelected}
                />
                <PickButton
                  icon={<ImageIcon size={24} className="text-tulip-500" />}
                  label={t("photos.pick_gallery")}
                  onFile={handleFileSelected}
                />
              </div>
            </div>
          )}

          {/* ── Step: crop ── */}
          {step === "crop" && srcUrl && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{t("photos.step_crop")}</p>
              <div className="rounded-2xl overflow-hidden bg-gray-100">
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
                    alt="Voorvertoning voor bijsnijden"
                    onLoad={onImageLoad}
                    className="w-full object-contain"
                    style={{ maxHeight: "45dvh" }}
                  />
                </ReactCrop>
              </div>
              <button
                onClick={handleCropDone}
                disabled={!completedCrop}
                className="w-full py-3.5 bg-tulip-500 text-white font-bold rounded-xl flex items-center justify-center gap-2
                           disabled:opacity-40 hover:bg-tulip-600 transition-colors"
              >
                {t("photos.step_details")} <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Step: details ── */}
          {step === "details" && srcUrl && (
            <div className="space-y-4">
              {/* Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={srcUrl}
                alt="Voorvertoning"
                className="w-full aspect-[4/3] object-cover rounded-2xl bg-gray-100"
              />

              {error && (
                <div role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 font-medium">
                  {error}
                </div>
              )}

              {/* Caption */}
              <div>
                <label htmlFor="photo-caption" className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  {t("photos.caption_label")}
                </label>
                <textarea
                  id="photo-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 80))}
                  placeholder={t("photos.caption_placeholder")}
                  rows={2}
                  aria-label={t("photos.caption_label")}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-tulip-300 focus:border-tulip-400
                             resize-none transition-all"
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {t("photos.caption_hint").replace("{n}", String(caption.length))}
                </p>
              </div>

              {/* Bloom confirm */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bloomConfirmed}
                  onChange={(e) => setBloomConfirmed(e.target.checked)}
                  aria-label={t("photos.bloom_confirm_label")}
                  className="mt-0.5 w-4 h-4 rounded accent-tulip-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t("photos.bloom_confirm_label")}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t("photos.bloom_confirm_hint")}</p>
                </div>
              </label>

              {/* Consent */}
              <label className="flex items-start gap-3 cursor-pointer bg-tulip-50 rounded-xl p-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-label={t("photos.consent_label")}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 rounded accent-tulip-500"
                />
                <p className="text-sm leading-snug text-tulip-700">{t("photos.consent_label")}</p>
              </label>

              <button
                onClick={handleUpload}
                disabled={!consent}
                className="w-full py-3.5 bg-tulip-500 text-white font-bold rounded-xl flex items-center justify-center gap-2
                           disabled:opacity-40 hover:bg-tulip-600 transition-colors"
              >
                <Upload size={16} /> {t("photos.upload_btn")}
              </button>
            </div>
          )}

          {/* ── Step: uploading ── */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 size={36} className="text-tulip-400 animate-spin" />
              <p className="text-sm text-gray-500 font-medium">{progress ?? t("photos.uploading")}</p>
            </div>
          )}

          {/* ── Step: success ── */}
          {step === "success" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={28} className="text-green-600" />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900">{t("photos.success_title")}</h3>
                <p className="text-sm text-gray-500 text-center leading-relaxed">{t("photos.success_body")}</p>
              </div>
              {previewUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewUrl} alt="Geüploade foto" className="w-full aspect-[4/3] object-cover rounded-2xl" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleReset}
                  className="py-3 border-2 border-tulip-200 text-tulip-500 font-bold rounded-xl hover:border-tulip-400 transition-colors text-sm"
                >
                  {t("photos.add_another")}
                </button>
                <button
                  onClick={onClose}
                  className="py-3 bg-tulip-500 text-white font-bold rounded-xl hover:bg-tulip-600 transition-colors text-sm"
                >
                  {t("photos.done_btn")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
      className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl
                 bg-gray-50 border-2 border-dashed border-gray-200
                 hover:border-tulip-300 hover:bg-tulip-50 transition-all"
      aria-label={label}
    >
      {icon}
      <span className="text-sm font-semibold text-gray-700">{label}</span>
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
