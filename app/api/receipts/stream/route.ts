import { NextRequest } from "next/server";
import { db, receipts } from "@/lib/db";
import { inArray } from "drizzle-orm";

// SSE endpoint for real-time receipt status updates
// Clients pass receipt IDs they're interested in, we poll DB and push changes
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const idsParam = searchParams.get("ids");

  // Parse receipt IDs from query param
  const receiptIds = idsParam ? idsParam.split(",").filter(Boolean) : [];

  // Track last known statuses to detect changes
  const lastStatuses = new Map<string, string>();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Poll for changes every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          // If no specific IDs, check for any processing receipts
          const query =
            receiptIds.length > 0
              ? db
                  .select({ id: receipts.id, status: receipts.status })
                  .from(receipts)
                  .where(inArray(receipts.id, receiptIds))
              : db
                  .select({ id: receipts.id, status: receipts.status })
                  .from(receipts);

          const results = await query;

          // Check for status changes
          for (const receipt of results) {
            const lastStatus = lastStatuses.get(receipt.id);
            if (lastStatus !== undefined && lastStatus !== receipt.status) {
              // Status changed - send update
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "update",
                    receiptId: receipt.id,
                    status: receipt.status,
                  })}\n\n`
                )
              );
            }
            lastStatuses.set(receipt.id, receipt.status);
          }

          // If watching specific IDs and all are completed/failed, we can close
          if (receiptIds.length > 0) {
            const allDone = results.every(
              (r) => r.status === "completed" || r.status === "failed"
            );
            if (allDone && results.length === receiptIds.length) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "all_done" })}\n\n`
                )
              );
              clearInterval(pollInterval);
              controller.close();
              return;
            }
          }
        } catch (error) {
          console.error("SSE poll error:", error);
          // Don't close on transient errors, just skip this poll
        }
      }, 2000);

      // Keep connection alive with heartbeats
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Connection closed
          clearInterval(heartbeatInterval);
          clearInterval(pollInterval);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
