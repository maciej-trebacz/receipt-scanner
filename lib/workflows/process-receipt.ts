import { FatalError } from "workflow";
import {
  getServerSupabaseClient,
  updateReceiptStatus as dbUpdateReceiptStatus,
  updateReceipt,
  getReceiptSimple,
} from "@/lib/db";
import { extractReceiptData } from "@/lib/gemini";
import { deductCredit } from "@/lib/credits";
import sharp from "sharp";
import decode from "heic-decode";

// Track events via PostHog HTTP API (avoids posthog-node ESM issues in workflow runtime)
async function trackEvent(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>
) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;

  try {
    await fetch("https://eu.i.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties,
      }),
    });
  } catch {
    // Don't fail workflow if analytics fails
  }
}

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

// Step: Download image from Supabase Storage, convert HEIC if needed, return as base64
async function loadImageAsBase64(
  imagePath: string
): Promise<{ base64: string; mimeType: string }> {
  "use step";

  const [bucket, ...pathParts] = imagePath.split("/");
  const storagePath = pathParts.join("/");

  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error) {
    throw new FatalError(`Failed to download image from storage: ${error.message}`);
  }

  if (!data) {
    throw new FatalError("No data returned from storage download");
  }

  const arrayBuffer = await data.arrayBuffer();
  const ext = imagePath.split(".").pop()?.toLowerCase();
  const isHeic = ext === "heic" || ext === "heif";

  let base64: string;
  let mimeType: string;

  if (isHeic) {
    const buffer = Buffer.from(arrayBuffer);
    const { width, height, data: pixels } = await decode({ buffer });
    const jpegBuffer = await sharp(pixels, {
      raw: { width, height, channels: 4 },
    })
      .jpeg({ quality: 90 })
      .toBuffer();
    base64 = jpegBuffer.toString("base64");
    mimeType = "image/jpeg";
  } else {
    base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    mimeType = mimeTypes[ext || ""] || "image/jpeg";
  }

  return { base64, mimeType };
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

// Step: Track completion event
async function trackCompletion(
  receiptId: string,
  data: { storeName: string | null; total: number | null }
) {
  "use step";

  const receipt = await getReceiptSimple(receiptId);
  if (!receipt?.userId) return;

  await trackEvent("receipt_processing_completed", receipt.userId, {
    receipt_id: receiptId,
    store_name: data.storeName,
    total_amount: data.total,
  });
}

// Step: Track failure event
async function trackFailure(receiptId: string, errorMessage: string) {
  "use step";

  const receipt = await getReceiptSimple(receiptId);
  if (!receipt?.userId) return;

  await trackEvent("receipt_processing_failed", receipt.userId, {
    receipt_id: receiptId,
    error_message: errorMessage,
  });
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

    // Track completion
    await trackCompletion(receiptId, {
      storeName: extractedData.storeName,
      total: extractedData.total,
    });

    return { success: true, receiptId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Mark as failed with error message
    await updateReceiptStatus(receiptId, "failed", errorMessage);

    // Track failure
    await trackFailure(receiptId, errorMessage);

    throw error; // Re-throw so workflow records the failure
  }
}
