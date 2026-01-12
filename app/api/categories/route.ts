import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/categories - List all categories
export async function GET() {
  try {
    await requireAuth();
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
