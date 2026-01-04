"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Invoice01Icon, Calendar03Icon, ZapIcon, Loading03Icon, Cancel01Icon, Clock01Icon } from "@hugeicons/core-free-icons";

interface ReceiptCardProps {
  id: string;
  storeName: string | null;
  date: Date | null;
  total: number;
  currency: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  status?: string;
  errorMessage?: string | null;
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
  status = "completed",
  errorMessage,
}: ReceiptCardProps) {
  const isProcessing = status === "pending" || status === "processing";
  const isFailed = status === "failed";

  const content = (
    <div className={`glass-card p-5 relative overflow-hidden ${isProcessing ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-2 rounded-xl ${isFailed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {isProcessing ? (
                <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
              ) : isFailed ? (
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              ) : (
                <HugeiconsIcon icon={Invoice01Icon} className="size-4" />
              )}
            </div>
            <h3 className={`font-bold text-lg leading-tight truncate transition-colors ${isFailed ? "text-destructive" : "group-hover:text-primary"}`}>
              {isProcessing ? "Processing..." : isFailed ? "Failed" : storeName || "Unknown store"}
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            {status === "pending" && (
              <span className="flex items-center gap-1 text-amber-500">
                <HugeiconsIcon icon={Clock01Icon} className="size-3" />
                Queued
              </span>
            )}
            {status === "processing" && (
              <span className="flex items-center gap-1 text-blue-500">
                <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />
                Analyzing with AI...
              </span>
            )}
            {isFailed && (
              <span className="flex items-center gap-1 text-destructive" title={errorMessage || undefined}>
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                {errorMessage ? errorMessage.slice(0, 30) + (errorMessage.length > 30 ? "..." : "") : "Processing failed"}
              </span>
            )}
            {status === "completed" && (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1">
          {status === "completed" && (
            <p className="text-xl font-black tracking-tight">
              {formatCurrency(total, currency || "PLN")}
            </p>
          )}
          {isProcessing && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-500 uppercase tracking-tighter animate-pulse">
              <HugeiconsIcon icon={ZapIcon} className="size-2.5" />
              AI
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Don't link to detail page if still processing
  if (isProcessing) {
    return <div className="block">{content}</div>;
  }

  return (
    <Link href={`/receipts/${id}`} className="block group">
      {content}
    </Link>
  );
}
