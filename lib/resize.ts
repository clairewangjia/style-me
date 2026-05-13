// Downscale a user-uploaded image so Azure /images/edits accepts it.
// Azure caps the upload at 4 MB. Phone photos are commonly 4-10 MB.
// We re-encode to JPEG quality 0.85 with longest side ≤ maxEdge.
// Returns the original Blob if it's already small enough.

const SIZE_LIMIT_BYTES = 3 * 1024 * 1024; // leave headroom under 4 MB
const DEFAULT_MAX_EDGE = 2048;

export async function shrinkForAzure(
  file: File,
  maxEdge = DEFAULT_MAX_EDGE,
): Promise<Blob> {
  if (file.size <= SIZE_LIMIT_BYTES && file.type === "image/jpeg") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
      "image/jpeg",
      0.85,
    );
  });

  // Second pass if still too big (rare for portraits)
  if (blob.size > SIZE_LIMIT_BYTES && maxEdge > 1024) {
    return shrinkForAzure(
      new File([blob], file.name, { type: "image/jpeg" }),
      Math.round(maxEdge * 0.75),
    );
  }
  return blob;
}
