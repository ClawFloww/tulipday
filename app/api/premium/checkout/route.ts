import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { CURRENT_SEASON_YEAR } from "@/lib/premium";
import { createAdminClient } from "@/lib/supabase-admin";
import { bearerToken, getUserFromToken } from "@/lib/supabase-server-auth";

// Prijs staat server-side vast; de client kan geen eigen price meesturen
const SEASON_PRICE_ID = "price_1TQ3MiCMTdZLUsIufuuGl3vb";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.startsWith("sk_live_VERVANG")) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  // Koppel de aankoop aan het (eventueel anonieme) Supabase-account
  const user = await getUserFromToken(createAdminClient(), bearerToken(req));
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { locale = "nl" } = await req.json().catch(() => ({}));
  const origin = req.headers.get("origin") ?? "https://tulipday.online";

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode:                 "payment",
    payment_method_types: ["card", "ideal"],
    line_items:           [{ price: SEASON_PRICE_ID, quantity: 1 }],
    client_reference_id:  user.id,
    customer_email:       user.email || undefined,
    success_url:          `${origin}/${locale}/premium/success`,
    cancel_url:           `${origin}/${locale}/premium`,
    metadata:             { user_id: user.id, season: String(CURRENT_SEASON_YEAR), locale },
    locale:               locale === "nl" ? "nl" : "en",
  });

  return NextResponse.json({ url: session.url });
}
