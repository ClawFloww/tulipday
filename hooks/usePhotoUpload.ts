"use client";

// Upload-logica voor locatiefoto's: compress → Supabase Storage → DB insert
// Gebruikt door PhotoUploadSheet. Scheidt de async upload van de UI-stap-logica.

import { useState, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import { getOrCreateSessionId } from "@/lib/session";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n-context";

interface UploadParams {
  croppedBlob:    Blob;
  locationId:     string;
  caption:        string;
  bloomConfirmed: boolean;
}

interface UploadResult {
  photoId:   string;
  publicUrl: string;
}

export function usePhotoUpload() {
  const { t } = useT();
  const [progress, setProgress] = useState<string | null>(null);

  const upload = useCallback(
    async ({ croppedBlob, locationId, caption, bloomConfirmed }: UploadParams): Promise<UploadResult | null> => {
      setProgress(t("photos.compress_progress"));
      try {
        // 1. Comprimeer + strip EXIF
        const croppedFile = new File([croppedBlob], "photo.jpg", { type: "image/jpeg" });
        const compressed  = await imageCompression(croppedFile, {
          maxSizeMB:       2,
          maxWidthOrHeight: 1920,
          useWebWorker:    true,
          initialQuality:  0.85,
          exifOrientation: -1,
        });

        // 2. Upload naar Supabase Storage
        const sessionId = getOrCreateSessionId();
        const path      = `${locationId}/${sessionId}/${Date.now()}.jpg`;

        const { error: storageError } = await supabase.storage
          .from("location-photos")
          .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
        if (storageError) throw new Error(storageError.message);

        // 3. Haal publieke URL op
        const { data: urlData } = supabase.storage.from("location-photos").getPublicUrl(path);
        const publicUrl         = urlData.publicUrl;

        // 4. Sla record op in DB
        const { data: record, error: dbError } = await supabase
          .from("location_photos")
          .insert({
            location_id:     locationId,
            session_id:      sessionId,
            storage_path:    path,
            public_url:      publicUrl,
            caption:         caption.trim() || null,
            bloom_confirmed: bloomConfirmed,
            status:          "pending",
          })
          .select("id")
          .single();
        if (dbError) throw new Error(dbError.message);

        track("photo_upload", { location_id: locationId, bloom_confirmed: bloomConfirmed });
        setProgress(null);
        return { photoId: record.id, publicUrl };
      } catch (err) {
        setProgress(null);
        console.error(err);
        return null;
      }
    },
    [t],
  );

  return { upload, progress };
}
