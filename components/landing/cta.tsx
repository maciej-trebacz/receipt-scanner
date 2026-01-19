import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-20">
      <div className="container px-6 max-w-5xl mx-auto">
        <div className="bg-primary rounded-3xl p-8 md:p-16 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to simplify expense tracking?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join smart spenders who save time with AI-powered receipt scanning.
            Start free today.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-lg px-8 h-14 rounded-xl font-bold shadow-lg"
          >
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
          <p className="mt-6 text-sm opacity-75">
            No credit card required. 5 free scans included.
          </p>
        </div>
      </div>
    </section>
  );
}
