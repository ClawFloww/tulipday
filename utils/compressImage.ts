// Client-side beeldcompressie via Canvas API — geen externe library nodig

/**
 * Comprimeer een afbeelding naar JPEG met maximale breedte en kwaliteit.
 * Werkt puur in de browser via het Canvas-element.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality  = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Bereken nieuwe afmetingen (behoud verhouding)
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width  = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context niet beschikbaar"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compressie mislukt"));
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Afbeelding kon niet worden geladen"));
    };

    img.src = url;
  });
}
