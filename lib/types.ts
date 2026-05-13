// Shared TypeScript types for the Style Me app

export interface WardrobeItem {
  id: string;
  category: string;
  subcategory?: string;
  colors?: string[];
  material?: string;
  style?: string[];
  seasons?: string[];
  occasions?: string[];
  warmth?: number;
  description?: string;
  image?: string;
  image_url?: string;
  added_at?: string;
}

export interface WardrobeSummary {
  total: number;
  by_category: Record<string, number>;
  recent_outfits: OutfitRecord[];
}

export interface OutfitRecord {
  date: string;
  occasion: string;
  items: string[];
  notes?: string;
}

export interface RecommendRequest {
  occasion: string;
  weather?: string;
  extra?: string;
}

export interface RecommendResponse {
  recommendation: string;
  occasion: string;
}

export interface StyleProfile {
  styles: string[];
  likes: StyleLike[];
  onboarded: boolean;
}

export interface StyleLike {
  style: string;
  image_url: string;
  timestamp: string;
}

export type TabId = "wardrobe" | "recommend" | "analysis" | "profile";
