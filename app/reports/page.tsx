"use client";

import { useState, useEffect } from "react";
import { PeriodSelector, type Period } from "@/components/period-selector";
import { SpendingChart } from "@/components/spending-chart";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Invoice01Icon,
  Store01Icon,
  ChartLineData02Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";

interface ReportsData {
  period: { start: string; end: string; label: string };
  summary: {
    totalSpent: number;
    receiptCount: number;
    itemCount: number;
    avgPerReceipt: number;
  };
  byProductType: Array<{
    productType: string;
    totalSpent: number;
    itemCount: number;
    percentage: number;
  }>;
  byStore: Array<{
    storeName: string;
    totalSpent: number;
    receiptCount: number;
  }>;
  byDay: Array<{
    date: string;
    totalSpent: number;
  }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}&offset=${offset}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reports");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [period, offset]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass backdrop-blur-2xl md:hidden">
        <div className="container px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Reports</h1>
          </div>
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            offset={offset}
            onOffsetChange={setOffset}
            periodLabel={data?.period.label}
          />
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden md:block container px-6 pt-8 pb-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Reports</h1>
          </div>
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            offset={offset}
            onOffsetChange={setOffset}
            periodLabel={data?.period.label}
          />
        </div>
      </div>

      <main className="container px-6 py-8 md:pt-4 space-y-8 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="size-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-6" />
            <p className="text-muted-foreground font-medium animate-pulse">
              Loading reports...
            </p>
          </div>
        ) : error ? (
          <div className="glass-card p-12 text-center">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div
              key={`summary-${period}-${offset}`}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <HugeiconsIcon icon={ChartLineData02Icon} className="size-5" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Total Spent
                </p>
                <p className="text-2xl font-black tracking-tight">
                  {formatCurrency(data.summary.totalSpent)}
                </p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <HugeiconsIcon icon={Invoice01Icon} className="size-5" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Receipts
                </p>
                <p className="text-2xl font-black tracking-tight">
                  {data.summary.receiptCount}
                </p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <HugeiconsIcon icon={ShoppingBag01Icon} className="size-5" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Items
                </p>
                <p className="text-2xl font-black tracking-tight">
                  {data.summary.itemCount}
                </p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <HugeiconsIcon icon={Store01Icon} className="size-5" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Avg / Receipt
                </p>
                <p className="text-2xl font-black tracking-tight">
                  {formatCurrency(data.summary.avgPerReceipt)}
                </p>
              </div>
            </div>

            {/* Product Type Breakdown */}
            <div className="glass-card p-6 lg:p-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">
                Spending by Product Type
              </h2>
              <SpendingChart
                data={data.byProductType.map((item) => ({
                  label: item.productType,
                  value: item.totalSpent,
                  percentage: item.percentage,
                }))}
                formatValue={formatCurrency}
              />
            </div>

            {/* Store Breakdown */}
            <div className="glass-card p-6 lg:p-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">
                Top Stores
              </h2>
              {data.byStore.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No store data for this period
                </p>
              ) : (
                <div className="space-y-3">
                  {data.byStore.map((store, index) => (
                    <div
                      key={store.storeName}
                      className="flex items-center justify-between p-4 rounded-2xl glass transition-all hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center text-lg font-black text-muted-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold">{store.storeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {store.receiptCount} receipt
                            {store.receiptCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <p className="font-black text-lg">
                        {formatCurrency(store.totalSpent)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Trend */}
            {data.byDay.length > 0 && (
              <div className="glass-card p-6 lg:p-8">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">
                  Daily Spending
                </h2>
                <div className="flex items-end gap-1 h-32">
                  {(() => {
                    const maxDaily = Math.max(...data.byDay.map((d) => d.totalSpent));
                    return data.byDay.map((day) => {
                      const heightPercent = maxDaily > 0 ? (day.totalSpent / maxDaily) * 100 : 0;
                      const heightPx = Math.max(4, (heightPercent / 100) * 128); // 128px = h-32
                      return (
                        <div
                          key={day.date}
                          className="flex-1 group relative h-full flex items-end"
                        >
                          <div
                            className="w-full bg-primary/80 rounded-t-lg transition-all group-hover:bg-primary"
                            style={{ height: `${heightPx}px` }}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap font-bold z-10">
                            {formatCurrency(day.totalSpent)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                  <span>{data.byDay[0]?.date}</span>
                  <span>{data.byDay[data.byDay.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
