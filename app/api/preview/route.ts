import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import decode from "heic-decode";

function isHeicFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let jpeg: Buffer;

    if (isHeicFile(file)) {
      // Decode HEIC to raw pixels, then encode as JPEG with sharp
      const { width, height, data } = await decode({ buffer });
      jpeg = await sharp(data, {
        raw: { width, height, channels: 4 },
      })
        .jpeg({ quality: 80 })
        .toBuffer();
    } else {
      jpeg = await sharp(buffer)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const base64 = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

    return NextResponse.json({ preview: base64 });
  } catch (error) {
    console.error("Preview generation error:", error instanceof Error ? error.message : error);
    console.error("Stack:", error instanceof Error ? error.stack : "N/A");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate preview" },
      { status: 500 }
    );
  }
}
