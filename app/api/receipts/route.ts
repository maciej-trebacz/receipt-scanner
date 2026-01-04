import { NextRequest, NextResponse } from "next/server";
import { db, receipts, receiptItems, categories } from "@/lib/db";
import { eq, desc, sql, and, lt, gte } from "drizzle-orm";
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

    // Build conditions array
    const conditions = [];

    if (categoryId) {
      conditions.push(eq(receipts.categoryId, categoryId));
    }

    // Cursor-based pagination: get receipts older than cursor
    if (cursor) {
      const cursorDate = new Date(cursor);
      conditions.push(lt(receipts.createdAt, cursorDate));
    }

    // Date range filtering (filter by receipt date, not createdAt)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(receipts.date, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lt(receipts.date, end));
    }

    // Build query - fetch limit + 1 to determine hasMore
    let query = db
      .select({
        id: receipts.id,
        storeName: receipts.storeName,
        date: receipts.date,
        total: receipts.total,
        currency: receipts.currency,
        imagePath: receipts.imagePath,
        categoryId: receipts.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        status: receipts.status,
        errorMessage: receipts.errorMessage,
        createdAt: receipts.createdAt,
      })
      .from(receipts)
      .leftJoin(categories, eq(receipts.categoryId, categories.id))
      .orderBy(
        // Processing/pending receipts first, then by date
        sql`CASE WHEN ${receipts.status} IN ('pending', 'processing') THEN 0 ELSE 1 END`,
        desc(receipts.createdAt)
      )
      .limit(limit + 1);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const result = await query;

    // Determine pagination info
    const hasMore = result.length > limit;
    const receiptsToReturn = hasMore ? result.slice(0, limit) : result;
    const lastReceipt = receiptsToReturn[receiptsToReturn.length - 1];

    return NextResponse.json({
      receipts: receiptsToReturn,
      nextCursor: hasMore && lastReceipt?.createdAt
        ? lastReceipt.createdAt.toISOString()
        : null,
      hasMore,
    });
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
    const now = new Date();

    // Create receipt (manual creation = completed status)
    await db.insert(receipts).values({
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
      createdAt: now,
      updatedAt: now,
    });

    // Create receipt items
    if (items.length > 0) {
      const itemsToInsert = items.map((item: any, index: number) => ({
        id: uuid(),
        receiptId,
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

    // Fetch the created receipt with items
    const created = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);

    const createdItems = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receiptId));

    return NextResponse.json(
      { ...created[0], items: createdItems },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating receipt:", error);
    return NextResponse.json(
      { error: "Failed to create receipt" },
      { status: 500 }
    );
  }
}
