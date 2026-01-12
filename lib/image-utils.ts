export function isHeicFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif";
}

async function convertHeicServerSide(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/preview", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to generate preview");
  }

  return data.preview;
}

export async function createImagePreview(file: File): Promise<string> {
  // HEIC files need server-side conversion (sharp handles them reliably)
  if (isHeicFile(file)) {
    return convertHeicServerSide(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
