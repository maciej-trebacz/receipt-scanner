import { NextRequest, NextResponse } from "next/server";
import { getReceiptsStatus } from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    const results = await getReceiptsStatus(ids);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
