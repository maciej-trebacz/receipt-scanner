import { requireAuth } from "@/lib/auth";
import { stripe, getPackageById } from "@/lib/stripe";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const userId = await requireAuth();
    const { packageId } = await req.json();

    const creditPackage = getPackageById(packageId);
    if (!creditPackage) {
      return Response.json({ error: "Invalid package" }, { status: 400 });
    }

    const headersList = await headers();
    const origin = headersList.get("origin") || "http://localhost:3000";

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: creditPackage.label,
              description: `${creditPackage.credits} credits for receipt scanning`,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        credits: creditPackage.credits.toString(),
        packageId: creditPackage.id,
      },
      success_url: `${origin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/credits`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
