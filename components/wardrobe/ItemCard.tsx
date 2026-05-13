"use client";

import type { WardrobeItem } from "@/lib/types";
import { itemImageUrl } from "@/lib/api";

interface ItemCardProps {
  item: WardrobeItem;
  onClick: () => void;
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
  const label = [item.category, item.subcategory].filter(Boolean).join("·");

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={itemImageUrl(item.id)}
          alt={item.description || label}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="truncate text-xs font-medium text-zinc-700">{label}</span>
        {item.colors && item.colors.length > 0 && (
          <div className="ml-auto flex shrink-0 gap-1">
            {item.colors.slice(0, 3).map((c, i) => (
              <span
                key={i}
                className="inline-block h-3 w-3 rounded-full border border-zinc-200"
                style={{ backgroundColor: colorToHex(c) }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

const COLOR_MAP: Record<string, string> = {
  "黑": "#1a1a1a", "黑色": "#1a1a1a",
  "白": "#f5f5f5", "白色": "#f5f5f5",
  "灰": "#9ca3af", "灰色": "#9ca3af",
  "红": "#dc2626", "红色": "#dc2626",
  "蓝": "#2563eb", "蓝色": "#2563eb",
  "绿": "#16a34a", "绿色": "#16a34a",
  "黄": "#eab308", "黄色": "#eab308",
  "橙": "#ea580c", "橙色": "#ea580c",
  "紫": "#9333ea", "紫色": "#9333ea",
  "粉": "#ec4899", "粉色": "#ec4899", "粉红": "#ec4899",
  "棕": "#92400e", "棕色": "#92400e", "咖啡": "#6f4e37", "咖啡色": "#6f4e37",
  "米": "#f5f0e1", "米色": "#f5f0e1", "米白": "#f5f0e1",
  "卡其": "#c3b091", "卡其色": "#c3b091",
  "藏青": "#1e3a5f", "藏青色": "#1e3a5f",
  "深蓝": "#1e3a5f", "深蓝色": "#1e3a5f",
  "浅蓝": "#93c5fd", "浅蓝色": "#93c5fd",
  "墨绿": "#14532d", "深绿": "#14532d",
  "驼": "#c19a6b", "驼色": "#c19a6b",
  "奶白": "#fffdd0", "象牙白": "#fffff0",
  "军绿": "#4b5320", "军绿色": "#4b5320",
  "酒红": "#722f37", "酒红色": "#722f37",
  "浅灰": "#d1d5db", "深灰": "#4b5563",
};

function colorToHex(name: string): string {
  return COLOR_MAP[name] || "#d4d4d8";
}
