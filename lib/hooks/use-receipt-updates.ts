"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { receiptKeys } from "./use-receipts";

interface SSEMessage {
  type: "connected" | "update" | "all_done";
  receiptId?: string;
  status?: string;
}

/**
 * Hook that subscribes to SSE for real-time receipt updates
 * Automatically invalidates queries when receipts change status
 *
 * @param receiptIds - Optional array of specific receipt IDs to watch.
 *                     If empty, watches all receipts.
 * @param enabled - Whether to enable the SSE connection (default: true)
 */
export function useReceiptUpdates(receiptIds?: string[], enabled = true) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Build URL with optional IDs
    const url = receiptIds?.length
      ? `/api/receipts/stream?ids=${receiptIds.join(",")}`
      : "/api/receipts/stream";

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            console.log("[SSE] Connected to receipt updates");
            break;

          case "update":
            console.log(`[SSE] Receipt ${data.receiptId} -> ${data.status}`);
            // Invalidate the specific receipt
            if (data.receiptId) {
              queryClient.invalidateQueries({
                queryKey: receiptKeys.detail(data.receiptId),
              });
            }
            // Also invalidate lists
            queryClient.invalidateQueries({
              queryKey: receiptKeys.lists(),
            });
            break;

          case "all_done":
            console.log("[SSE] All watched receipts completed");
            // Connection will close automatically
            break;
        }
      } catch (error) {
        console.error("[SSE] Failed to parse message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[SSE] Connection error:", error);
      // EventSource will auto-reconnect
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [enabled, receiptIds?.join(","), queryClient]);
}

/**
 * Hook that watches for any processing receipts and enables SSE accordingly
 * Use this at a high level (e.g., in a layout) for automatic real-time updates
 */
export function useAutoReceiptUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if we have any processing receipts in the cache
    const checkForProcessing = () => {
      const queries = queryClient.getQueriesData({ queryKey: receiptKeys.all });

      for (const [, data] of queries) {
        if (Array.isArray(data)) {
          // List data
          const hasProcessing = data.some(
            (r: any) => r.status === "pending" || r.status === "processing"
          );
          if (hasProcessing) return true;
        } else if (data && typeof data === "object" && "status" in data) {
          // Single receipt data
          const status = (data as any).status;
          if (status === "pending" || status === "processing") return true;
        }
      }
      return false;
    };

    // We don't actually need to use SSE here if we're already doing smart polling
    // This hook is for cases where you want pure SSE without polling
    // For now, just log when processing receipts are detected
    if (checkForProcessing()) {
      console.log("[SSE] Processing receipts detected, polling enabled");
    }
  }, [queryClient]);
}
