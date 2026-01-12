const steps = [
  {
    step: "1",
    title: "Snap a photo",
    description: "Take a picture of your receipt with your phone camera or upload an existing image.",
  },
  {
    step: "2",
    title: "AI extracts data",
    description: "Our AI reads the receipt and extracts store name, items, prices, and totals.",
  },
  {
    step: "3",
    title: "Track & analyze",
    description: "View spending reports, filter by category, and understand where your money goes.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="container px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-4">How it works</h2>
          <p className="text-muted-foreground">Three simple steps to expense tracking</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
              <div className="text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary text-primary-foreground text-2xl font-black mb-4 shadow-lg shadow-primary/30">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
