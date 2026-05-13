// FastAPI client helpers for the outfit backend

import type {
  WardrobeItem,
  WardrobeSummary,
  RecommendRequest,
  RecommendResponse,
  StyleProfile,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8766";

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
  return apiFetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
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
