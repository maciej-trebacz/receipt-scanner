import { NextRequest, NextResponse } from "next/server";
import { getReportsData, type Period } from "@/lib/reports";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "month";
    const offsetParam = searchParams.get("offset") || "0";

    // Validate period
    const validPeriods: Period[] = ["week", "month", "year", "all"];
    const period: Period = validPeriods.includes(periodParam as Period)
      ? (periodParam as Period)
      : "month";

    // Parse offset (only allow negative or zero, no future periods)
    const offset = Math.min(0, parseInt(offsetParam, 10) || 0);

    const data = await getReportsData(period, offset);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
