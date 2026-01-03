import { NextRequest, NextResponse } from "next/server";
import { db, receipts, receiptItems, categories } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/receipts/[id] - Get a single receipt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await db
      .select({
        id: receipts.id,
        storeName: receipts.storeName,
        storeAddress: receipts.storeAddress,
        date: receipts.date,
        currency: receipts.currency,
        subtotal: receipts.subtotal,
        tax: receipts.tax,
        total: receipts.total,
        imagePath: receipts.imagePath,
        rawText: receipts.rawText,
        categoryId: receipts.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        notes: receipts.notes,
        createdAt: receipts.createdAt,
        updatedAt: receipts.updatedAt,
      })
      .from(receipts)
      .leftJoin(categories, eq(receipts.categoryId, categories.id))
      .where(eq(receipts.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, id))
      .orderBy(receiptItems.sortOrder);

    return NextResponse.json({ ...result[0], items });
  } catch (error) {
    console.error("Error fetching receipt:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    );
  }
}

// PUT /api/receipts/[id] - Update a receipt
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      storeName,
      storeAddress,
      date,
      currency,
      subtotal,
      tax,
      total,
      categoryId,
      notes,
      items,
    } = body;

    // Check if receipt exists
    const existing = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Update receipt
    await db
      .update(receipts)
      .set({
        storeName,
        storeAddress,
        date: date ? new Date(date) : null,
        currency,
        subtotal,
        tax,
        total,
        categoryId: categoryId || null,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(receipts.id, id));

    // Update items if provided
    if (items !== undefined) {
      // Delete existing items
      await db.delete(receiptItems).where(eq(receiptItems.receiptId, id));

      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map((item: any, index: number) => ({
          id: uuid(),
          receiptId: id,
          name: item.name,
          inferredName: item.inferredName || null,
          productType: item.productType || null,
          boundingBox: item.boundingBox ? JSON.stringify(item.boundingBox) : null,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          discount: item.discount,
          sortOrder: index,
        }));

        await db.insert(receiptItems).values(itemsToInsert);
      }
    }

    // Fetch updated receipt
    const updated = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, id))
      .limit(1);

    const updatedItems = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, id));

    return NextResponse.json({ ...updated[0], items: updatedItems });
  } catch (error) {
    console.error("Error updating receipt:", error);
    return NextResponse.json(
      { error: "Failed to update receipt" },
      { status: 500 }
    );
  }
}

// DELETE /api/receipts/[id] - Delete a receipt
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Items will be cascade deleted
    await db.delete(receipts).where(eq(receipts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return NextResponse.json(
      { error: "Failed to delete receipt" },
      { status: 500 }
    );
  }
}
