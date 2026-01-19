/**
 * Client-side direct upload to Supabase Storage.
 * Bypasses Vercel's 4.5MB serverless function limit.
 */

interface SignedUrlResponse {
  signedUrl: string;
  storagePath: string;
  token: string;
}

interface UploadResult {
  storagePath: string;
}

export async function uploadToStorage(file: File): Promise<UploadResult> {
  // Get signed URL from our API
  const signedUrlRes = await fetch("/api/upload/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  if (!signedUrlRes.ok) {
    const error = await signedUrlRes.json().catch(() => ({ error: "Failed to get upload URL" }));
    throw new Error(error.error || "Failed to get upload URL");
  }

  const { signedUrl, storagePath } = await signedUrlRes.json() as SignedUrlResponse;

  // Upload directly to Supabase Storage
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.statusText}`);
  }

  return { storagePath };
}

export async function uploadMultipleToStorage(files: File[]): Promise<UploadResult[]> {
  return Promise.all(files.map(uploadToStorage));
}
