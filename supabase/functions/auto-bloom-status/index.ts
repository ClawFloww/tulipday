// Supabase Edge Function: auto-bloom-status
// Stelt bloom_status automatisch in op basis van datum en Bollenstreek-seizoen.
// Draait dagelijks via een cron trigger (stel in via Supabase Dashboard → Edge Functions).
//
// Seizoen Bollenstreek (gemiddeld):
//   Narcissen:  februari–maart     → early/blooming
//   Hyacinten:  eind maart–april   → early/blooming/peak
//   Tulpen:     april–begin mei    → early/blooming/peak/ending
//   Keukenhof:  ca. 20 mrt – 20 mei
//
// Logica: update alleen velden die NIET handmatig zijn bijgewerkt de afgelopen 6 uur.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function getAutoBloomStatus(now: Date): "early" | "blooming" | "peak" | "ending" | null {
  const month = now.getMonth() + 1; // 1–12
  const day   = now.getDate();

  // Buiten seizoen → null (geen automatische status)
  if (month < 3 || month > 5)                    return null;
  if (month === 3 && day < 20)                   return null;
  if (month === 5 && day > 20)                   return null;

  // Seizoensverloop
  if (month === 3 && day >= 20)                  return "early";
  if (month === 4 && day < 5)                    return "early";
  if (month === 4 && day >= 5  && day < 12)      return "blooming";
  if (month === 4 && day >= 12 && day < 25)      return "peak";
  if (month === 4 && day >= 25)                  return "ending";
  if (month === 5 && day <= 20)                  return "ending";

  return null;
}

Deno.serve(async () => {
  const now       = new Date();
  const autoStatus = getAutoBloomStatus(now);

  if (!autoStatus) {
    return new Response(
      JSON.stringify({ message: "Buiten seizoen — geen update nodig." }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // Haal alle actieve bollenvelden op die niet handmatig bijgewerkt zijn (afgelopen 6 uur)
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

  const { data: fields, error: fetchError } = await supabase
    .from("locations")
    .select("id, bloom_status, updated_at")
    .eq("is_active", true)
    .eq("category", "flower_field")
    .lt("updated_at", sixHoursAgo); // niet recent handmatig gewijzigd

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!fields || fields.length === 0) {
    return new Response(
      JSON.stringify({ message: "Geen velden om bij te werken." }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // Update velden waarvan de status verschilt van de automatische status
  const toUpdate = fields
    .filter((f) => f.bloom_status !== autoStatus)
    .map((f) => f.id);

  if (toUpdate.length === 0) {
    return new Response(
      JSON.stringify({ message: "Alle velden al correct.", status: autoStatus }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const { error: updateError } = await supabase
    .from("locations")
    .update({ bloom_status: autoStatus })
    .in("id", toUpdate);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({
      message:  `${toUpdate.length} velden bijgewerkt naar '${autoStatus}'`,
      status:   autoStatus,
      date:     now.toISOString().split("T")[0],
      updated:  toUpdate.length,
      skipped:  fields.length - toUpdate.length,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
