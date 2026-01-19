import { describe, test, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

let savedFiles: Map<string, { filename: string; size: number; type: string }>;

function resetMocks() {
  savedFiles = new Map();
}

mock.module("fs/promises", () => ({
  mkdir: async () => {},
  writeFile: async (path: string, buffer: Buffer) => {
    const filename = path.split("/").pop()!;
    savedFiles.set(path, {
      filename,
      size: buffer.length,
      type: "image/jpeg",
    });
  },
}));

const { POST } = await import("@/app/api/upload/route");

function createFileFormData(type: string, filename: string): FormData {
  const blob = new Blob(["test content"], { type });
  const formData = new FormData();
  formData.append("file", blob, filename);
  return formData;
}

function createUploadRequest(formData: FormData): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/upload"), {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("uploads valid JPEG file", async () => {
    const formData = createFileFormData("image/jpeg", "receipt.jpg");
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path).toMatch(/^\/uploads\/receipts\/.+\.jpg$/);
    expect(data.type).toBe("image/jpeg");
  });

  test("uploads valid PNG file", async () => {
    const formData = createFileFormData("image/png", "receipt.png");
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path).toMatch(/\/uploads\/receipts\/.+\.png$/);
  });

  test("uploads valid WebP file", async () => {
    const formData = createFileFormData("image/webp", "receipt.webp");
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path).toMatch(/\/uploads\/receipts\/.+\.webp$/);
  });

  test("uploads valid HEIC file", async () => {
    const formData = createFileFormData("image/heic", "receipt.heic");
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path).toMatch(/\/uploads\/receipts\/.+\.heic$/);
  });

  test("returns 400 when no file provided", async () => {
    const formData = new FormData();
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("No file provided");
  });

  test("rejects PDF files", async () => {
    const formData = createFileFormData("application/pdf", "document.pdf");
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid file type");
  });

  test("rejects text files", async () => {
    const formData = createFileFormData("text/plain", "notes.txt");
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(400);
  });

  test("returns file metadata in response", async () => {
    const formData = createFileFormData("image/jpeg", "receipt.jpg");
    const res = await POST(createUploadRequest(formData));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.filename).toBeDefined();
    expect(data.size).toBeGreaterThan(0);
    expect(data.type).toBe("image/jpeg");
  });

  test("generates unique filename", async () => {
    const formData1 = createFileFormData("image/jpeg", "same.jpg");
    const formData2 = createFileFormData("image/jpeg", "same.jpg");

    const res1 = await POST(createUploadRequest(formData1));
    const res2 = await POST(createUploadRequest(formData2));

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.path).not.toBe(data2.path);
  });
});
