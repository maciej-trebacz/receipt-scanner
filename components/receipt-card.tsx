"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <Link href={`/receipts/${id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">
                {storeName || "Unknown store"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(date)}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="font-semibold">
                {formatCurrency(total, currency || "PLN")}
              </p>
              {categoryName && (
                <Badge
                  variant="outline"
                  className="mt-1"
                  style={{
                    borderColor: categoryColor || undefined,
                    color: categoryColor || undefined,
                  }}
                >
                  {categoryName}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
