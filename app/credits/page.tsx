"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export default function CreditsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (pkg: CreditPackage) => {
    setLoading(pkg.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error("Failed to start checkout");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 glass backdrop-blur-2xl md:hidden">
        <div className="container px-6 py-5 max-w-5xl mx-auto">
          <h1 className="text-2xl font-black tracking-tight">Buy Credits</h1>
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden md:block container px-6 pt-8 pb-4 max-w-5xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight">Buy Credits</h1>
      </div>

      <main className="container px-6 py-8 md:pt-4 max-w-4xl mx-auto">
        <p className="text-muted-foreground text-lg text-center mb-10">
          Credits are used to scan receipts. Each scan costs 1 credit.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={cn(
                "glass-card relative overflow-hidden transition-all hover:scale-[1.02]",
                "badge" in pkg && pkg.badge === "Best Value" && "ring-2 ring-primary"
              )}
            >
              {"badge" in pkg && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                  {pkg.badge}
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-5xl font-black">
                  {pkg.credits}
                </CardTitle>
                <CardDescription className="text-lg">credits</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="text-3xl font-bold">{pkg.priceDisplay}</div>
                <div className="text-sm text-muted-foreground">
                  ${(pkg.price / 100 / pkg.credits).toFixed(3)} per credit
                </div>
                <Button
                  className="w-full rounded-xl font-bold"
                  size="lg"
                  onClick={() => handlePurchase(pkg)}
                  disabled={loading !== null}
                >
                  {loading === pkg.id ? "Processing..." : "Buy Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          <p>Secure payment powered by Stripe. Credits never expire.</p>
        </div>
      </main>
    </div>
  );
}
