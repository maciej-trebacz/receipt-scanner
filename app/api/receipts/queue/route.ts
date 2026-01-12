import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { processReceiptWorkflow } from "@/lib/workflows/process-receipt";
import { getServerSupabaseClient, createReceipt } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { requireAuth } from "@/lib/auth";
import { hasCredits } from "@/lib/credits";
import { validateFile, MAX_FILE_SIZE } from "@/lib/validations";

// Storage bucket name for receipt images
const STORAGE_BUCKET = "receipts";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Check if user has enough credits for all files
    const creditsNeeded = files.length;
    if (!(await hasCredits(userId, creditsNeeded))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: `You need at least ${creditsNeeded} credit${creditsNeeded > 1 ? "s" : ""} to scan ${creditsNeeded} receipt${creditsNeeded > 1 ? "s" : ""}`,
        },
        { status: 402 }
      );
    }

    // Validate all files first (type and size)
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `${file.name}: ${validation.error}` },
          { status: 400 }
        );
      }
    }

    const supabase = getServerSupabaseClient();

    const queuedReceipts: Array<{
      id: string;
      imagePath: string;
      filename: string;
    }> = [];

    for (const file of files) {
      // Generate unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${uuid()}-${Date.now()}.${ext}`;
      const storagePath = `uploads/${filename}`;

      // Upload file to Supabase Storage
      const bytes = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, Buffer.from(bytes), {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload file: ${file.name}` },
          { status: 500 }
        );
      }

      // Store the path in format: bucket/path (used to retrieve from storage)
      const imagePath = `${STORAGE_BUCKET}/${storagePath}`;
      const receiptId = uuid();

      // Create pending receipt record using centralized query function
      await createReceipt({
        id: receiptId,
        userId,
        imagePath: imagePath,
        total: 0, // Placeholder, will be updated by workflow
        status: "pending",
      });

      // Start workflow (fire-and-forget)
      await start(processReceiptWorkflow, [receiptId, imagePath]);

      queuedReceipts.push({
        id: receiptId,
        imagePath: imagePath,
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
