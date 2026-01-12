import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Invoice02Icon } from "@hugeicons/core-free-icons";

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="container px-6 max-w-5xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-8">
            <HugeiconsIcon icon={Invoice02Icon} className="size-4" />
            AI-Powered Receipt Scanning
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Track your spending{" "}
            <span className="text-primary">with zero effort</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Snap a photo of any receipt. Our AI instantly extracts and categorizes
            every item. Track spending with beautiful reports.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 h-14 rounded-xl font-bold shadow-lg shadow-primary/30">
              <Link href="/sign-up">Start Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 h-14 rounded-xl font-bold">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            5 free scans included. No credit card required.
          </p>
        </div>
      </div>

      {/* App screenshot placeholder */}
      <div className="mt-16 relative">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
        <div className="container px-6 max-w-5xl mx-auto">
          <div className="relative mx-auto max-w-4xl rounded-2xl border border-border/50 bg-muted/30 shadow-2xl overflow-hidden glass">
            <div className="aspect-[16/10] bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
              <div className="text-center">
                <HugeiconsIcon icon={Invoice02Icon} className="size-16 text-primary/30 mx-auto mb-4" />
                <span className="text-muted-foreground text-sm">App Preview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
