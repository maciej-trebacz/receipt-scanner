import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { processReceiptWorkflow } from "@/lib/workflows/process-receipt";
import { createReceipt, updateReceiptStatus } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { requireAuthWithUser } from "@/lib/auth";
import { hasCredits } from "@/lib/credits";
import { z } from "zod";

const queueRequestSchema = z.object({
  storagePaths: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthWithUser();
    const body = await request.json();

    const parsed = queueRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request: storagePaths array required" },
        { status: 400 }
      );
    }

    const { storagePaths } = parsed.data;

    // Check if user has enough credits for all files
    const creditsNeeded = storagePaths.length;
    if (!(await hasCredits(userId, creditsNeeded))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: `You need at least ${creditsNeeded} credit${creditsNeeded > 1 ? "s" : ""} to scan ${creditsNeeded} receipt${creditsNeeded > 1 ? "s" : ""}`,
        },
        { status: 402 }
      );
    }

    const queuedReceipts: Array<{
      id: string;
      imagePath: string;
      filename: string;
    }> = [];

    for (const storagePath of storagePaths) {
      const receiptId = uuid();
      const filename = storagePath.split("/").pop() || storagePath;

      // Create pending receipt record
      await createReceipt({
        id: receiptId,
        userId,
        imagePath: storagePath,
        total: 0,
        status: "pending",
      });

      // Start workflow
      try {
        await start(processReceiptWorkflow, [receiptId, storagePath]);
      } catch (workflowError) {
        console.error("Failed to start workflow:", workflowError);
        await updateReceiptStatus(
          receiptId,
          "failed",
          workflowError instanceof Error ? workflowError.message : "Failed to start processing"
        );
        return NextResponse.json(
          { error: "Failed to start receipt processing" },
          { status: 500 }
        );
      }

      queuedReceipts.push({
        id: receiptId,
        imagePath: storagePath,
        filename,
      });
    }

    return NextResponse.json({
      message: `${queuedReceipts.length} receipt(s) queued for processing`,
      receipts: queuedReceipts,
    });
  } catch (error) {
    console.error("Queue error:", error);
    return NextResponse.json(
      { error: "Failed to queue receipts" },
      { status: 500 }
    );
  }
}
