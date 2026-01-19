import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/db/supabase";
import { requireAuthWithUser } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { ALLOWED_MIME_TYPES } from "@/lib/validations";

const STORAGE_BUCKET = "receipts";
const SIGNED_URL_EXPIRES_IN = 60 * 5; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    await requireAuthWithUser();

    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or contentType" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType as typeof ALLOWED_MIME_TYPES[number])) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC" },
        { status: 400 }
      );
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueFilename = `${uuid()}-${Date.now()}.${ext}`;
    const storagePath = `uploads/${uniqueFilename}`;

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (error) {
      console.error("Signed URL creation error:", error);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      storagePath: `${STORAGE_BUCKET}/${storagePath}`,
      token: data.token,
    });
  } catch (error) {
    console.error("Signed URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
