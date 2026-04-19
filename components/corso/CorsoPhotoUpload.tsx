"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, MapPin, Loader2, CheckCircle, ChevronDown, X } from "lucide-react";
import Image from "next/image";
import { CORSO_ROUTE, nearestStop, CorsoStop } from "@/lib/corsoData";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

const MAX_CAPTION = 140;

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function CorsoPhotoUpload({ onUploaded }: { onUploaded?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [caption, setCaption]   = useState("");
  const [selectedStop, setSelectedStop] = useState<CorsoStop | null>(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [status, setStatus]     = useState<UploadStatus>("idle");
  const [showStopPicker, setShowStopPicker] = useState(false);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setStatus("idle");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const stop = nearestStop(pos.coords.latitude, pos.coords.longitude);
        setSelectedStop(stop);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };

  const clearPhoto = () => {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file || !selectedStop) return;
    setStatus("uploading");

    try {
      // Compress
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });

      // Upload to Supabase Storage (location-images/corso/ prefix)
      const ext = compressed.name.split(".").pop() ?? "jpg";
      const path = `corso/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("location-images")
        .upload(path, compressed, { contentType: compressed.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("location-images").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      // Save to DB via API (server captures IP)
      const res = await fetch("/api/corso/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption.trim() || undefined,
          stop_id: selectedStop.id,
          stop_naam: selectedStop.name,
        }),
      });

      if (!res.ok) throw new Error("Upload mislukt");

      setStatus("success");
      setFile(null);
      setPreview(null);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded?.();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <CheckCircle size={48} className="text-green-500 mb-3" />
        <p className="text-base font-bold text-gray-800">Foto gedeeld!</p>
        <p className="text-sm text-gray-400 mt-1">Je foto wordt zichtbaar na goedkeuring.</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-5 px-6 py-2.5 rounded-xl bg-tulip-500 text-white text-sm font-bold"
        >
          Nog een foto delen
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Photo picker */}
      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-48 rounded-2xl border-2 border-dashed border-tulip-200 bg-tulip-50 flex flex-col items-center justify-center gap-2 text-tulip-400 hover:bg-tulip-100 transition-colors"
        >
          <Camera size={32} />
          <span className="text-sm font-semibold">Foto kiezen of maken</span>
          <span className="text-xs">Tik om te beginnen</span>
        </button>
      ) : (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden">
          <Image src={preview} alt="Preview" fill className="object-cover" />
          <button
            onClick={clearPhoto}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Caption */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Bijschrift (optioneel)
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
          placeholder="Wat zie jij hier? 🌷"
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-tulip-300 resize-none"
        />
        <p className="text-right text-xs text-gray-400 mt-1">{caption.length}/{MAX_CAPTION}</p>
      </div>

      {/* Stop selector */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Locatie <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleGps}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-tulip-500 text-white text-xs font-bold flex-shrink-0"
          >
            {gpsLoading ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
            GPS
          </button>
          <button
            onClick={() => setShowStopPicker(!showStopPicker)}
            className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-700 font-medium"
          >
            <span>{selectedStop ? selectedStop.name : "Kies een stop…"}</span>
            <ChevronDown size={15} className={`text-gray-400 transition-transform ${showStopPicker ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showStopPicker && (
          <div className="mt-2 rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-lg divide-y divide-gray-50">
            {CORSO_ROUTE.map((stop) => (
              <button
                key={stop.id}
                onClick={() => { setSelectedStop(stop); setShowStopPicker(false); }}
                className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center gap-2 hover:bg-tulip-50 transition-colors
                  ${selectedStop?.id === stop.id ? "text-tulip-600 bg-tulip-50" : "text-gray-700"}`}
              >
                <span className="text-xs text-gray-400 w-4">{stop.order}</span>
                {stop.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || !selectedStop || status === "uploading"}
        className="w-full py-3.5 rounded-xl bg-tulip-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-tulip-600 active:scale-95 transition-all"
      >
        {status === "uploading" ? (
          <><Loader2 size={16} className="animate-spin" /> Uploaden…</>
        ) : (
          "📸 Foto delen"
        )}
      </button>

      {status === "error" && (
        <p className="text-sm text-red-500 text-center font-medium">
          Upload mislukt. Probeer het opnieuw.
        </p>
      )}

      <p className="text-center text-xs text-gray-300">
        Foto&apos;s worden gecontroleerd voor publicatie.
      </p>
    </div>
  );
}
