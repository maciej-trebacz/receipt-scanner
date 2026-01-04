import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { processReceiptWorkflow } from "@/lib/workflows/process-receipt";
import { db, receipts } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = "./data/uploads/receipts";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate all files first
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Invalid file type: ${file.name}. Allowed: JPEG, PNG, WebP, HEIC`,
          },
          { status: 400 }
        );
      }
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const queuedReceipts: Array<{
      id: string;
      imagePath: string;
      filename: string;
    }> = [];

    for (const file of files) {
      // Generate unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${uuid()}-${Date.now()}.${ext}`;
      const filepath = join(UPLOAD_DIR, filename);

      // Save file
      const bytes = await file.arrayBuffer();
      await writeFile(filepath, Buffer.from(bytes));

      const relativePath = `/uploads/receipts/${filename}`;
      const receiptId = uuid();
      const now = new Date();

      // Create pending receipt record
      await db.insert(receipts).values({
        id: receiptId,
        imagePath: relativePath,
        total: 0, // Placeholder, will be updated by workflow
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      // Start workflow (fire-and-forget)
      await start(processReceiptWorkflow, [receiptId, relativePath]);

      queuedReceipts.push({
        id: receiptId,
        imagePath: relativePath,
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
