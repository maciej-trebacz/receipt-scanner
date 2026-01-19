"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { CategoryPicker } from "./category-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  PlusSignIcon,
  Store01Icon,
  Invoice01Icon,
  Note01Icon,
  PercentIcon,
  Tag01Icon
} from "@hugeicons/core-free-icons";

interface ReceiptItem {
  name: string;
  inferredName: string | null;
  productType: string | null;
  boundingBox: [number, number, number, number] | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  discount: number | null;
}

interface ReceiptFormData {
  storeName: string;
  storeAddress: string;
  date: string;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  total: number;
  categoryId: string;
  notes: string;
  items: ReceiptItem[];
}

interface ReceiptFormProps {
  initialData?: Partial<ReceiptFormData>;
  onSubmit: (data: ReceiptFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ReceiptForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ReceiptFormProps) {
  const [formData, setFormData] = useState<ReceiptFormData>({
    storeName: initialData?.storeName || "",
    storeAddress: initialData?.storeAddress || "",
    date: initialData?.date || "",
    currency: initialData?.currency || "PLN",
    subtotal: initialData?.subtotal ?? null,
    tax: initialData?.tax ?? null,
    total: initialData?.total || 0,
    categoryId: initialData?.categoryId || "",
    notes: initialData?.notes || "",
    items: initialData?.items || [],
  });

  const handleChange = (
    field: keyof ReceiptFormData,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number | null
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { name: "", inferredName: null, productType: null, boundingBox: null, quantity: 1, unitPrice: null, totalPrice: 0, discount: null },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      posthog.capture("receipt_saved", {
        store_name: formData.storeName || "unknown",
        total_amount: formData.total,
        currency: formData.currency,
        item_count: formData.items.length,
        has_category: !!formData.categoryId,
      });
    } catch (err) {
      posthog.captureException(err);
      throw err;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Basic Info Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-primary-text">
          <HugeiconsIcon icon={Store01Icon} className="size-5" />
          <h3 className="text-sm font-black uppercase tracking-widest">Store & Date</h3>
        </div>

        <div className="glass-card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field>
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 block">Store Name</Label>
              <Input
                value={formData.storeName}
                onChange={(e) => handleChange("storeName", e.target.value)}
                placeholder="e.g., Apple Store"
                className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary transition-all px-4 font-medium"
              />
            </Field>
            <Field>
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 block">Address</Label>
              <Input
                value={formData.storeAddress}
                onChange={(e) => handleChange("storeAddress", e.target.value)}
                placeholder="e.g., 5th Ave, NY"
                className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary transition-all px-4 font-medium"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field>
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 block">Purchase Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary transition-all px-4 font-medium block w-full"
                />
              </div>
            </Field>
            <Field>
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 block">Spend Category</Label>
              <CategoryPicker
                value={formData.categoryId}
                onChange={(id) => handleChange("categoryId", id)}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Items Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-text">
            <HugeiconsIcon icon={Invoice01Icon} className="size-5" />
            <h3 className="text-sm font-black uppercase tracking-widest">Line Items</h3>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 text-xs font-black uppercase tracking-wider"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {formData.items.length === 0 ? (
            <div className="glass-card p-12 text-center border-dashed border-2">
              <p className="text-muted-foreground italic">No items identified yet.</p>
            </div>
          ) : (
            formData.items.map((item, index) => (
              <div key={index} className="glass-card p-5 group relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          value={item.inferredName ?? ""}
                          onChange={(e) => handleItemChange(index, "inferredName", e.target.value || null)}
                          placeholder="Item description"
                          className="h-10 rounded-lg bg-background/30 border-transparent focus:border-primary/30 font-bold"
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          value={item.productType ?? ""}
                          onChange={(e) => handleItemChange(index, "productType", e.target.value || null)}
                          placeholder="Type"
                          className="h-10 rounded-lg bg-background/30 border-transparent text-xs font-black uppercase tracking-widest text-center"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase ml-1">Qty</span>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                          className="h-10 rounded-lg bg-background/20 border-transparent text-center font-medium"
                          step={0.001}
                        />
                      </div>
                      <div className="space-y-1 text-center font-medium text-muted-foreground pt-4 select-none">×</div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase ml-1">Unit Price</span>
                        <Input
                          type="number"
                          value={item.unitPrice ?? ""}
                          onChange={(e) => handleItemChange(index, "unitPrice", e.target.value ? Number(e.target.value) : null)}
                          className="h-10 rounded-lg bg-background/20 border-transparent text-right font-medium"
                          step={0.01}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-primary-text uppercase ml-1">Total</span>
                        <Input
                          type="number"
                          value={item.totalPrice}
                          onChange={(e) => handleItemChange(index, "totalPrice", Number(e.target.value))}
                          className="h-10 rounded-lg bg-primary/10 border-transparent text-right font-black text-primary"
                          step={0.01}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="size-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 self-start"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Financials Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-primary-text">
          <HugeiconsIcon icon={Tag01Icon} className="size-5" />
          <h3 className="text-sm font-black uppercase tracking-widest">Financial Summary</h3>
        </div>

        <div className="glass-card p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Field>
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1 mb-2 block">Net Subtotal</Label>
              <Input
                type="number"
                value={formData.subtotal ?? ""}
                onChange={(e) => handleChange("subtotal", e.target.value ? Number(e.target.value) : null)}
                className="h-14 rounded-2xl bg-background/50 border-border/50 font-bold px-4"
                step={0.01}
              />
            </Field>
            <Field>
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1 mb-2 block flex items-center gap-1">
                <HugeiconsIcon icon={PercentIcon} className="size-3" />
                Tax Amount
              </Label>
              <Input
                type="number"
                value={formData.tax ?? ""}
                onChange={(e) => handleChange("tax", e.target.value ? Number(e.target.value) : null)}
                className="h-14 rounded-2xl bg-background/50 border-border/50 font-bold px-4"
                step={0.01}
              />
            </Field>
            <Field>
              <Label className="text-[10px] font-black uppercase tracking-wider text-primary-text ml-1 mb-2 block">Grand Total</Label>
              <Input
                type="number"
                value={formData.total}
                onChange={(e) => handleChange("total", Number(e.target.value))}
                className="h-14 rounded-2xl bg-primary/10 border-primary/30 font-black text-2xl text-primary px-4 shadow-[0_0_20px_var(--primary-foreground)]"
                step={0.01}
                required
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Notes Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-primary-text">
          <HugeiconsIcon icon={Note01Icon} className="size-5" />
          <h3 className="text-sm font-black uppercase tracking-widest">Additional Notes</h3>
        </div>
        <div className="glass-card p-6">
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Add any additional context or labels..."
            className="min-h-[120px] rounded-2xl bg-background/30 border-border/50 focus:border-primary p-4 resize-none leading-relaxed"
          />
        </div>
      </section>

      {/* Fixed Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 glass md:relative md:bottom-auto md:bg-transparent md:border-0 md:p-0 flex gap-4 z-40">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-14 glass text-foreground font-bold rounded-2xl active:scale-95 transition-all"
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="flex-[2] h-14 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-3"
          disabled={isLoading}
        >
          {isLoading && <HugeiconsIcon icon={PlusSignIcon} className="size-5 animate-spin" />}
          {isLoading ? "Finalizing..." : "Save Transaction"}
        </button>
      </div>
    </form>
  );
}
