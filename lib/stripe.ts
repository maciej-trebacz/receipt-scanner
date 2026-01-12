import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const CREDIT_PACKAGES = [
  {
    id: "credits_10",
    credits: 10,
    price: 199,
    priceDisplay: "$1.99",
    label: "10 Credits",
  },
  {
    id: "credits_30",
    credits: 30,
    price: 499,
    priceDisplay: "$4.99",
    label: "30 Credits",
    badge: "Save 17%",
  },
  {
    id: "credits_100",
    credits: 100,
    price: 999,
    priceDisplay: "$9.99",
    label: "100 Credits",
    badge: "Best Value",
  },
] as const;

export type CreditPackage = (typeof CREDIT_PACKAGES)[number];

export function getPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
