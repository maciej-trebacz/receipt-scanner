"use client";

import { useState, useEffect } from "react";
import { ReceiptCard } from "./receipt-card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Invoice01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

interface Receipt {
  id: string;
  storeName: string | null;
  date: Date | null;
  total: number;
  currency: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  status: string;
  errorMessage?: string | null;
}

interface ReceiptListProps {
  categoryId?: string;
  limit?: number;
  refreshTrigger?: number;
}

export function ReceiptList({ categoryId, limit = 50, refreshTrigger }: ReceiptListProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (limit) params.set("limit", limit.toString());

    fetch(`/api/receipts?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setReceipts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [categoryId, limit, refreshTrigger]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-[100px] rounded-2xl bg-muted/30 animate-pulse border border-border/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 glass-card mx-auto max-w-sm">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon icon={Cancel01Icon} className="size-6" />
        </div>
        <h3 className="font-bold text-lg">Failed to load</h3>
        <p className="text-sm text-muted-foreground mt-1 px-6">{error}</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-20 glass-card mx-auto max-w-sm">
        <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 animate-float">
          <HugeiconsIcon icon={Invoice01Icon} className="size-10" />
        </div>
        <h3 className="font-black text-2xl tracking-tight">No receipts yet</h3>
        <p className="text-muted-foreground mt-2 px-8">
          Scan your first receipt to start tracking your expenses in style.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {receipts.map((receipt) => (
        <ReceiptCard
          key={receipt.id}
          id={receipt.id}
          storeName={receipt.storeName}
          date={receipt.date}
          total={receipt.total}
          currency={receipt.currency}
          categoryName={receipt.categoryName}
          categoryColor={receipt.categoryColor}
          status={receipt.status}
          errorMessage={receipt.errorMessage}
        />
      ))}
    </div>
  );
}
