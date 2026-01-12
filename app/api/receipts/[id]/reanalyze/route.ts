import { NextRequest, NextResponse } from "next/server";
import { getReceiptSimple, updateReceiptStatus } from "@/lib/db/queries";
import { start } from "workflow/api";
import { processReceiptWorkflow } from "@/lib/workflows/process-receipt";
import { requireAuth } from "@/lib/auth";
import { hasCredits } from "@/lib/credits";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/receipts/[id]/reanalyze - Re-analyze receipt with Gemini (async via workflow)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    // Check credits
    if (!(await hasCredits(userId, 1))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "You need at least 1 credit to re-analyze a receipt",
        },
        { status: 402 }
      );
    }

    // Get the existing receipt
    const receipt = await getReceiptSimple(id);

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    if (!receipt.imagePath) {
      return NextResponse.json(
        { error: "Receipt has no image to analyze" },
        { status: 400 }
      );
    }

    // Mark as pending immediately
    await updateReceiptStatus(id, "pending", null);

    // Start the workflow (fire-and-forget)
    await start(processReceiptWorkflow, [id, receipt.imagePath]);

    // Return immediately - the workflow will process in the background
    return NextResponse.json({
      message: "Re-analysis started",
      receiptId: id,
      status: "pending",
    });
  } catch (error) {
    console.error("Error starting re-analysis:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start re-analysis",
      },
      { status: 500 }
    );
  }
}
