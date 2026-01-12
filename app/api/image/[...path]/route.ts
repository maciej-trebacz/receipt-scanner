import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServerSupabaseClient } from "@/lib/db";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { path } = await params;
    const fullPath = path.join("/");

    // Security: prevent directory traversal
    if (fullPath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Path format: bucket/uploads/filename.ext (e.g., receipts/uploads/uuid.jpg)
    const [bucket, ...pathParts] = fullPath.split("/");
    const storagePath = pathParts.join("/");

    if (!bucket || !storagePath) {
      return NextResponse.json({ error: "Invalid path format" }, { status: 400 });
    }

    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (error) {
      console.error("Storage download error:", error);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const ext = fullPath.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Image serving error:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
