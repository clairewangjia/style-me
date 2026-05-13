// Client-side Azure OpenAI image-edit call.
// Used inside Capacitor (static export) where Next.js API routes don't run.
// Key is bundled into the app via NEXT_PUBLIC_* env vars — only safe for
// personal installs, never publish to App Store with this layout.

import { MODES, type AnalysisMode } from "@/lib/prompts";
import { shrinkForAzure } from "@/lib/resize";

const ENDPOINT = process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT;
const DEPLOYMENT = process.env.NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT;
const API_VERSION = process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION;
const KEY = process.env.NEXT_PUBLIC_AZURE_OPENAI_KEY;

export async function analyzeImage(
  image: Blob,
  mode: AnalysisMode,
): Promise<string> {
  if (!ENDPOINT || !DEPLOYMENT || !API_VERSION || !KEY) {
    throw new Error("Azure OpenAI env vars missing (NEXT_PUBLIC_*)");
  }

  const cfg = MODES[mode];
  const url = `${ENDPOINT}/openai/deployments/${DEPLOYMENT}/images/edits?api-version=${API_VERSION}`;

  // Phone photos are commonly 4-10 MB; Azure /images/edits caps at 4 MB.
  // Re-encode large blobs to JPEG before upload.
  const fileBase = image instanceof File ? image : new File([image], "portrait.jpg", { type: image.type || "image/jpeg" });
  console.log("[azure] input size", fileBase.size, "type", fileBase.type);
  const shrunk = await shrinkForAzure(fileBase);
  console.log("[azure] shrunk size", shrunk.size, "type", shrunk.type);

  const body = new FormData();
  body.append(
    "image",
    new File([shrunk], "portrait.jpg", { type: shrunk.type || "image/jpeg" }),
  );
  body.append("prompt", cfg.prompt);
  body.append("size", cfg.size);
  body.append("n", "1");
  console.log("[azure] POST", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "api-key": KEY },
    body,
  }).catch((e) => {
    console.error("[azure] fetch threw", e);
    throw e;
  });
  console.log("[azure] response status", res.status);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = json.data?.[0];
  if (!item) throw new Error("no image returned");

  return item.b64_json
    ? `data:image/png;base64,${item.b64_json}`
    : (item.url as string);
}
