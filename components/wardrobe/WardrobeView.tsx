"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchItems, fetchSummary } from "@/lib/api";
import type { WardrobeItem, WardrobeSummary } from "@/lib/types";
import { useNav } from "@/lib/nav";
import ItemCard from "./ItemCard";
import ItemDetail from "./ItemDetail";
import UploadFlow from "./UploadFlow";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";

const CATEGORIES = ["全部", "上装", "下装", "外套", "鞋子", "配饰", "包"];

export default function WardrobeView() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [summary, setSummary] = useState<WardrobeSummary | null>(null);
  const [category, setCategory] = useState("全部");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WardrobeItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { focusItemId, clearFocus } = useNav();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cat = category === "全部" ? undefined : category;
      const [itemsRes, summaryRes] = await Promise.all([
        fetchItems(cat),
        fetchSummary(),
      ]);
      setItems(itemsRes.items);
      setSummary(summaryRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  // When recommend tab navigates to an item, force category=全部 so
  // it's guaranteed visible, then scroll + flash highlight.
  useEffect(() => {
    if (focusItemId && category !== "全部") setCategory("全部");
  }, [focusItemId, category]);

  useEffect(() => {
    if (!focusItemId || loading || items.length === 0) return;
    const node = itemRefs.current[focusItemId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(focusItemId);
      const t = setTimeout(() => {
        setHighlightId(null);
        clearFocus();
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [focusItemId, loading, items, clearFocus]);

  return (
    <div className="pb-4">
      {/* Stats card */}
      {summary && (
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
          <div className="mb-2 font-serif text-lg font-semibold">{summary.total} 件衣物</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.by_category).map(([cat, count]) => (
              <span key={cat} className="rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                {cat} {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              category === cat
                ? "bg-[#6c5ce7] text-white shadow-sm"
                : "bg-white text-zinc-600 border border-zinc-200",
            ].join(" ")}
          >
            {cat}
            {cat !== "全部" && summary?.by_category[cat] != null && (
              <span className="ml-1 text-xs opacity-70">{summary.by_category[cat]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState text="加载衣橱..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon="👕" text={category === "全部" ? "衣橱是空的，点击 + 开始录入" : `没有${category}类衣物`} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              ref={(el) => { itemRefs.current[item.id] = el; }}
              className={
                highlightId === item.id
                  ? "rounded-2xl ring-4 ring-[#6c5ce7] ring-offset-2 transition-shadow"
                  : ""
              }
            >
              <ItemCard item={item} onClick={() => setSelected(item)} />
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#6c5ce7] text-2xl text-white shadow-lg transition-all duration-200 hover:bg-[#5a4bd6] active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        +
      </button>

      {/* Detail sheet */}
      {selected && (
        <ItemDetail
          item={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => { setSelected(null); load(); }}
        />
      )}

      {/* Upload flow */}
      {showUpload && (
        <UploadFlow
          onClose={() => setShowUpload(false)}
          onUploaded={load}
        />
      )}
    </div>
  );
}
