"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPicker } from "./category-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

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
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              value={formData.storeName}
              onChange={(e) => handleChange("storeName", e.target.value)}
              placeholder="e.g., Biedronka"
            />
          </Field>
          <Field>
            <Label htmlFor="storeAddress">Address</Label>
            <Input
              id="storeAddress"
              value={formData.storeAddress}
              onChange={(e) => handleChange("storeAddress", e.target.value)}
              placeholder="e.g., ul. Marszałkowska 1"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="category">Category</Label>
              <CategoryPicker
                value={formData.categoryId}
                onChange={(id) => handleChange("categoryId", id)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items added yet
            </p>
          ) : (
            formData.items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.inferredName ?? ""}
                      onChange={(e) =>
                        handleItemChange(index, "inferredName", e.target.value || null)
                      }
                      placeholder="Item name"
                      className="flex-1"
                    />
                    <Input
                      value={item.productType ?? ""}
                      onChange={(e) =>
                        handleItemChange(index, "productType", e.target.value || null)
                      }
                      placeholder="Type"
                      className="w-24"
                    />
                  </div>
                  {item.name && item.name !== item.inferredName && (
                    <p className="text-xs text-muted-foreground px-1" title="Raw name from receipt">
                      Raw: {item.name}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", Number(e.target.value))
                      }
                      placeholder="Qty"
                      min={0.001}
                      step={0.001}
                    />
                    <Input
                      type="number"
                      value={item.unitPrice ?? ""}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "unitPrice",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="Unit price"
                      min={0}
                      step={0.01}
                    />
                    <Input
                      type="number"
                      value={item.totalPrice}
                      onChange={(e) =>
                        handleItemChange(index, "totalPrice", Number(e.target.value))
                      }
                      placeholder="Total"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(index)}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field>
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                value={formData.subtotal ?? ""}
                onChange={(e) =>
                  handleChange(
                    "subtotal",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </Field>
            <Field>
              <Label htmlFor="tax">Tax</Label>
              <Input
                id="tax"
                type="number"
                value={formData.tax ?? ""}
                onChange={(e) =>
                  handleChange("tax", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </Field>
            <Field>
              <Label htmlFor="total">Total *</Label>
              <Input
                id="total"
                type="number"
                value={formData.total}
                onChange={(e) => handleChange("total", Number(e.target.value))}
                placeholder="0.00"
                min={0}
                step={0.01}
                required
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Add any notes..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Receipt"}
        </Button>
      </div>
    </form>
  );
}
