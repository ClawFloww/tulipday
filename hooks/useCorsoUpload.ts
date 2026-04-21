// useCorsoUpload — comprimeer, upload en sla op in Supabase

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/utils/compressImage";

interface UploadParams {
  file:      File;
  caption?:  string;
  location?: string;   // stop_naam / locatie-chip
}

export function useCorsoUpload() {
  const [progress,    setProgress]    = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const upload = useCallback(async ({
    file, caption, location,
  }: UploadParams): Promise<boolean> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      // ── Stap 1: Comprimeer (0 → 40%) ──
      setProgress(10);
      const compressed = await compressImage(file, 1200, 0.85);
      setProgress(40);

      // ── Stap 2: Upload naar Storage (40 → 85%) ──
      const filename = `corso_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const path     = `corso/${filename}`;

      const { error: storageError } = await supabase.storage
        .from("location-images")
        .upload(path, compressed, { contentType: "image/jpeg", upsert: false });

      if (storageError) throw storageError;
      setProgress(85);

      // ── Stap 3: Haal publieke URL op (85 → 90%) ──
      const { data: urlData } = supabase.storage
        .from("location-images")
        .getPublicUrl(path);
      setProgress(90);

      // ── Stap 4: Sla record op in DB (90 → 100%) ──
      const { error: dbError } = await supabase
        .from("corso_photos")
        .insert({
          image_url: urlData.publicUrl,
          caption:   caption?.trim() || null,
          stop_naam: location ?? null,
          stop_id:   location ?? "onbekend",
          status:    "approved",
        });

      if (dbError) throw dbError;

      setProgress(100);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload mislukt";
      setError(msg);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, progress, isUploading, error };
}
