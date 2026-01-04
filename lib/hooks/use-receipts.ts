"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface ReceiptListItem {
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

export interface ReceiptItem {
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

export interface ReceiptDetail {
  id: string;
  storeName: string | null;
  storeAddress: string | null;
  date: Date | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number;
  imagePath: string;
  receiptBoundingBox: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  notes: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string | null;
  items: ReceiptItem[];
}

// Query keys factory
export const receiptKeys = {
  all: ["receipts"] as const,
  lists: () => [...receiptKeys.all, "list"] as const,
  list: (filters: { categoryId?: string; limit?: number }) =>
    [...receiptKeys.lists(), filters] as const,
  details: () => [...receiptKeys.all, "detail"] as const,
  detail: (id: string) => [...receiptKeys.details(), id] as const,
};

// Fetch functions
async function fetchReceipts(params?: {
  categoryId?: string;
  limit?: number;
}): Promise<ReceiptListItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const res = await fetch(`/api/receipts?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch receipts");
  return res.json();
}

async function fetchReceipt(id: string): Promise<ReceiptDetail> {
  const res = await fetch(`/api/receipts/${id}`);
  if (!res.ok) throw new Error("Receipt not found");
  return res.json();
}

// Check if any receipts are still processing
function hasProcessingReceipts(receipts: ReceiptListItem[] | undefined): boolean {
  if (!receipts) return false;
  return receipts.some(
    (r) => r.status === "pending" || r.status === "processing"
  );
}

function isProcessing(receipt: ReceiptDetail | undefined): boolean {
  if (!receipt) return false;
  return receipt.status === "pending" || receipt.status === "processing";
}

// Hooks

/**
 * Hook for fetching receipt list with smart polling
 * Polls every 3s while any receipts are processing, stops when done
 */
export function useReceipts(params?: { categoryId?: string; limit?: number }) {
  return useQuery({
    queryKey: receiptKeys.list(params ?? {}),
    queryFn: () => fetchReceipts(params),
    // Poll only while receipts are processing
    refetchInterval: (query) => {
      return hasProcessingReceipts(query.state.data) ? 3000 : false;
    },
  });
}

/**
 * Hook for fetching single receipt with smart polling
 * Polls every 2s while processing, stops when completed/failed
 */
export function useReceipt(id: string) {
  return useQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: () => fetchReceipt(id),
    // Poll while receipt is processing
    refetchInterval: (query) => {
      return isProcessing(query.state.data) ? 2000 : false;
    },
  });
}

/**
 * Hook for updating a receipt
 */
export function useUpdateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/receipts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update receipt");
      return res.json();
    },
    onSuccess: (data, { id }) => {
      // Update the cache with the new data
      queryClient.setQueryData(receiptKeys.detail(id), data);
      // Invalidate the list to refetch
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a receipt
 */
export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete receipt");
      return res.json();
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: receiptKeys.detail(id) });
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
  });
}

/**
 * Hook for re-analyzing a receipt
 */
export function useReanalyzeReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/receipts/${id}/reanalyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to re-analyze");
      }
      return res.json();
    },
    onSuccess: (_, id) => {
      // Optimistically update the status to processing
      queryClient.setQueryData(
        receiptKeys.detail(id),
        (old: ReceiptDetail | undefined) => {
          if (!old) return old;
          return { ...old, status: "processing" as const };
        }
      );
      // Invalidate to trigger refetch (and start polling)
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
  });
}
