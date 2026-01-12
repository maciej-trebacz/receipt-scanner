"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReceiptCapture } from "@/components/receipt-capture";
import { ReceiptList } from "@/components/receipt-list";
import { BulkUpload } from "@/components/bulk-upload";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Invoice02Icon,
  UserCircleIcon,
  Note01Icon,
  ArrowRight01Icon,
  ChartLineData02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { receiptKeys } from "@/lib/hooks/use-receipts";

interface WeeklyStats {
  totalSpent: number;
  receiptCount: number;
  topProductType: string | null;
  topProductPercentage: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"capture" | "bulk">("capture");
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalSpent: 0,
    receiptCount: 0,
    topProductType: null,
    topProductPercentage: 0,
  });

  // Fetch weekly stats
  useEffect(() => {
    fetch("/api/reports?period=week")
      .then((res) => res.json())
      .then((data) => {
        const topProduct = data.byProductType?.[0];
        setWeeklyStats({
          totalSpent: data.summary?.totalSpent || 0,
          receiptCount: data.summary?.receiptCount || 0,
          topProductType: topProduct?.productType || null,
          topProductPercentage: topProduct?.percentage || 0,
        });
      })
      .catch(() => {
        // Silently fail, keep defaults
      });
  }, []);

  // Handle single capture - queue for async processing
  const handleScan = async (file: File) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("files", file);

    try {
      const res = await fetch("/api/receipts/queue", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        if (error.error === "insufficient_credits") {
          toast.error("No credits remaining", {
            description: "Purchase more credits to continue scanning receipts",
          });
        } else {
          throw new Error(error.error || "Upload failed");
        }
        return;
      }

      // Invalidate queries to show the new pending receipt
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    } catch (err) {
      toast.error("Upload failed", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkComplete = () => {
    queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    setMode("capture");
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
            You scanned <span className="text-primary">{weeklyStats.receiptCount}</span> receipt{weeklyStats.receiptCount !== 1 ? "s" : ""} this week.
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <HugeiconsIcon icon={Invoice02Icon} className="size-4" />
                {mode === "capture" ? "Capture New Receipt" : "Bulk Upload"}
              </div>
              <button
                onClick={() => setMode(mode === "capture" ? "bulk" : "capture")}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />
                {mode === "capture" ? "Bulk Upload" : "Single Capture"}
              </button>
            </div>

            {mode === "capture" ? (
              <ReceiptCapture
                onCapture={() => {}}
                onScan={handleScan}
                isLoading={isLoading}
              />
            ) : (
              <BulkUpload
                onComplete={handleBulkComplete}
                onClose={() => setMode("capture")}
              />
            )}
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <Link href="/reports" className="glass-card p-6 hover:border-primary/30 transition-all group">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Weekly Spend</p>
              <p className="text-2xl font-black">{formatCurrency(weeklyStats.totalSpent)} <span className="text-xs text-muted-foreground">PLN</span></p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary">
                <HugeiconsIcon icon={ChartLineData02Icon} className="size-3 group-hover:translate-x-0.5 transition-transform" />
                View full reports
              </div>
            </Link>
            <Link href="/reports" className="glass-card p-6 hover:border-primary/30 transition-all group">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Top Product Type</p>
              <p className="text-2xl font-black capitalize">{weeklyStats.topProductType || "—"}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary">
                <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                {weeklyStats.topProductPercentage > 0
                  ? `${weeklyStats.topProductPercentage.toFixed(1)}% of total spend`
                  : "No data yet"}
              </div>
            </Link>
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
            <ReceiptList limit={5} variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
}
