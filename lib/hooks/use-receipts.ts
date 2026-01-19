"use client";

import { useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/db/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

// Date range filter type
export interface DateRange {
  startDate: string | null; // ISO date string YYYY-MM-DD
  endDate: string | null;
}

// Paginated response type
export interface PaginatedReceiptsResponse {
  receipts: ReceiptListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Query keys factory
export const receiptKeys = {
  all: ["receipts"] as const,
  lists: () => [...receiptKeys.all, "list"] as const,
  list: (filters: { categoryId?: string; limit?: number }) =>
    [...receiptKeys.lists(), filters] as const,
  infinite: (filters: { categoryId?: string; limit?: number; dateRange?: DateRange }) =>
    [...receiptKeys.lists(), "infinite", filters] as const,
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
  const data = await res.json();
  // Handle both old array format and new paginated format
  return Array.isArray(data) ? data : data.receipts;
}

async function fetchReceiptsPaginated(params: {
  categoryId?: string;
  limit?: number;
  cursor?: string;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<PaginatedReceiptsResponse> {
  const searchParams = new URLSearchParams();
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.cursor) searchParams.set("cursor", params.cursor);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const res = await fetch(`/api/receipts?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch receipts");
  return res.json();
}

async function fetchReceipt(id: string): Promise<ReceiptDetail> {
  const res = await fetch(`/api/receipts/${id}`);
  if (!res.ok) throw new Error("Receipt not found");
  return res.json();
}

// Supabase Realtime subscription hook

/**
 * Hook that subscribes to Supabase Realtime for receipt changes.
 * Automatically invalidates React Query cache when receipts are inserted, updated, or deleted.
 *
 * @param options.receiptId - Optional specific receipt ID to watch
 * @param options.enabled - Whether to enable the subscription (default: true)
 */
export function useReceiptRealtimeSubscription(options?: {
  receiptId?: string;
  enabled?: boolean;
}) {
  const { receiptId, enabled = true } = options ?? {};
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create Supabase client if not already created
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserSupabaseClient();
    }

    const supabase = supabaseRef.current;
    const channelName = receiptId ? `receipt-${receiptId}` : "receipts-all";

    // Build the channel subscription
    let channel = supabase.channel(channelName);

    if (receiptId) {
      // Subscribe to changes for a specific receipt
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receipts",
          filter: `id=eq.${receiptId}`,
        },
        (payload) => {
          console.log("[Realtime] Receipt change:", payload.eventType, payload.new);

          // Invalidate the specific receipt detail query
          queryClient.invalidateQueries({
            queryKey: receiptKeys.detail(receiptId),
          });

          // Also invalidate lists in case status changed
          queryClient.invalidateQueries({
            queryKey: receiptKeys.lists(),
          });
        }
      );
    } else {
      // Subscribe to all receipt changes
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receipts",
        },
        (payload) => {
          console.log("[Realtime] Receipt change:", payload.eventType, payload.new);

          const newData = payload.new as { id?: string } | undefined;

          // Invalidate all receipt lists
          queryClient.invalidateQueries({
            queryKey: receiptKeys.lists(),
          });

          // If we have the receipt ID, also invalidate its detail query
          if (newData?.id) {
            queryClient.invalidateQueries({
              queryKey: receiptKeys.detail(newData.id),
            });
          }
        }
      );
    }

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] Subscribed to ${channelName}`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[Realtime] Channel error for ${channelName}`);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] Unsubscribing from ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, receiptId, queryClient]);
}

// Hooks

/**
 * Hook for fetching receipt list with Supabase Realtime updates.
 * Subscribes to real-time changes instead of polling.
 */
export function useReceipts(params?: { categoryId?: string; limit?: number }) {
  // Subscribe to realtime updates for all receipts
  useReceiptRealtimeSubscription();

  return useQuery({
    queryKey: receiptKeys.list(params ?? {}),
    queryFn: () => fetchReceipts(params),
  });
}

/**
 * Hook for fetching receipts with infinite scroll and date filtering.
 * Subscribes to Supabase Realtime for instant updates.
 */
export function useInfiniteReceipts(params?: {
  categoryId?: string;
  limit?: number;
  dateRange?: DateRange;
}) {
  const limit = params?.limit ?? 20;

  // Subscribe to realtime updates for all receipts
  useReceiptRealtimeSubscription();

  return useInfiniteQuery({
    queryKey: receiptKeys.infinite(params ?? {}),
    queryFn: ({ pageParam }) =>
      fetchReceiptsPaginated({
        categoryId: params?.categoryId,
        limit,
        cursor: pageParam,
        startDate: params?.dateRange?.startDate,
        endDate: params?.dateRange?.endDate,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * Hook for fetching single receipt with Supabase Realtime updates.
 * Subscribes to real-time changes for the specific receipt.
 */
export function useReceipt(id: string) {
  // Subscribe to realtime updates for this specific receipt
  useReceiptRealtimeSubscription({ receiptId: id });

  return useQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: () => fetchReceipt(id),
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
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to update receipt");
      }
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
      // Invalidate to trigger refetch (realtime will handle further updates)
      queryClient.invalidateQueries({ queryKey: receiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
    },
  });
}
