"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Invoice01Icon, Calendar03Icon, ZapIcon } from "@hugeicons/core-free-icons";

interface ReceiptCardProps {
  id: string;
  storeName: string | null;
  date: Date | null;
  total: number;
  currency: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
}

function formatCurrency(amount: number, currency: string = "PLN"): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date | null): string {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function ReceiptCard({
  id,
  storeName,
  date,
  total,
  currency,
  categoryName,
  categoryColor,
}: ReceiptCardProps) {
  return (
    <Link href={`/receipts/${id}`} className="block group">
      <div className="glass-card p-5 relative overflow-hidden">
        {/* Subtle accent line on top */}
        <div
          className="absolute top-0 left-0 w-full h-[2px] opacity-20"
          style={{ backgroundColor: categoryColor || 'var(--primary)' }}
        />

        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Invoice01Icon} className="size-4" />
              </div>
              <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {storeName || "Unknown store"}
              </h3>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Calendar03Icon} className="size-3" />
                {formatDate(date)}
              </span>
              {categoryName && (
                <span className="flex items-center gap-1">
                  <div
                    className="size-2 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{ color: categoryColor || 'var(--primary)', backgroundColor: 'currentColor' }}
                  />
                  {categoryName}
                </span>
              )}
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            <p className="text-xl font-black tracking-tight">
              {formatCurrency(total, currency || "PLN")}
            </p>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-[10px] font-bold text-primary uppercase tracking-tighter animate-pulse-slow">
              <HugeiconsIcon icon={ZapIcon} className="size-2.5" />
              Verified
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
