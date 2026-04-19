import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const sb = createClient(
  "https://xjwdvqjswygkibyefnjj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqd2R2cWpzd3lna2lieWVmbmpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM2OTM4NCwiZXhwIjoyMDg5OTQ1Mzg0fQ.3vekm3W8K0LbIPl2mlJSD-L95s3C-dU6RWfkFO-vXXo"
);

const PHOTO_DIR = "/Users/clawfloww/Documents/overige foto's ";

// 5 foto's verdeeld over 23 locaties
const ASSIGNMENTS = [
  // overig 1 → Veenenburgerlaan 1-5
  { file: "overig 1.jpg", slug: "veenenburgerlaan-1", id: "eeca9245-b6fc-4589-953d-ebf53bd83afb" },
  { file: "overig 1.jpg", slug: "veenenburgerlaan-2", id: "546bd119-cb47-49b5-b074-61d30cc0dfb4" },
  { file: "overig 1.jpg", slug: "veenenburgerlaan-3", id: "de960529-c9fe-441c-84d2-f8397278f49c" },
  { file: "overig 1.jpg", slug: "veenenburgerlaan-4", id: "e69146a2-8b88-42d1-a523-00be904df5f2" },
  { file: "overig 1.jpg", slug: "veenenburgerlaan-5", id: "fd96a934-d107-4bca-8d11-c8545de6c93d" },

  // overig 2 → Vogelaarsdreef + 3e Loosterweg
  { file: "overig 2.jpg", slug: "vogelaarsdreef-1",   id: "98e92989-0680-4389-b866-7ac0344bbdd4" },
  { file: "overig 2.jpg", slug: "vogelaarsdreef-2",   id: "f9fe0e35-d8ff-47a2-bd50-bb146c8af955" },
  { file: "overig 2.jpg", slug: "3e-loosterweg-2",    id: "63a7da47-5a65-4ca9-b251-a0c2f82fead8" },
  { file: "overig 2.jpg", slug: "3e-loosterweg-3",    id: "fcc43178-c1f1-43f9-becb-a3856b5bbf54" },

  // overig 3 → Sgravendamseweg + Leidsestraat
  { file: "overig 3.jpg", slug: "sgravendamseweg-2",  id: "26108418-73b0-47b6-8c30-145444240244" },
  { file: "overig 3.jpg", slug: "sgravendamseweg-3",  id: "300cb364-90cd-49fd-94aa-d221d0c712a6" },
  { file: "overig 3.jpg", slug: "leidsestraat-1",     id: "78bf786f-e532-4d2c-968e-cf206f68b8f8" },
  { file: "overig 3.jpg", slug: "leidsestraat-2",     id: "9c4962de-a885-4463-bc3c-5a295e1b38b7" },

  // overig 4 → Prinsenweg + Achterweg + Herenweg
  { file: "overig 4.jpg", slug: "prinsenweg-2",       id: "7097ca4f-83c4-4f8a-91bf-da036995ce29" },
  { file: "overig 4.jpg", slug: "prinsenweg-3",       id: "cd085caf-1997-404a-a2fa-8ebc3392e3b2" },
  { file: "overig 4.jpg", slug: "achterweg-zuid-3",   id: "b77b7faa-7582-43ba-b80a-91ef66e77dcf" },
  { file: "overig 4.jpg", slug: "herenweg-nw-2",      id: "7e443d12-da88-43aa-89e5-d45d406362e0" },

  // overig 6 → de bekende/bijzondere locaties
  { file: "overig 6.jpg", slug: "de-zilk-bloembollenvelden",  id: "4bb0f7b7-1473-4927-821e-37f9e632c646" },
  { file: "overig 6.jpg", slug: "keukenhofbos",               id: "48c7302b-09a4-4f70-b0e5-6354e37e7456" },
  { file: "overig 6.jpg", slug: "de-tulperij",                id: "1a389561-e1a7-4f72-801d-1928d4773d16" },
  { file: "overig 6.jpg", slug: "tulpenvelden-anna-paulowna", id: "4d99b453-067e-49c9-9c35-eb368e9b7c5b" },
  { file: "overig 6.jpg", slug: "bollenveldenzone-hillegom-zuid", id: "15e6ffaf-9fcf-4e2b-be4c-d150551fea07" },
  { file: "overig 6.jpg", slug: "bollenveldenzone-lisse",     id: "eb2c6631-c2b6-493a-9039-807cbaf0bdf1" },
];

// Upload elke unieke foto één keer, hergebruik de public URL voor duplicaten
const uploadedUrls = {};

for (const { file, slug, id } of ASSIGNMENTS) {
  const filePath = path.join(PHOTO_DIR, file);

  let publicUrl = uploadedUrls[file];

  if (!publicUrl) {
    // Eerste keer: upload naar storage
    const buffer = fs.readFileSync(filePath);
    const storagePath = `overig/${file.replace(/ /g, "-")}`;

    const { error: uploadErr } = await sb.storage
      .from("location-images")
      .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });

    if (uploadErr) {
      console.log(`❌ Upload mislukt voor ${file}: ${uploadErr.message}`);
      continue;
    }

    const { data: { publicUrl: url } } = sb.storage.from("location-images").getPublicUrl(storagePath);
    publicUrl = url;
    uploadedUrls[file] = publicUrl;
    console.log(`📤 Geüpload: ${file}`);
  }

  // Koppel URL aan locatie
  const { error: dbErr } = await sb.from("locations").update({ image_url: publicUrl }).eq("id", id);
  console.log(dbErr ? `  ❌ ${slug}: ${dbErr.message}` : `  ✅ ${slug}`);
}

console.log("\nKlaar!");
