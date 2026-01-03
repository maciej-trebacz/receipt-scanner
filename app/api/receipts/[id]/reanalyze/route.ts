import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { db, receipts, receiptItems } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { extractReceiptData } from "@/lib/gemini";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/receipts/[id]/reanalyze - Re-analyze receipt with Gemini
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

    // Read the image file
    const fullPath = join("./data", receipt.imagePath);
    let imageBuffer: Buffer;

    try {
      imageBuffer = await readFile(fullPath);
    } catch {
      return NextResponse.json(
        { error: "Receipt image not found on disk" },
        { status: 404 }
      );
    }

    // Convert to base64
    const base64 = imageBuffer.toString("base64");

    // Determine MIME type from extension
    const ext = receipt.imagePath.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
    };
    const mimeType = mimeTypes[ext || ""] || "image/jpeg";

    // Extract receipt data using Gemini
    const extractedData = await extractReceiptData(base64, mimeType);

    // Update receipt with extracted data
    await db
      .update(receipts)
      .set({
        storeName: extractedData.storeName,
        storeAddress: extractedData.storeAddress,
        date: extractedData.date ? new Date(extractedData.date) : null,
        currency: extractedData.currency,
        subtotal: extractedData.subtotal,
        tax: extractedData.tax,
        total: extractedData.total,
        updatedAt: new Date(),
      })
      .where(eq(receipts.id, id));

    // Delete existing items and insert new ones
    await db.delete(receiptItems).where(eq(receiptItems.receiptId, id));

    if (extractedData.items.length > 0) {
      const itemsToInsert = extractedData.items.map((item, index) => ({
        id: uuid(),
        receiptId: id,
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

    // Fetch and return the updated receipt with items
    const updated = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, id))
      .limit(1);

    const updatedItems = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, id))
      .orderBy(receiptItems.sortOrder);

    return NextResponse.json({ ...updated[0], items: updatedItems });
  } catch (error) {
    console.error("Error re-analyzing receipt:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to re-analyze receipt",
      },
      { status: 500 }
    );
  }
}
