import { NextRequest, NextResponse } from "next/server";
import { getReportsData, type Period } from "@/lib/reports";
import { requireAuth } from "@/lib/auth";
import { reportParamsSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);

    // Validate params
    const result = reportParamsSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { period, offset } = result.data;

    // Only allow negative or zero offset (no future periods)
    const safeOffset = Math.min(0, offset);

    const data = await getReportsData(period as Period, safeOffset);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
