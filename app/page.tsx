import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Hero, Features, HowItWorks, Pricing, CTA } from "@/components/landing";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
    </div>
  );
}
