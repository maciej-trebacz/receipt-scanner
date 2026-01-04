import { NextRequest } from "next/server";
import { db, receipts } from "@/lib/db";
import { inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return new Response("ids parameter required", { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean);

  if (ids.length === 0) {
    return new Response("ids parameter required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const previousStatuses: Record<string, string> = {};
      let closed = false;

      const checkStatus = async () => {
        if (closed) return;

        try {
          const results = await db
            .select({
              id: receipts.id,
              status: receipts.status,
              storeName: receipts.storeName,
              total: receipts.total,
              errorMessage: receipts.errorMessage,
              imagePath: receipts.imagePath,
            })
            .from(receipts)
            .where(inArray(receipts.id, ids));

          // Send updates for changed statuses
          for (const result of results) {
            if (previousStatuses[result.id] !== result.status) {
              previousStatuses[result.id] = result.status;
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(result)}\n\n`)
                );
              } catch {
                // Stream closed
                closed = true;
                return;
              }
            }
          }

          // Check if all are completed/failed
          const allDone = results.every(
            (r) => r.status === "completed" || r.status === "failed"
          );

          if (allDone) {
            try {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch {
              // Already closed
            }
            closed = true;
            return;
          }

          // Poll every 2 seconds
          setTimeout(checkStatus, 2000);
        } catch (error) {
          console.error("Stream error:", error);
          if (!closed) {
            try {
              controller.error(error);
            } catch {
              // Already closed
            }
            closed = true;
          }
        }
      };

      await checkStatus();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
