"use client";

import { useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/db/supabase";
import { receiptKeys } from "./use-receipts";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Type for cache data that could be a receipt list or single receipt
interface CacheReceipt {
  status?: string;
}

/**
 * Hook that subscribes to Supabase Realtime for real-time receipt updates.
 * Automatically invalidates queries when receipts change status.
 *
 * @param receiptIds - Optional array of specific receipt IDs to watch.
 *                     If empty, watches all receipts.
 * @param enabled - Whether to enable the Realtime connection (default: true)
 */
export function useReceiptUpdates(receiptIds?: string[], enabled = true) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  // Create a stable dependency key for receiptIds
  const receiptIdsKey = useMemo(
    () => (receiptIds?.length ? receiptIds.join(",") : ""),
    [receiptIds]
  );

  useEffect(() => {
    if (!enabled) return;

    // Create Supabase client if not already created
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserSupabaseClient();
    }

    const supabase = supabaseRef.current;

    // Build channel name based on watched IDs
    const channelName = receiptIdsKey
      ? `receipt-updates-${receiptIdsKey.substring(0, 50)}`
      : "receipt-updates-all";

    // Build the channel subscription
    let channel = supabase.channel(channelName);

    // Parse receipt IDs from key for subscription
    const idsToWatch = receiptIdsKey ? receiptIdsKey.split(",") : [];

    if (idsToWatch.length > 0) {
      // Subscribe to changes for specific receipts
      // Use a filter for each receipt ID
      for (const receiptId of idsToWatch) {
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "receipts",
            filter: `id=eq.${receiptId}`,
          },
          (payload) => {
            const newData = payload.new as { id?: string; status?: string } | undefined;
            console.log(`[Realtime] Receipt ${newData?.id} -> ${newData?.status}`);

            // Invalidate the specific receipt
            if (newData?.id) {
              queryClient.invalidateQueries({
                queryKey: receiptKeys.detail(newData.id),
              });
            }

            // Also invalidate lists
            queryClient.invalidateQueries({
              queryKey: receiptKeys.lists(),
            });
          }
        );
      }
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
          const newData = payload.new as { id?: string; status?: string } | undefined;
          console.log(`[Realtime] Receipt ${newData?.id} -> ${newData?.status}`);

          // Invalidate all lists
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
        console.log(`[Realtime] Connected to receipt updates (${channelName})`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[Realtime] Connection error for ${channelName}`);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] Disconnecting from ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, receiptIdsKey, queryClient]);
}

/**
 * Hook that watches for any processing receipts and enables Realtime accordingly.
 * Use this at a high level (e.g., in a layout) for automatic real-time updates.
 *
 * This hook checks if there are any pending/processing receipts in the cache
 * and logs status information. The actual real-time updates are handled by
 * Supabase Realtime subscriptions in the useReceiptUpdates hook.
 */
export function useAutoReceiptUpdates() {
  const queryClient = useQueryClient();

  // Always subscribe to realtime updates for all receipts
  useReceiptUpdates(undefined, true);

  useEffect(() => {
    // Check if we have any processing receipts in the cache
    const checkForProcessing = () => {
      const queries = queryClient.getQueriesData({ queryKey: receiptKeys.all });

      for (const [, data] of queries) {
        if (Array.isArray(data)) {
          // List data
          const hasProcessing = data.some(
            (r: CacheReceipt) => r.status === "pending" || r.status === "processing"
          );
          if (hasProcessing) return true;
        } else if (data && typeof data === "object" && "status" in data) {
          // Single receipt data
          const status = (data as CacheReceipt).status;
          if (status === "pending" || status === "processing") return true;
        }
      }
      return false;
    };

    // Log when processing receipts are detected
    if (checkForProcessing()) {
      console.log("[Realtime] Processing receipts detected, subscription active");
    }
  }, [queryClient]);
}
