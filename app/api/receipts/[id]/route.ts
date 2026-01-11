import { NextRequest, NextResponse } from "next/server";
import {
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  receiptExists,
} from "@/lib/db/queries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/receipts/[id] - Get a single receipt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const receipt = await getReceiptById(id);

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    return NextResponse.json(receipt);
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
    const exists = await receiptExists(id);
    if (!exists) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Build update data (only include defined fields)
    const updateData: Parameters<typeof updateReceipt>[1] = {};

    if (storeName !== undefined) updateData.storeName = storeName;
    if (storeAddress !== undefined) updateData.storeAddress = storeAddress;
    if (date !== undefined) updateData.date = date ? new Date(date) : null;
    if (currency !== undefined) updateData.currency = currency;
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (tax !== undefined) updateData.tax = tax;
    if (total !== undefined) updateData.total = total;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (notes !== undefined) updateData.notes = notes;

    // Handle items if provided
    if (items !== undefined) {
      updateData.items = items.map((item: any) => ({
        name: item.name,
        inferredName: item.inferredName || null,
        productType: item.productType || null,
        boundingBox: item.boundingBox || null,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discount: item.discount,
      }));
    }

    // Update receipt and get the result
    const updated = await updateReceipt(id, updateData);

    return NextResponse.json(updated);
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

    // Check if receipt exists
    const exists = await receiptExists(id);
    if (!exists) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Delete receipt (items are cascade deleted in PostgreSQL)
    await deleteReceipt(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return NextResponse.json(
      { error: "Failed to delete receipt" },
      { status: 500 }
    );
  }
}
