import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:hello@tulipday.online",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  // Simple admin auth
  const auth = req.headers.get("x-admin-password");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, body, url, image, locale } = await req.json();
  if (!title || !body) return NextResponse.json({ error: "Missing title/body" }, { status: 400 });

  const sb = getSb();
  let query = sb.from("push_subscriptions").select("subscription");
  if (locale) query = query.eq("locale", locale);
  const { data: subs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payload = JSON.stringify({ title, body, url: url ?? "/", image });
  let sent = 0, failed = 0;

  await Promise.allSettled(
    (subs ?? []).map(async ({ subscription }) => {
      try {
        await webpush.sendNotification(subscription as webpush.PushSubscription, payload);
        sent++;
      } catch {
        failed++;
        // Remove invalid subscriptions
        await sb.from("push_subscriptions").delete().eq("endpoint", (subscription as { endpoint: string }).endpoint);
      }
    })
  );

  return NextResponse.json({ sent, failed, total: (subs ?? []).length });
}
