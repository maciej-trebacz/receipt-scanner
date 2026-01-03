"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ReceiptForm } from "@/components/receipt-form";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  Edit02Icon,
  Delete02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { use } from "react";

// Parse bounding box from JSON string to array
function parseBoundingBox(boxStr: string | null): [number, number, number, number] | null {
  if (!boxStr) return null;
  try {
    const parsed = JSON.parse(boxStr);
    if (Array.isArray(parsed) && parsed.length === 4) {
      return parsed as [number, number, number, number];
    }
  } catch {
    // Invalid JSON
  }
  return null;
}

interface ReceiptItem {
  id: string;
  name: string;
  inferredName: string | null;
  productType: string | null;
  boundingBox: string | null; // JSON string from DB
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  discount: number | null;
}

interface ReceiptDetail {
  id: string;
  storeName: string | null;
  storeAddress: string | null;
  date: Date | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number;
  imagePath: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  notes: string | null;
  items: ReceiptItem[];
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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Receipt not found");
        return res.json();
      })
      .then((data) => {
        setReceipt(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      const updated = await res.json();
      setReceipt(updated);
      setIsEditing(false);
    } catch (err) {
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/receipts");
    } catch (err) {
      alert("Failed to delete receipt");
      setIsDeleting(false);
    }
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const res = await fetch(`/api/receipts/${id}/reanalyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to re-analyze");
      }
      const updated = await res.json();
      setReceipt(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to re-analyze receipt");
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8">
          <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8 text-center">
          <p className="text-destructive">{error || "Receipt not found"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/receipts")}
          >
            Back to Receipts
          </Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container px-4 py-4">
            <h1 className="text-xl font-semibold">Edit Receipt</h1>
          </div>
        </header>
        <main className="container px-4 py-6">
          <ReceiptForm
            initialData={{
              storeName: receipt.storeName || "",
              storeAddress: receipt.storeAddress || "",
              date: receipt.date
                ? new Date(receipt.date).toISOString().split("T")[0]
                : "",
              currency: receipt.currency || "PLN",
              subtotal: receipt.subtotal,
              tax: receipt.tax,
              total: receipt.total,
              categoryId: receipt.categoryId || "",
              notes: receipt.notes || "",
              items: receipt.items.map((item) => ({
                name: item.name,
                inferredName: item.inferredName,
                productType: item.productType,
                boundingBox: item.boundingBox ? JSON.parse(item.boundingBox) : null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                discount: item.discount,
              })),
            }}
            onSubmit={handleSave}
            onCancel={() => setIsEditing(false)}
            isLoading={isSaving}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/receipts")}
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4 mr-1" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={`size-4 mr-1 ${isReanalyzing ? "animate-spin" : ""}`}
              />
              {isReanalyzing ? "Analyzing..." : "Re-analyze"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <HugeiconsIcon icon={Edit02Icon} className="size-4 mr-1" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <HugeiconsIcon icon={Delete02Icon} className="size-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the receipt and all its items.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Desktop: Split layout | Mobile: Stacked */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Receipt Image (sticky on desktop) */}
          {receipt.imagePath && (
            <div className="md:w-1/2 lg:w-2/5">
              <div className="md:sticky md:top-20">
                <Card>
                  <CardContent className="p-2">
                    <div ref={imageContainerRef} className="relative">
                      <img
                        src={`/api/image${receipt.imagePath}`}
                        alt="Receipt"
                        className="w-full object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {/* Bounding box overlay */}
                      {hoveredItemId && (() => {
                        const item = receipt.items.find(i => i.id === hoveredItemId);
                        const box = item ? parseBoundingBox(item.boundingBox) : null;
                        if (!box) return null;
                        // box is [ymin, xmin, ymax, xmax] in 0-1000 scale
                        const [ymin, xmin, ymax, xmax] = box;
                        return (
                          <div
                            className="absolute border-2 border-primary bg-primary/20 pointer-events-none transition-all duration-150"
                            style={{
                              top: `${ymin / 10}%`,
                              left: `${xmin / 10}%`,
                              width: `${(xmax - xmin) / 10}%`,
                              height: `${(ymax - ymin) / 10}%`,
                            }}
                          />
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Right: Receipt Data */}
          <div className={`flex-1 space-y-6 ${receipt.imagePath ? '' : 'max-w-2xl mx-auto'}`}>
            {/* Store Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {receipt.storeName || "Unknown Store"}
                    </h2>
                    {receipt.storeAddress && (
                      <p className="text-sm text-muted-foreground">
                        {receipt.storeAddress}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(receipt.date)}
                    </p>
                  </div>
                  {receipt.categoryName && (
                    <Badge
                      style={{
                        borderColor: receipt.categoryColor || undefined,
                        color: receipt.categoryColor || undefined,
                      }}
                    >
                      {receipt.categoryName}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            {receipt.items.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Items</h3>
                  <div className="space-y-2">
                    {receipt.items.map((item) => {
                      const hasBox = parseBoundingBox(item.boundingBox) !== null;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between py-2 border-b last:border-0 transition-colors ${
                            hasBox ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded' : ''
                          } ${hoveredItemId === item.id ? 'bg-primary/10' : ''}`}
                          onMouseEnter={() => hasBox && setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className="font-medium cursor-help"
                                title={item.name !== item.inferredName ? `Raw: ${item.name}` : undefined}
                              >
                                {item.inferredName || item.name}
                              </p>
                              {item.productType && (
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {item.productType}
                                </span>
                              )}
                            </div>
                            {item.quantity !== 1 && (
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} x{" "}
                                {item.unitPrice
                                  ? formatCurrency(item.unitPrice, receipt.currency || "PLN")
                                  : ""}
                              </p>
                            )}
                          </div>
                          <p className="font-medium">
                            {formatCurrency(item.totalPrice, receipt.currency || "PLN")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Totals */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {receipt.subtotal !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>
                        {formatCurrency(receipt.subtotal, receipt.currency || "PLN")}
                      </span>
                    </div>
                  )}
                  {receipt.tax !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>
                        {formatCurrency(receipt.tax, receipt.currency || "PLN")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>
                      {formatCurrency(receipt.total, receipt.currency || "PLN")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {receipt.notes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{receipt.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
