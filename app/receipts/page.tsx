import { ReceiptList } from "@/components/receipt-list";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

export default function ReceiptsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass transition-all duration-300 md:hidden">
        <div className="container px-6 py-6 flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Receipts</h1>
            <p className="text-xs font-bold text-primary-text uppercase tracking-[0.2em] mt-1">Transaction History</p>
          </div>
          <Link
            href="/"
            className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-6 stroke-[2.5]" />
          </Link>
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden md:block container px-6 pt-8 pb-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Receipts</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Transaction History
            </p>
          </div>
        </div>
      </div>

      <main className="container px-6 py-8 md:pt-4 max-w-5xl mx-auto">
        <ReceiptList />
      </main>
    </div>
  );
}
