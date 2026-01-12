import { stripe } from "@/lib/stripe";
import { addCredits } from "@/lib/credits";
import { headers } from "next/headers";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || "0", 10);
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!userId || !credits) {
      console.error("Missing metadata in checkout session:", session.id);
      return Response.json({ error: "Missing metadata" }, { status: 400 });
    }

    try {
      await addCredits(
        userId,
        credits,
        "purchase",
        paymentIntent,
        `Purchased ${credits} credits`
      );
      console.log(`Added ${credits} credits for user ${userId}`);
    } catch (error) {
      console.error("Failed to add credits:", error);
      return Response.json({ error: "Failed to add credits" }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
