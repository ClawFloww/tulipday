import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stopId = searchParams.get("stop_id");

  const sb = getServiceClient();
  let query = sb
    .from("corso_photos")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (stopId) query = query.eq("stop_id", stopId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { image_url, caption, stop_id, stop_naam, lat, lng } = body as {
    image_url: string; caption?: string;
    stop_id: string; stop_naam: string;
    lat?: number; lng?: number;
  };

  if (!image_url || !stop_id || !stop_naam) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("corso_photos")
    .insert({ image_url, caption: caption ?? null, stop_id, stop_naam, lat: lat ?? null, lng: lng ?? null, uploader_ip: ip, status: "pending" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
