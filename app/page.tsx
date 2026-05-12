"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addRecord,
  dataUrlToBlob,
  deleteRecord,
  listRecords,
  type LibraryRecord,
  type LibraryStore,
} from "@/lib/library";
import { analyzeImage } from "@/lib/azure";

type Mode = "hair" | "color" | "outfit" | "vibe";

const MODES: { id: Mode; label: string; emoji: string; tagline: string }[] = [
  { id: "hair", label: "发型分析", emoji: "💇", tagline: "找到最适合你的发型" },
  { id: "color", label: "色彩分析", emoji: "🎨", tagline: "最显气色的颜色清单" },
  { id: "outfit", label: "穿搭分析", emoji: "👗", tagline: "你的风格关键词" },
  { id: "vibe", label: "气质分析", emoji: "✨", tagline: "三种专属气质标签" },
];

const MODE_LABEL: Record<Mode, string> = {
  hair: "发型",
  color: "色彩",
  outfit: "穿搭",
  vibe: "气质",
};

interface CurrentUpload {
  blob: Blob;
  url: string;       // object URL for preview
  recordId: string;  // id in IndexedDB
}

interface CurrentResult {
  mode: Mode;
  url: string;       // object URL or data URL
  recordId?: string; // id in IndexedDB once persisted
}

export default function Home() {
  const [current, setCurrent] = useState<CurrentUpload | null>(null);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState<Mode | null>(null);
  const [result, setResult] = useState<CurrentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploads, setUploads] = useState<LibraryRecord[]>([]);
  const [generations, setGenerations] = useState<LibraryRecord[]>([]);
  const [libTab, setLibTab] = useState<LibraryStore>("uploads");
  const [lightbox, setLightbox] = useState<{ url: string; mode?: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<Set<string>>(new Set());

  const trackUrl = useCallback((url: string) => {
    objectUrls.current.add(url);
    return url;
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      for (const u of objectUrls.current) URL.revokeObjectURL(u);
    };
  }, []);

  // Initial library load
  const refreshLibrary = useCallback(async () => {
    const [u, g] = await Promise.all([
      listRecords("uploads"),
      listRecords("generations"),
    ]);
    setUploads(u);
    setGenerations(g);
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  // Pick + persist a new upload
  const onPickFile = useCallback(
    async (f: File) => {
      try {
        setError(null);
        const rec = await addRecord("uploads", { blob: f, mime: f.type });
        const url = trackUrl(URL.createObjectURL(f));
        setCurrent({ blob: f, url, recordId: rec.id });
        setResult(null);
        setActiveMode(null);
        await refreshLibrary();
      } catch (e) {
        setError(e instanceof Error ? e.message : "上传失败");
      }
    },
    [refreshLibrary, trackUrl],
  );

  // Reuse a stored upload as current
  const useStoredUpload = useCallback(
    (rec: LibraryRecord) => {
      const url = trackUrl(URL.createObjectURL(rec.blob));
      setCurrent({ blob: rec.blob, url, recordId: rec.id });
      setResult(null);
      setActiveMode(null);
      setError(null);
    },
    [trackUrl],
  );

  // Open a stored generation in the lightbox (big preview overlay)
  const openStoredGeneration = useCallback(
    (rec: LibraryRecord) => {
      const url = trackUrl(URL.createObjectURL(rec.blob));
      setLightbox({ url, mode: rec.mode });
    },
    [trackUrl],
  );

  // Close lightbox on Esc
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const removeRecord = useCallback(
    async (store: LibraryStore, id: string) => {
      await deleteRecord(store, id);
      // Clear UI if the deleted record is in use
      if (store === "uploads" && current?.recordId === id) setCurrent(null);
      if (store === "generations" && result?.recordId === id) setResult(null);
      await refreshLibrary();
    },
    [current, result, refreshLibrary],
  );

  const runMode = useCallback(
    async (mode: Mode) => {
      if (!current) {
        setError("请先上传一张人像照片");
        return;
      }
      setError(null);
      setLoading(mode);
      setActiveMode(mode);
      try {
        const dataUrl = await analyzeImage(current.blob, mode);
        const blob = await dataUrlToBlob(dataUrl);
        const rec = await addRecord("generations", {
          blob,
          mime: blob.type || "image/png",
          mode,
          sourceId: current.recordId,
        });
        const url = trackUrl(URL.createObjectURL(blob));
        setResult({ mode, url, recordId: rec.id });
        await refreshLibrary();
      } catch (e) {
        setError(e instanceof Error ? e.message : "未知错误");
      } finally {
        setLoading(null);
      }
    },
    [current, refreshLibrary, trackUrl],
  );

  const libraryItems = libTab === "uploads" ? uploads : generations;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      {/* Header */}
      <header className="mb-10 text-center">
        <div className="mb-3 inline-block rounded-full bg-zinc-900 px-4 py-1 text-xs font-medium text-white">
          ✨ Style Me — AI 个人形象分析
        </div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
          上传一张照片
          <br />
          <span className="text-zinc-500">看见 4 个版本的你</span>
        </h1>
      </header>

      {/* Upload zone */}
      <section className="mb-8">
        <label
          htmlFor="upload"
          className="group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-zinc-300 bg-white transition hover:border-zinc-900"
        >
          {current ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.url}
                alt="你上传的照片"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
              <span className="relative z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 opacity-0 group-hover:opacity-100">
                点击更换照片
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-500">
              <div className="text-4xl">📸</div>
              <div className="text-base font-medium text-zinc-900">
                点击或拖拽上传一张正面人像
              </div>
              <div className="text-sm">
                建议清晰、光线均匀、无重度滤镜
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            id="upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />
        </label>
      </section>

      {/* Mode picker */}
      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {MODES.map((m) => {
          const isLoading = loading === m.id;
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => runMode(m.id)}
              disabled={!current || loading !== null}
              className={[
                "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition",
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:border-zinc-900",
                !current ? "opacity-50" : "",
              ].join(" ")}
            >
              <div className="text-2xl">{m.emoji}</div>
              <div className="text-base font-semibold">{m.label}</div>
              <div
                className={[
                  "text-xs",
                  isActive ? "text-zinc-300" : "text-zinc-500",
                ].join(" ")}
              >
                {isLoading ? "正在生成..." : m.tagline}
              </div>
            </button>
          );
        })}
      </section>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result canvas */}
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        {loading && (
          <div className="flex h-[480px] flex-col items-center justify-center gap-3 text-zinc-500">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
            <div className="text-sm">
              AI 正在为你生成 {MODES.find((m) => m.id === loading)?.label}…
            </div>
            <div className="text-xs text-zinc-400">通常 30 ~ 90 秒</div>
          </div>
        )}

        {!loading && result && (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt={result.mode}
              onClick={() => setLightbox({ url: result.url, mode: result.mode })}
              className="max-h-[80vh] w-auto cursor-zoom-in rounded-2xl"
            />
            <div className="flex gap-3">
              <a
                href={result.url}
                download={`styleme-${result.mode}.png`}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                ⬇ 下载图卡
              </a>
              <button
                onClick={() => runMode(result.mode)}
                disabled={!current}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium hover:border-zinc-900 disabled:opacity-50"
              >
                ↻ 再来一张
              </button>
            </div>
          </div>
        )}

        {!loading && !result && (
          <div className="flex h-[480px] flex-col items-center justify-center gap-2 text-center text-zinc-400">
            <div className="text-3xl">👆</div>
            <div className="text-sm">
              {current ? "选择上方一个分析类型开始" : "先上传一张人像照片"}
            </div>
          </div>
        )}
      </section>

      {/* Library */}
      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            图库
          </h2>
          <div className="flex gap-1 rounded-full border border-zinc-200 bg-white p-1 text-sm">
            <button
              onClick={() => setLibTab("uploads")}
              className={[
                "rounded-full px-4 py-1.5 transition",
                libTab === "uploads"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900",
              ].join(" ")}
            >
              📸 我的照片 · {uploads.length}
            </button>
            <button
              onClick={() => setLibTab("generations")}
              className={[
                "rounded-full px-4 py-1.5 transition",
                libTab === "generations"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900",
              ].join(" ")}
            >
              🎨 生成结果 · {generations.length}
            </button>
          </div>
        </div>

        {libraryItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
            {libTab === "uploads"
              ? "还没有上传过照片"
              : "还没有生成过分析图卡"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {libraryItems.map((rec) => (
              <LibraryThumb
                key={rec.id}
                rec={rec}
                store={libTab}
                isActive={
                  libTab === "uploads"
                    ? current?.recordId === rec.id
                    : result?.recordId === rec.id
                }
                onOpen={() =>
                  libTab === "uploads"
                    ? useStoredUpload(rec)
                    : openStoredGeneration(rec)
                }
                onDelete={() => removeRecord(libTab, rec.id)}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 text-center text-xs text-zinc-400">
        本地 demo · gpt-image-2 · 图库存在浏览器 IndexedDB · Style Me
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.mode ?? "preview"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[95vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
          />
          <button
            onClick={() => setLightbox(null)}
            aria-label="关闭"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl font-medium text-zinc-900 hover:bg-white"
          >
            ×
          </button>
          <a
            href={lightbox.url}
            download={`styleme-${lightbox.mode ?? "image"}.png`}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            ⬇ 下载
          </a>
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────

interface LibraryThumbProps {
  rec: LibraryRecord;
  store: LibraryStore;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function LibraryThumb({
  rec,
  store,
  isActive,
  onOpen,
  onDelete,
}: LibraryThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(rec.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [rec.blob]);

  const date = new Date(rec.createdAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div
      className={[
        "group relative aspect-square overflow-hidden rounded-2xl border bg-zinc-100 transition",
        isActive
          ? "border-zinc-900 ring-2 ring-zinc-900"
          : "border-zinc-200 hover:border-zinc-900",
      ].join(" ")}
    >
      {url && (
        <button
          onClick={onOpen}
          className="absolute inset-0 h-full w-full"
          aria-label={
            store === "uploads" ? "使用这张照片" : "查看这张生成结果"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </button>
      )}

      {/* Mode tag for generations */}
      {store === "generations" && rec.mode && (
        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-zinc-900 backdrop-blur">
          {MODE_LABEL[rec.mode as Mode] ?? rec.mode}
        </div>
      )}

      {/* Date + delete on hover */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
        <span className="text-[11px] text-white">{dateStr}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="pointer-events-auto rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-red-600 backdrop-blur hover:bg-white"
        >
          删除
        </button>
      </div>
    </div>
  );
}
