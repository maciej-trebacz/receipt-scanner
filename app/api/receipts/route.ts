import { NextRequest, NextResponse } from "next/server";
import { listReceipts, createReceipt } from "@/lib/db/queries";
import { v4 as uuid } from "uuid";

// GET /api/receipts - List all receipts with pagination and date filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const cursor = searchParams.get("cursor"); // ISO date string for pagination
    const startDate = searchParams.get("startDate"); // ISO date string
    const endDate = searchParams.get("endDate"); // ISO date string

    const result = await listReceipts({
      categoryId,
      cursor,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

// POST /api/receipts - Create a new receipt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storeName,
      storeAddress,
      date,
      currency = "PLN",
      subtotal,
      tax,
      total,
      imagePath,
      rawText,
      categoryId,
      notes,
      items = [],
    } = body;

    if (!total || !imagePath) {
      return NextResponse.json(
        { error: "total and imagePath are required" },
        { status: 400 }
      );
    }

    const receiptId = uuid();

    // Create receipt with items (manual creation = completed status)
    const created = await createReceipt({
      id: receiptId,
      storeName,
      storeAddress,
      date: date ? new Date(date) : null,
      currency,
      subtotal,
      tax,
      total,
      imagePath,
      rawText,
      categoryId: categoryId || null,
      notes,
      status: "completed",
      items: items.map((item: any) => ({
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
