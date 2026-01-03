"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  Store01Icon,
  Location01Icon,
  Calendar03Icon,
  PackageIcon,
  Note01Icon,
} from "@hugeicons/core-free-icons";
import { use } from "react";
import { cn } from "@/lib/utils";

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
  boundingBox: string | null;
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
      <div className="min-h-screen">
        <div className="container px-6 py-12 flex flex-col items-center">
          <div className="size-20 rounded-full border-4 border-primary border-t-transparent animate-spin mb-8" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading receipt details...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-12 text-center max-w-md">
          <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-6">
            <HugeiconsIcon icon={Delete02Icon} className="size-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">Oops!</h2>
          <p className="text-muted-foreground mb-8">
            {error || "We couldn't find the receipt you're looking for."}
          </p>
          <Button
            onClick={() => router.push("/receipts")}
            className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl"
          >
            Back to Receipts
          </Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 glass">
          <div className="container px-6 py-6 border-b border-border/50">
            <h1 className="text-2xl font-black tracking-tight">Edit Transaction</h1>
          </div>
        </header>
        <main className="container px-6 py-8 pb-32">
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass backdrop-blur-2xl">
        <div className="container px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => router.push("/receipts")}
            className="size-10 rounded-xl bg-background/50 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all active:scale-95"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 stroke-[2.5]" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="size-10 rounded-xl bg-background/50 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
              title="Re-analyze"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={cn("size-5 stroke-[2.5]", isReanalyzing && "animate-spin")}
              />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="size-10 rounded-xl bg-background/50 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all active:scale-95"
              title="Edit"
            >
              <HugeiconsIcon icon={Edit02Icon} className="size-5 stroke-[2.5]" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="size-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                  disabled={isDeleting}
                  title="Delete"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-5 stroke-[2.5]" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-border/50 rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black">Delete Receipt?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This action is permanent. All associated items and data will be removed from your records.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="rounded-2xl h-12 font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="rounded-2xl h-12 bg-destructive text-destructive-foreground font-black uppercase tracking-widest">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: Receipt Image */}
          {receipt.imagePath && (
            <div className="lg:w-[450px] shrink-0">
              <div className="lg:sticky lg:top-28">
                <div className="glass-card p-3 rounded-[2.5rem] shadow-2xl relative group">
                  <div ref={imageContainerRef} className="relative overflow-hidden rounded-[2rem]">
                    <img
                      src={`/api/image${receipt.imagePath}`}
                      alt="Receipt"
                      className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.style.display = "none";
                      }}
                    />

                    {/* Bounding box overlay with glow */}
                    {hoveredItemId && (() => {
                      const item = receipt.items.find(i => i.id === hoveredItemId);
                      const box = item ? parseBoundingBox(item.boundingBox) : null;
                      if (!box) return null;
                      const [ymin, xmin, ymax, xmax] = box;
                      return (
                        <div
                          className="absolute border-2 border-primary bg-primary/20 pointer-events-none transition-all duration-300 shadow-[0_0_20px_var(--primary)]"
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
                </div>
              </div>
            </div>
          )}

          {/* Right: Receipt Data */}
          <div className="flex-1 space-y-8">
            {/* Summary Card */}
            <div className="glass-card p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-border/50">
                <div className="flex items-start gap-5">
                  <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Store01Icon} className="size-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight leading-none mb-2">
                      {receipt.storeName || "Unknown Store"}
                    </h2>
                    <div className="flex flex-col gap-1">
                      {receipt.storeAddress && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <HugeiconsIcon icon={Location01Icon} className="size-3.5" />
                          {receipt.storeAddress}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                        <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" />
                        {formatDate(receipt.date)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Total Amount</p>
                  <p className="text-4xl font-black tracking-tighter text-glow">
                    {formatCurrency(receipt.total, receipt.currency || "PLN")}
                  </p>
                </div>
              </div>

              {/* Items List */}
              {receipt.items.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Purchased Items</h3>
                  <div className="grid gap-2">
                    {receipt.items.map((item) => {
                      const hasBox = parseBoundingBox(item.boundingBox) !== null;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl glass transition-all duration-300 border-transparent",
                            hasBox && "cursor-pointer hover:border-primary/30 hover:bg-primary/5 hover:translate-x-1",
                            hoveredItemId === item.id && "border-primary/50 bg-primary/10 translate-x-1"
                          )}
                          onMouseEnter={() => hasBox && setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                              <HugeiconsIcon icon={PackageIcon} className="size-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold leading-tight">
                                  {item.inferredName || item.name}
                                </p>
                                {item.productType && (
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded-md">
                                    {item.productType}
                                  </span>
                                )}
                              </div>
                              {item.quantity !== 1 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.quantity} × {item.unitPrice ? formatCurrency(item.unitPrice, receipt.currency || "PLN") : "-"}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="font-black text-lg">
                            {formatCurrency(item.totalPrice, receipt.currency || "PLN")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Breakdown */}
              <div className="mt-10 pt-8 border-t border-border/50 space-y-3">
                {receipt.subtotal !== null && (
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(receipt.subtotal, receipt.currency || "PLN")}</span>
                  </div>
                )}
                {receipt.tax !== null && (
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(receipt.tax, receipt.currency || "PLN")}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg font-black uppercase tracking-widest text-primary">Final Price</span>
                  <span className="text-2xl font-black">{formatCurrency(receipt.total, receipt.currency || "PLN")}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {receipt.notes && (
              <div className="glass-card p-6">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
                  <HugeiconsIcon icon={Note01Icon} className="size-4" />
                  General Notes
                </h3>
                <p className="text-muted-foreground leading-relaxed italic">
                  "{receipt.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
