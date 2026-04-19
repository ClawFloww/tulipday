import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const sb = createClient(
  "https://xjwdvqjswygkibyefnjj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqd2R2cWpzd3lna2lieWVmbmpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM2OTM4NCwiZXhwIjoyMDg5OTQ1Mzg0fQ.3vekm3W8K0LbIPl2mlJSD-L95s3C-dU6RWfkFO-vXXo"
);

const PHOTO_DIR = "/Users/clawfloww/Documents/Tulipday app foto's 3";

const MATCHES = [
  { file: "Teylingenlaan 1.jpg",  address: "teylingerlaan 1" },
];

for (const { file, address } of MATCHES) {
  // Find location by address
  const { data: locs } = await sb
    .from("locations")
    .select("id, title, slug")
    .ilike("address", address)
    .limit(1);

  if (!locs?.length) {
    console.log(`❌ Geen locatie gevonden voor: ${address}`);
    continue;
  }

  const loc = locs[0];
  const filePath = path.join(PHOTO_DIR, file);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ Bestand niet gevonden: ${file}`);
    continue;
  }

  const buffer = fs.readFileSync(filePath);
  const storagePath = `${loc.slug}/${file.replace(/ /g, "-").toLowerCase()}`;

  // Upload to location-images bucket
  const { error: uploadErr } = await sb.storage
    .from("location-images")
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    console.log(`❌ Upload mislukt voor ${file}: ${uploadErr.message}`);
    continue;
  }

  const { data: { publicUrl } } = sb.storage
    .from("location-images")
    .getPublicUrl(storagePath);

  // Update location
  const { error: dbErr } = await sb
    .from("locations")
    .update({ image_url: publicUrl })
    .eq("id", loc.id);

  if (dbErr) {
    console.log(`❌ DB update mislukt voor ${loc.title}: ${dbErr.message}`);
  } else {
    console.log(`✅ ${loc.title} → ${file}`);
  }
}

console.log("\nKlaar!");
