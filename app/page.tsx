"use client";

import { useState, useEffect } from "react";
import { ReceiptCapture } from "@/components/receipt-capture";
import { ReceiptForm } from "@/components/receipt-form";
import { ReceiptList } from "@/components/receipt-list";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Invoice01Icon,
  Invoice02Icon,
  UserCircleIcon,
  Search01Icon,
  Note01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Receipt {
  id: string;
  storeName: string;
  date: string;
  total: number;
  currency: string;
  categoryName: string;
  categoryColor: string;
}

export default function Home() {
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCapture = (file: File) => {
    setCapturedFile(file);
  };

  const handleScan = async () => {
    if (!capturedFile) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", capturedFile);

    try {
      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Scan failed");

      const data = await res.json();
      setScannedData(data);
      setStep("review");
    } catch (err) {
      alert("Failed to scan receipt. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          imagePath: scannedData.imagePath,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setStep("capture");
      setCapturedFile(null);
      setScannedData(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert("Failed to save receipt.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container px-6 py-10 space-y-12 max-w-5xl mx-auto">
      {/* Header with Welcome Message */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-1">
            Dashboard
          </h1>
          <p className="text-muted-foreground font-medium">
            Welcome back, <span className="text-foreground">Mav</span>. You scanned <span className="text-primary">12</span> receipts this week.
          </p>
        </div>
        <div className="size-14 rounded-2xl bg-background/50 glass flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/20 transition-all cursor-pointer">
          <HugeiconsIcon icon={UserCircleIcon} className="size-8" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Col: Main Action */}
        <div className="lg:col-span-7 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
              <HugeiconsIcon icon={Invoice02Icon} className="size-4" />
              Capture New Receipt
            </div>

            <div className={cn(
              "transition-all duration-500",
              step === "review" ? "opacity-0 scale-95 pointer-events-none hidden" : "opacity-100 scale-100"
            )}>
              <ReceiptCapture
                onCapture={handleCapture}
                onScan={handleScan}
                isLoading={isLoading}
              />
            </div>

            <div className={cn(
              "transition-all duration-500",
              step === "capture" ? "opacity-0 scale-95 pointer-events-none hidden" : "opacity-100 scale-100"
            )}>
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black tracking-tight">Review Details</h2>
                  <button
                    onClick={() => setStep("capture")}
                    className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {scannedData && (
                  <ReceiptForm
                    initialData={scannedData}
                    onSubmit={handleSubmit}
                    onCancel={() => setStep("capture")}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </div>
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Weekly Spend</p>
              <p className="text-2xl font-black">2,450.00 <span className="text-xs text-muted-foreground">PLN</span></p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary">
                <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                12% more than last week
              </div>
            </div>
            <div className="glass-card p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Top Category</p>
              <p className="text-2xl font-black">Groceries</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary">
                <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                45.3% of total spend
              </div>
            </div>
          </section>
        </div>

        {/* Right Col: Recent Activity */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
              <HugeiconsIcon icon={Note01Icon} className="size-4" />
              Recent Scans
            </div>
            <Link
              href="/receipts"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
            >
              View All
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="space-y-4">
            <ReceiptList limit={5} refreshTrigger={refreshTrigger} />
          </div>

          <div className="glass-card p-6 relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-all">
            <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <HugeiconsIcon icon={Search01Icon} className="size-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Smart Search</h4>
                <p className="text-xs text-muted-foreground">Find any transaction by item or store.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
