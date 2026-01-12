import { FatalError } from "workflow";
import {
  getServerSupabaseClient,
  updateReceiptStatus as dbUpdateReceiptStatus,
  updateReceipt,
  getReceiptSimple,
} from "@/lib/db";
import { extractReceiptData } from "@/lib/gemini";
import { deductCredit } from "@/lib/credits";

type ReceiptStatus = "pending" | "processing" | "completed" | "failed";

// Step: Update receipt status in database
async function updateReceiptStatus(
  receiptId: string,
  status: ReceiptStatus,
  errorMessage?: string
) {
  "use step";

  await dbUpdateReceiptStatus(receiptId, status, errorMessage);
}

// Step: Download image from Supabase Storage and convert to base64
async function loadImageAsBase64(
  imagePath: string
): Promise<{ base64: string; mimeType: string }> {
  "use step";

  // imagePath is like "receipts/uploads/filename.jpg"
  // Format: bucket/path - we need to split it
  const [bucket, ...pathParts] = imagePath.split("/");
  const storagePath = pathParts.join("/");

  const supabase = getServerSupabaseClient();

  // Download file from Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error) {
    throw new FatalError(`Failed to download image from storage: ${error.message}`);
  }

  if (!data) {
    throw new FatalError("No data returned from storage download");
  }

  // Convert Blob to base64
  const arrayBuffer = await data.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

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

  await updateReceipt(receiptId, {
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
    items: data.items.map((item) => ({
      name: item.name,
      inferredName: item.inferredName,
      productType: item.productType,
      boundingBox: item.boundingBox,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      discount: item.discount,
    })),
  });
}

// Step: Deduct credit after successful processing
async function deductCreditForReceipt(receiptId: string) {
  "use step";

  const receipt = await getReceiptSimple(receiptId);
  if (!receipt?.userId) {
    console.warn(`Receipt ${receiptId} has no userId, skipping credit deduction`);
    return;
  }

  await deductCredit(receipt.userId, 1, receiptId, "Receipt scan");
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

    // Load image from Supabase Storage
    const { base64, mimeType } = await loadImageAsBase64(imagePath);

    // Extract data with Gemini (automatic retries on transient failures)
    const extractedData = await extractDataFromImage(base64, mimeType);

    // Save to database
    await saveExtractedData(receiptId, extractedData);

    // Deduct credit after successful processing
    await deductCreditForReceipt(receiptId);

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
