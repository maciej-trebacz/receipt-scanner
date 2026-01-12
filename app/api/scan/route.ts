import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { extractReceiptData } from "@/lib/gemini";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { imagePath } = body;

    if (!imagePath) {
      return NextResponse.json(
        { error: "imagePath is required" },
        { status: 400 }
      );
    }

    // Read the image file
    const fullPath = join("./data", imagePath);
    let imageBuffer: Buffer;

    try {
      imageBuffer = await readFile(fullPath);
    } catch {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Convert to base64
    const base64 = imageBuffer.toString("base64");

    // Determine MIME type from extension
    const ext = imagePath.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
    };
    const mimeType = mimeTypes[ext || ""] || "image/jpeg";

    // Extract receipt data using Gemini
    const extractedData = await extractReceiptData(base64, mimeType);

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to scan receipt",
      },
      { status: 500 }
    );
  }
}
