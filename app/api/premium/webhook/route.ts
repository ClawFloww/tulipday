import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe-dashboard → Webhooks: abonneer op `checkout.session.completed`,
// `checkout.session.async_payment_succeeded` en `charge.refunded`.

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const stripe = new Stripe(secretKey);
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const userId  = session.metadata?.user_id;
    const season  = Number(session.metadata?.season);

    // iDEAL kan na 'completed' nog 'unpaid' zijn; dan volgt async_payment_succeeded
    if (userId && season && session.payment_status === "paid") {
      const { error } = await sb.from("entitlements").upsert(
        { user_id: userId, product: "season_pass", season, source: "stripe", source_ref: session.id },
        { onConflict: "source,source_ref", ignoreDuplicates: true }
      );
      // 500 → Stripe probeert het later opnieuw
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (paymentIntent && charge.refunded) {
      const { data: sessions } = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
      const sessionId = sessions[0]?.id;
      if (sessionId) {
        await sb.from("entitlements")
          .update({ revoked_at: new Date().toISOString() })
          .eq("source", "stripe").eq("source_ref", sessionId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
