"use client";

import { useState, useEffect } from "react";
import { ReceiptCard } from "./receipt-card";

interface Receipt {
  id: string;
  storeName: string | null;
  date: Date | null;
  total: number;
  currency: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
}

interface ReceiptListProps {
  categoryId?: string;
  limit?: number;
}

export function ReceiptList({ categoryId, limit = 50 }: ReceiptListProps) {
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
  }, [categoryId, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error loading receipts: {error}</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No receipts yet</p>
        <p className="text-sm mt-1">Scan your first receipt to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
        />
      ))}
    </div>
  );
}
