import { NextRequest, NextResponse } from "next/server";
import { listReceipts, createReceipt } from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { paginationSchema, receiptWithItemsSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/receipts - List all receipts with pagination and date filtering
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);

    // Validate pagination params
    const result = paginationSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, cursor, categoryId, startDate, endDate } = result.data;

    const receipts = await listReceipts({
      userId,
      categoryId,
      cursor,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

// Extended schema for POST that requires imagePath
const createReceiptSchema = receiptWithItemsSchema.extend({
  imagePath: z.string().min(1),
  rawText: z.string().optional().nullable(),
});

// POST /api/receipts - Create a new receipt
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    // Validate input
    const result = createReceiptSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const {
      storeName,
      storeAddress,
      date,
      currency,
      subtotal,
      tax,
      total,
      imagePath,
      rawText,
      categoryId,
      notes,
      items,
    } = result.data;

    const receiptId = uuid();

    // Create receipt with items (manual creation = completed status)
    const created = await createReceipt({
      id: receiptId,
      userId,
      storeName,
      storeAddress,
      date: date ?? null,
      currency,
      subtotal,
      tax,
      total,
      imagePath,
      rawText,
      categoryId: categoryId || null,
      notes,
      status: "completed",
      items: items?.map((item) => ({
        name: item.name,
        inferredName: item.inferredName || null,
        productType: item.productType || null,
        boundingBox: item.boundingBox || null,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discount: item.discount,
      })),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating receipt:", error);
    return NextResponse.json(
      { error: "Failed to create receipt" },
      { status: 500 }
    );
  }
}
