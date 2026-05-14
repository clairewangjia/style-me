// FastAPI client helpers for the outfit backend

import type {
  WardrobeItem,
  WardrobeSummary,
  RecommendRequest,
  RecommendResponse,
  StyleProfile,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8766";
const BLOB_BASE = process.env.NEXT_PUBLIC_WARDROBE_BLOB_BASE || "";
const BLOB_SAS = process.env.NEXT_PUBLIC_WARDROBE_BLOB_SAS || "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Wardrobe Items ──

export async function fetchItems(category?: string): Promise<{ items: WardrobeItem[]; total: number }> {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch(`/api/items${q}`);
}

export async function fetchItem(id: string): Promise<WardrobeItem> {
  return apiFetch(`/api/items/${id}`);
}

export function itemImageUrl(id: string): string {
  if (BLOB_BASE) {
    const sep = BLOB_SAS.startsWith("?") ? "" : "?";
    return `${BLOB_BASE}/${id}.jpg${BLOB_SAS ? sep + BLOB_SAS : ""}`;
  }
  return `${API_BASE}/api/items/${id}/image`;
}

export async function uploadItem(file: File, desc?: string): Promise<WardrobeItem> {
  const form = new FormData();
  form.append("file", file);
  if (desc) form.append("desc", desc);
  return apiFetch("/api/items", { method: "POST", body: form });
}

export async function deleteItem(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/items/${id}`, { method: "DELETE" });
}

// ── Summary ──

export async function fetchSummary(): Promise<WardrobeSummary> {
  return apiFetch("/api/summary");
}

// ── Recommend ──

export async function recommend(req: RecommendRequest): Promise<RecommendResponse> {
  // Backend may not yet support `mode`. If aspirational, prepend a hint
  // into `extra` so the LLM still gets the signal even on old backends.
  const payload =
    req.mode === "aspirational"
      ? {
          ...req,
          extra: `[mode=aspirational; 不要使用衣柜中的物品 ID, 推荐我应该购买的新单品]${req.extra ? "; " + req.extra : ""}`,
        }
      : req;

  return apiFetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Fetch a wardrobe item image as Blob for use in image-edit prompts.
//
// Browser caching gotcha: wardrobe thumbnails are loaded with plain
// <img> (no-cors mode), so the response is cached WITHOUT CORS
// headers. A subsequent <img crossOrigin="anonymous"> or fetch() to
// the same URL hits that cached entry and fails with "No ACAO header"
// even though the server WOULD return ACAO if asked fresh. The dev
// tunnel doesn't send `Vary: Origin` to disambiguate.
//
// Workaround: append a `?cors=1` query so the cors-mode request
// resolves to a different cache key. Fall back to <img>+canvas, then
// fetch().blob().
export async function fetchItemBlob(id: string): Promise<Blob> {
  const base = itemImageUrl(id);
  const url = base + (base.includes("?") ? "&" : "?") + "cors=1";

  if (typeof window !== "undefined" && typeof Image !== "undefined") {
    try {
      return await loadImageAsBlob(url);
    } catch (e) {
      console.warn("[fetchItemBlob] image-loader failed, falling back to fetch", e);
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`item ${id} image: ${res.status}`);
  return res.blob();
}

function loadImageAsBlob(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("no 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
          "image/jpeg",
          0.92,
        );
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`image load failed: ${url}`));
    img.src = url;
  });
}

// ── Style Profile ──

export async function fetchStyleProfile(): Promise<StyleProfile> {
  return apiFetch("/api/style-profile");
}

export async function saveStyleProfile(styles: string[]): Promise<StyleProfile> {
  return apiFetch("/api/style-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ styles }),
  });
}

export async function likeStyle(style: string, imageUrl?: string): Promise<{ ok: boolean; total_likes: number }> {
  return apiFetch("/api/style-like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ style, image_url: imageUrl || "" }),
  });
}
