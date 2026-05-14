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

// ──────────────────────────────────────────────────────────────────
// Scene generation. Two flavours:
//   - generateSceneFromCloset: face + actual wardrobe item images via
//     multi-image /edits. Output should match the user's real clothes.
//   - generateSceneAspirational: face only; outfit described in text.
//     Used when recommending items the user does NOT own.
// Both use Azure /images/edits — gpt-image accepts repeated `image`
// fields in the multipart form to ingest multiple references.
// ──────────────────────────────────────────────────────────────────

const SCENE_IDENTITY_PREAMBLE = `Use the provided portrait as the EXACT reference person.

Hard constraints:
- Preserve the EXACT facial features, face shape, skin tone, eye shape, nose, mouth, ethnicity, hair color, and apparent age of the reference person.
- Do NOT beautify, slim the face, idealize, or replace with a generic model face.
- The output must be unmistakably the same person as the reference.
- Realistic editorial photography quality, natural lighting.
- No text, captions, watermarks, or logos.
`;

function buildClosetPrompt(occasion: string): string {
  return (
    SCENE_IDENTITY_PREAMBLE +
    `
The first input image is the FACE reference. The remaining input images are the EXACT GARMENTS the person should be wearing — same color, pattern, silhouette, fabric, and details. Do NOT invent substitutes or add unspecified items.

Generate a full-body editorial fashion photograph of the SAME person wearing all the supplied garments together as one outfit, in the following scene:

Scene / occasion: ${occasion}

Composition:
- Full body, natural standing or candid pose appropriate to the scene.
- Background that fits the scene/occasion.
- Magazine cover quality, photorealistic, soft natural light.
- Aspect ratio vertical 2:3.`
  );
}

function buildAspirationalPrompt(
  occasion: string,
  recommendation: string,
): string {
  const trimmed = recommendation.slice(0, 700);
  return (
    SCENE_IDENTITY_PREAMBLE +
    `
Generate a full-body editorial fashion photograph of the SAME person wearing an OUTFIT THE USER DOES NOT YET OWN — these are aspirational suggestions to inspire purchase. Render the garments described below faithfully.

Scene / occasion: ${occasion}

Suggested outfit (Chinese, parse the items mentioned, ignore any item_xxxx IDs):
${trimmed}

Composition:
- Full body, natural standing or candid pose appropriate to the scene.
- Background that fits the scene/occasion.
- Magazine cover quality, photorealistic, soft natural light.
- Aspect ratio vertical 2:3.`
  );
}

async function postEdit(
  prompt: string,
  images: Blob[],
): Promise<string> {
  if (!ENDPOINT || !DEPLOYMENT || !API_VERSION || !KEY) {
    throw new Error("Azure OpenAI env vars missing (NEXT_PUBLIC_*)");
  }
  if (images.length === 0) throw new Error("at least one input image required");

  const url = `${ENDPOINT}/openai/deployments/${DEPLOYMENT}/images/edits?api-version=${API_VERSION}`;
  const body = new FormData();

  for (let i = 0; i < images.length; i++) {
    const src = images[i];
    const base =
      src instanceof File
        ? src
        : new File([src], `input-${i}.jpg`, { type: src.type || "image/jpeg" });
    const shrunk = await shrinkForAzure(base);
    body.append(
      "image",
      new File([shrunk], `input-${i}.jpg`, { type: shrunk.type || "image/jpeg" }),
    );
  }
  body.append("prompt", prompt);
  body.append("size", "1024x1536");
  body.append("n", "1");

  console.log("[azure/scene] POST", url, "images:", images.length);
  const res = await fetch(url, {
    method: "POST",
    headers: { "api-key": KEY },
    body,
  });
  console.log("[azure/scene] status", res.status);

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

export function generateSceneFromCloset(
  face: Blob,
  itemImages: Blob[],
  occasion: string,
): Promise<string> {
  return postEdit(buildClosetPrompt(occasion), [face, ...itemImages]);
}

// Magazine-style overview: render N outfits side-by-side (or row-by-row)
// on the same person, with Chinese title labels per outfit.
export interface BoardOutfit {
  /** Display title for this outfit row, e.g. "Day 1-2: 清爽休闲". */
  title: string;
  /** Wardrobe item images for this outfit (closet mode). Empty for aspirational. */
  itemImages: Blob[];
  /** Free-form text description (used for aspirational outfits). */
  description?: string;
}

function buildBoardPrompt(occasion: string, outfits: BoardOutfit[]): string {
  const outfitLines = outfits
    .map((o, i) => {
      const itemNote = o.itemImages.length > 0
        ? `(use the supplied garment images marked outfit-${i + 1}-item-* exactly)`
        : `(outfit description: ${o.description?.slice(0, 200) ?? ""})`;
      return `${i + 1}. "${o.title}" ${itemNote}`;
    })
    .join("\n");

  return (
    SCENE_IDENTITY_PREAMBLE +
    `
Generate ONE single editorial fashion magazine page that shows ${outfits.length} outfit looks of the SAME reference person, arranged as a vertical magazine layout.

Page header (in Chinese): "推荐搭配 — ${occasion}"

Each outfit is one ROW (left to right: 1-2 portraits of the person in that outfit). Above each row, a clear Chinese title label.

Outfits (in order, top to bottom):
${outfitLines}

Layout requirements:
- Magazine grid layout, soft pastel background, thin separator lines between rows.
- Each portrait is full-body or 3/4 body.
- The SAME person appears in every portrait — face must be identical to reference.
- Garments must match the supplied product images for closet outfits; do NOT invent substitutes.
- For aspirational outfits, render the described garments faithfully.
- Use Simplified Chinese for the page header and outfit titles.
- Premium editorial photography quality, natural lighting.
- Vertical aspect ratio.
- Background should fit "${occasion}" mood.`
  );
}

export function generateOutfitBoard(
  face: Blob,
  occasion: string,
  outfits: BoardOutfit[],
): Promise<string> {
  // Flatten: face first, then all per-outfit item images in order.
  // Total image cap: face + up to 8 garment refs (Azure 4MB each, shrink applied).
  const itemBlobs = outfits.flatMap((o) => o.itemImages).slice(0, 8);
  return postEdit(buildBoardPrompt(occasion, outfits), [face, ...itemBlobs]);
}

export function generateSceneAspirational(
  face: Blob,
  occasion: string,
  recommendation: string,
): Promise<string> {
  return postEdit(buildAspirationalPrompt(occasion, recommendation), [face]);
}

/** @deprecated kept for back-compat — use generateSceneAspirational. */
export function generateScene(
  face: Blob,
  occasion: string,
  recommendation: string,
): Promise<string> {
  return generateSceneAspirational(face, occasion, recommendation);
}
