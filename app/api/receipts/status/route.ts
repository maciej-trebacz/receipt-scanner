import { NextRequest, NextResponse } from "next/server";
import { db, receipts } from "@/lib/db";
import { inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    const results = await db
      .select({
        id: receipts.id,
        status: receipts.status,
        errorMessage: receipts.errorMessage,
        storeName: receipts.storeName,
        total: receipts.total,
        imagePath: receipts.imagePath,
      })
      .from(receipts)
      .where(inArray(receipts.id, ids));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
