import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const stripe = new Stripe(secretKey);
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = event.data.object as any;
    const appSessionId = session.metadata?.app_session_id;
    if (appSessionId) {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      await sb.from("premium_purchases").upsert({
        session_id: appSessionId,
        stripe_session_id: session.id,
        amount_paid: (session.amount_total ?? 0) / 100,
        purchased_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
