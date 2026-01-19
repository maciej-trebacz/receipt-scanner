import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  SparklesIcon,
  Analytics01Icon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";

const features = [
  {
    icon: Camera01Icon,
    title: "Instant Capture",
    description: "Take a photo or upload an image. Works with any receipt format.",
  },
  {
    icon: SparklesIcon,
    title: "AI Extraction",
    description: "Advanced AI reads every line item, total, tax, and store details.",
  },
  {
    icon: Analytics01Icon,
    title: "Smart Reports",
    description: "See spending by category, store, or time period. Spot trends instantly.",
  },
  {
    icon: SmartPhone01Icon,
    title: "Mobile First",
    description: "Designed for on-the-go. Scan receipts right after purchase.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Automate Your Expense Tracking</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stop manually entering receipts. Let AI do the work while you focus on
            what matters.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-4">
                <HugeiconsIcon icon={feature.icon} className="size-7" />
              </div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
