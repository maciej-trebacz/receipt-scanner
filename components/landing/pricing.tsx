import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

const packages = [
  { credits: 10, price: "$1.99", perCredit: "$0.20" },
  { credits: 30, price: "$4.99", perCredit: "$0.17", popular: true },
  { credits: 100, price: "$9.99", perCredit: "$0.10", best: true },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="container px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Simple pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start free with 5 credits. Buy more when you need them.
            <br />
            1 credit = 1 receipt scan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.credits}
              className={`glass-card overflow-hidden ${
                pkg.popular ? "ring-2 ring-primary shadow-lg" : ""
              }`}
            >
              {pkg.popular && (
                <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-bold">
                  Most Popular
                </div>
              )}
              {pkg.best && (
                <div className="bg-green-500 text-white text-center py-2 text-sm font-bold">
                  Best Value
                </div>
              )}
              <div className="p-6">
                <h3 className="font-black text-xl mb-1">{pkg.credits} Credits</h3>
                <p className="text-sm text-muted-foreground mb-4">{pkg.perCredit} per credit</p>
                <div className="text-4xl font-black mb-6">{pkg.price}</div>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <HugeiconsIcon icon={Tick02Icon} className="size-4 text-green-500" />
                    {pkg.credits} receipt scans
                  </li>
                  <li className="flex items-center gap-2">
                    <HugeiconsIcon icon={Tick02Icon} className="size-4 text-green-500" />
                    Never expires
                  </li>
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button asChild size="lg" className="text-lg px-8 h-14 rounded-xl font-bold shadow-lg shadow-primary/30">
            <Link href="/sign-up">Start Free with 5 Credits</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
