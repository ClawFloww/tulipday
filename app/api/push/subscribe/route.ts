import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { corsPreflight, withCors } from "@/lib/cors";

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const { subscription, locale = "nl" } = await req.json();
  if (!subscription?.endpoint) return withCors(req, NextResponse.json({ error: "Missing subscription" }, { status: 400 }));

  const sb = getSb();
  const { error } = await sb.from("push_subscriptions").upsert(
    { endpoint: subscription.endpoint, subscription, locale },
    { onConflict: "endpoint" }
  );
  if (error) return withCors(req, NextResponse.json({ error: error.message }, { status: 500 }));
  return withCors(req, NextResponse.json({ ok: true }));
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  if (!endpoint) return withCors(req, NextResponse.json({ error: "Missing endpoint" }, { status: 400 }));

  const sb = getSb();
  await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return withCors(req, NextResponse.json({ ok: true }));
}

export function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
