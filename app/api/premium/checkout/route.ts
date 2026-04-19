import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.startsWith("sk_live_VERVANG")) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const { priceId, sessionId, locale = "nl" } = await req.json();

  const origin = req.headers.get("origin") ?? "https://tulipday.online";

  const session = await stripe.checkout.sessions.create({
    mode:                "payment",
    payment_method_types: ["card", "ideal"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/${locale}/premium/success?session_id={CHECKOUT_SESSION_ID}&app_session=${sessionId}`,
    cancel_url:  `${origin}/${locale}/premium`,
    metadata:    { app_session_id: sessionId, locale },
    locale:      locale === "nl" ? "nl" : "en",
  });

  return NextResponse.json({ url: session.url });
}
