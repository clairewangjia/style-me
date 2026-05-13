"use client";

import type { WardrobeItem } from "@/lib/types";
import { itemImageUrl, deleteItem } from "@/lib/api";
import { useState } from "react";

interface ItemDetailProps {
  item: WardrobeItem;
  onClose: () => void;
  onDeleted: () => void;
}

export default function ItemDetail({ item, onClose, onDeleted }: ItemDetailProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteItem(item.id);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const label = [item.category, item.subcategory].filter(Boolean).join(" · ");

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
        <div className="mx-auto w-12 py-3">
          <div className="h-1 rounded-full bg-zinc-300" />
        </div>

        <div className="px-5 pb-6">
          {/* Image */}
          <div className="mb-4 overflow-hidden rounded-2xl bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={itemImageUrl(item.id)}
              alt={item.description || label}
              className="w-full object-contain"
              style={{ maxHeight: "40vh" }}
            />
          </div>

          {/* Title */}
          <h3 className="mb-1 font-serif text-xl font-semibold">{label}</h3>
          {item.description && (
            <p className="mb-4 text-sm text-zinc-500">{item.description}</p>
          )}

          {/* Attributes grid */}
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            {item.colors && item.colors.length > 0 && (
              <Attr label="颜色" value={item.colors.join("、")} />
            )}
            {item.material && <Attr label="材质" value={item.material} />}
            {item.style && item.style.length > 0 && (
              <Attr label="风格" value={item.style.join("、")} />
            )}
            {item.seasons && item.seasons.length > 0 && (
              <Attr label="季节" value={item.seasons.join("、")} />
            )}
            {item.occasions && item.occasions.length > 0 && (
              <Attr label="场景" value={item.occasions.join("、")} />
            )}
            {item.warmth != null && (
              <Attr label="保暖" value={"🔥".repeat(item.warmth)} />
            )}
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={[
              "w-full rounded-xl py-3 text-sm font-medium transition-all duration-200",
              confirming
                ? "bg-red-600 text-white"
                : "border border-red-200 text-red-600 hover:bg-red-50",
            ].join(" ")}
          >
            {deleting ? "删除中..." : confirming ? "确认删除" : "删除衣物"}
          </button>
          {confirming && !deleting && (
            <button
              onClick={() => setConfirming(false)}
              className="mt-2 w-full rounded-xl py-3 text-sm text-zinc-500"
            >
              取消
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Attr({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="font-medium text-zinc-700">{value}</div>
    </div>
  );
}
