"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiptCapture } from "@/components/receipt-capture";
import { ReceiptList } from "@/components/receipt-list";
import { ReceiptForm } from "@/components/receipt-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ExtractedReceipt } from "@/lib/gemini";

type AppState = "idle" | "capturing" | "reviewing" | "saving";

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<AppState>("idle");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceipt | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = (file: File) => {
    setCapturedFile(file);
    setError(null);
  };

  const handleScan = async () => {
    if (!capturedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      // Upload image
      const formData = new FormData();
      formData.append("file", capturedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image");
      }

      const { path } = await uploadRes.json();
      setUploadedPath(path);

      // Scan receipt
      const scanRes = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path }),
      });

      if (!scanRes.ok) {
        const errData = await scanRes.json();
        throw new Error(errData.error || "Failed to scan receipt");
      }

      const data = await scanRes.json();
      setExtractedData(data);
      setState("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReceipt = async (formData: any) => {
    if (!uploadedPath) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imagePath: uploadedPath,
          items: formData.items,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save receipt");
      }

      // Reset state and refresh
      resetState();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setState("idle");
    setCapturedFile(null);
    setUploadedPath(null);
    setExtractedData(null);
    setError(null);
  };

  // Reviewing extracted data
  if (state === "reviewing" && extractedData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Review Receipt</h1>
            <Button variant="ghost" size="sm" onClick={resetState}>
              Cancel
            </Button>
          </div>
        </header>
        <main className="container px-4 py-6">
          <ReceiptForm
            initialData={{
              storeName: extractedData.storeName || "",
              storeAddress: extractedData.storeAddress || "",
              date: extractedData.date || "",
              currency: extractedData.currency,
              subtotal: extractedData.subtotal,
              tax: extractedData.tax,
              total: extractedData.total,
              categoryId: "",
              notes: "",
              items: extractedData.items.map((item) => ({
                name: item.name,
                inferredName: item.inferredName,
                productType: item.productType,
                boundingBox: item.boundingBox,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                discount: item.discount,
              })),
            }}
            onSubmit={handleSaveReceipt}
            onCancel={resetState}
            isLoading={isLoading}
          />
        </main>
      </div>
    );
  }

  // Default: Home with capture + recent receipts
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container px-4 py-4">
          <h1 className="text-xl font-semibold">Receipt Scanner</h1>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Capture Section */}
        <section>
          <ReceiptCapture
            onCapture={handleCapture}
            onScan={handleScan}
            isLoading={isLoading}
          />
          {error && (
            <p className="text-sm text-destructive mt-2 text-center">{error}</p>
          )}
        </section>

        {/* Recent Receipts */}
        <section>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiptList limit={5} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
