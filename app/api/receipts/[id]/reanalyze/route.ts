import { NextRequest, NextResponse } from "next/server";
import { db, receipts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { processReceiptWorkflow } from "@/lib/workflows/process-receipt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/receipts/[id]/reanalyze - Re-analyze receipt with Gemini (async via workflow)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the existing receipt
    const existing = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = existing[0];

    if (!receipt.imagePath) {
      return NextResponse.json(
        { error: "Receipt has no image to analyze" },
        { status: 400 }
      );
    }

    // Mark as pending immediately
    await db
      .update(receipts)
      .set({
        status: "pending",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(receipts.id, id));

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
