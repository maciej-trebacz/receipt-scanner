import { FatalError } from "workflow";
import { db, receipts, receiptItems } from "@/lib/db";
import { extractReceiptData } from "@/lib/gemini";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";

type ReceiptStatus = "pending" | "processing" | "completed" | "failed";

// Step: Update receipt status in database
async function updateReceiptStatus(
  receiptId: string,
  status: ReceiptStatus,
  errorMessage?: string
) {
  "use step";

  await db
    .update(receipts)
    .set({
      status,
      errorMessage: errorMessage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(receipts.id, receiptId));
}

// Step: Read image file and convert to base64
async function loadImageAsBase64(
  imagePath: string
): Promise<{ base64: string; mimeType: string }> {
  "use step";

  // imagePath is like "/uploads/receipts/filename.jpg"
  const fullPath = join("./data", imagePath);
  const imageBuffer = await readFile(fullPath);
  const base64 = imageBuffer.toString("base64");

  const ext = imagePath.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };

  return {
    base64,
    mimeType: mimeTypes[ext || ""] || "image/jpeg",
  };
}

// Step: Call Gemini API to extract data (auto-retries on failure)
async function extractDataFromImage(base64: string, mimeType: string) {
  "use step";

  try {
    return await extractReceiptData(base64, mimeType);
  } catch (error) {
    // If Gemini API key is not configured, don't retry
    if (error instanceof Error && error.message.includes("not configured")) {
      throw new FatalError(error.message);
    }
    // Other errors will be retried automatically
    throw error;
  }
}

// Step: Save extracted data to database
async function saveExtractedData(
  receiptId: string,
  data: Awaited<ReturnType<typeof extractReceiptData>>
) {
  "use step";

  // Update receipt with extracted data
  await db
    .update(receipts)
    .set({
      storeName: data.storeName,
      storeAddress: data.storeAddress,
      date: data.date ? new Date(data.date) : null,
      currency: data.currency,
      receiptBoundingBox: data.receiptBoundingBox
        ? JSON.stringify(data.receiptBoundingBox)
        : null,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(receipts.id, receiptId));

  // Delete any existing items (in case of retry)
  await db.delete(receiptItems).where(eq(receiptItems.receiptId, receiptId));

  // Insert new items
  if (data.items.length > 0) {
    const itemsToInsert = data.items.map((item, index) => ({
      id: uuid(),
      receiptId,
      name: item.name,
      inferredName: item.inferredName,
      productType: item.productType,
      boundingBox: item.boundingBox ? JSON.stringify(item.boundingBox) : null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      discount: item.discount,
      sortOrder: index,
    }));

    await db.insert(receiptItems).values(itemsToInsert);
  }
}

// Main workflow orchestrator
export async function processReceiptWorkflow(
  receiptId: string,
  imagePath: string
) {
  "use workflow";

  try {
    // Mark as processing
    await updateReceiptStatus(receiptId, "processing");

    // Load image from disk
    const { base64, mimeType } = await loadImageAsBase64(imagePath);

    // Extract data with Gemini (automatic retries on transient failures)
    const extractedData = await extractDataFromImage(base64, mimeType);

    // Save to database
    await saveExtractedData(receiptId, extractedData);

    return { success: true, receiptId };
  } catch (error) {
    // Mark as failed with error message
    await updateReceiptStatus(
      receiptId,
      "failed",
      error instanceof Error ? error.message : "Unknown error"
    );

    throw error; // Re-throw so workflow records the failure
  }
}
