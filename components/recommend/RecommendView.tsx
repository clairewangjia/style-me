"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  fetchItemBlob,
  itemImageUrl,
  recommend,
} from "@/lib/api";
import {
  generateOutfitBoard,
  generateSceneAspirational,
  generateSceneFromCloset,
  type BoardOutfit,
} from "@/lib/azure";
import {
  addRecord,
  listRecords,
  type LibraryRecord,
} from "@/lib/library";
import { parseOutfits, type ParsedOutfit } from "@/lib/recommend-parse";
import { useNav } from "@/lib/nav";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";

type RecMode = "closet" | "aspirational";

const QUICK_TAGS = ["上班", "约会", "面试", "运动", "逛街", "聚餐", "居家"];
const TRAVEL_DURATIONS = ["1天", "3天", "5天", "7天", "自定义"];
const TRAVEL_TYPES = ["城市漫步", "户外徒步", "海岛度假", "商务出差", "文艺探店"];

export default function RecommendView() {
  // Recommendation form state
  const [recMode, setRecMode] = useState<RecMode | null>(null);
  const [contextMode, setContextMode] = useState<"quick" | "travel">("quick");
  const [occasion, setOccasion] = useState("");
  const [travelDest, setTravelDest] = useState("");
  const [travelDuration, setTravelDuration] = useState("3天");
  const [customDuration, setCustomDuration] = useState("");
  const [travelTemp, setTravelTemp] = useState("");
  const [travelType, setTravelType] = useState("");
  const [extra, setExtra] = useState("");

  // Recommendation result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultMode, setResultMode] = useState<RecMode>("closet");
  const [resultOccasion, setResultOccasion] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Face & saved scenes
  const [face, setFace] = useState<LibraryRecord | null>(null);
  const [savedScenes, setSavedScenes] = useState<LibraryRecord[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Board (overview-of-all-outfits) state
  const [boardImage, setBoardImage] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    listRecords("uploads").then((all) => setFace(all[0] ?? null)).catch(() => {});
    refreshSaved();
  }, [result]);

  const refreshSaved = () => {
    listRecords("generations")
      .then((all) =>
        setSavedScenes(all.filter((r) => (r.mode || "").startsWith("scene-"))),
      )
      .catch(() => {});
  };

  // Esc closes lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const outfits: ParsedOutfit[] = useMemo(
    () => (result ? parseOutfits(result) : []),
    [result],
  );

  const handleSubmit = async () => {
    if (!recMode) return;
    setLoading(true);
    setError(null);
    setResult(null);

    let occ: string;
    let weather: string | undefined;
    if (contextMode === "travel") {
      const dur = travelDuration === "自定义" ? customDuration : travelDuration;
      occ = `旅行：${travelDest || "未知目的地"} ${dur}${travelType ? " " + travelType : ""}`;
      weather = travelTemp || undefined;
    } else {
      occ = occasion || "日常";
    }

    try {
      const res = await recommend({
        occasion: occ,
        weather,
        extra: extra || undefined,
        mode: recMode,
      });
      setResult(res.recommendation);
      setResultMode(recMode);
      setResultOccasion(occ);
    } catch (e) {
      setError(e instanceof Error ? e.message : "推荐失败");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setResultOccasion("");
    setBoardImage(null);
    setBoardError(null);
    setOccasion("");
    setExtra("");
    setTravelDest("");
    setTravelDuration("3天");
    setCustomDuration("");
    setTravelTemp("");
    setTravelType("");
  };

  const handleGenerateBoard = async () => {
    if (!result || outfits.length === 0) return;
    if (!face) {
      setBoardError("请先去『形象分析』tab 上传一张正面人像");
      return;
    }
    setBoardLoading(true);
    setBoardError(null);
    try {
      const boardOutfits: BoardOutfit[] = await Promise.all(
        outfits.map(async (o) => {
          if (resultMode === "closet" && o.itemIds.length > 0) {
            const itemImages = await Promise.all(
              o.itemIds.slice(0, 3).map((id) => fetchItemBlob(id)),
            );
            return { title: o.title || "搭配", itemImages };
          }
          return { title: o.title || "搭配", itemImages: [], description: o.body };
        }),
      );
      const dataUrl = await generateOutfitBoard(face.blob, resultOccasion, boardOutfits);
      setBoardImage(dataUrl);

      const blob = await (await fetch(dataUrl)).blob();
      await addRecord("generations", {
        blob,
        mime: blob.type || "image/png",
        mode: "scene-board",
        sourceId: face.id,
        note: `${resultOccasion} · ${outfits.length} 套总览`,
      });
      refreshSaved();
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : "生图失败");
    } finally {
      setBoardLoading(false);
    }
  };

  if (loading) return <LoadingState text="AI 正在搭配中..." />;
  if (error) return <ErrorState message={error} onRetry={handleSubmit} />;

  // ── Result view ──────────────────────────────────────────────
  if (result) {
    return (
      <div className="pb-4">
        <div className="mb-3 text-xs text-zinc-500">
          场景：{resultOccasion} · 模式：
          {resultMode === "closet" ? "用我的衣柜" : "推荐新单品"}
        </div>

        {/* All-outfits board (top of result) */}
        {outfits.length >= 2 && (
          <BoardSection
            outfitCount={outfits.length}
            boardImage={boardImage}
            loading={boardLoading}
            error={boardError}
            disabled={!face}
            occasion={resultOccasion}
            onGenerate={handleGenerateBoard}
            onOpenImage={setLightbox}
          />
        )}

        {outfits.map((o, i) => (
          <OutfitCard
            key={i}
            outfit={o}
            mode={resultMode}
            occasion={resultOccasion}
            face={face}
            onSaved={refreshSaved}
            onOpenImage={setLightbox}
          />
        ))}

        {savedScenes.length > 0 && (
          <SavedScenesStrip scenes={savedScenes} onOpen={setLightbox} />
        )}

        <button
          onClick={reset}
          className="mt-4 w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6]"
        >
          重新推荐
        </button>

        {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────
  return (
    <div className="pb-4">
      <RecModeCards mode={recMode} onChange={setRecMode} />

      <div className="mb-4 flex gap-1 rounded-full border border-zinc-200 bg-white p-1">
        <button
          onClick={() => setContextMode("quick")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200 ${contextMode === "quick" ? "bg-[#6c5ce7] text-white" : "text-zinc-600"}`}
        >
          快速推荐
        </button>
        <button
          onClick={() => setContextMode("travel")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200 ${contextMode === "travel" ? "bg-[#6c5ce7] text-white" : "text-zinc-600"}`}
        >
          旅行模式
        </button>
      </div>

      {contextMode === "quick" ? (
        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-zinc-600">选择场景</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setOccasion(tag)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  occasion === tag
                    ? "bg-[#6c5ce7] text-white shadow-sm"
                    : "bg-white text-zinc-700 border border-zinc-200 hover:border-[#6c5ce7]",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 space-y-3">
          <Field label="目的地">
            <input
              type="text"
              placeholder="如：东京、大理、巴黎"
              value={travelDest}
              onChange={(e) => setTravelDest(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
            />
          </Field>
          <Field label="天数">
            <Chips
              options={TRAVEL_DURATIONS}
              value={travelDuration}
              onChange={setTravelDuration}
            />
            {travelDuration === "自定义" && (
              <input
                type="text"
                placeholder="如：10天"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
              />
            )}
          </Field>
          <Field label="温度范围">
            <input
              type="text"
              placeholder="如：15-25度"
              value={travelTemp}
              onChange={(e) => setTravelTemp(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
            />
          </Field>
          <Field label="旅行类型">
            <Chips
              options={TRAVEL_TYPES}
              value={travelType}
              onChange={(v) => setTravelType(v === travelType ? "" : v)}
            />
          </Field>
        </div>
      )}

      <Field label="额外要求">
        <input
          type="text"
          placeholder="如：想穿得显瘦、不想穿裙子"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
        />
      </Field>

      <button
        onClick={handleSubmit}
        disabled={!recMode || (contextMode === "quick" && !occasion)}
        className="mt-2 w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6] disabled:opacity-50"
      >
        获取推荐
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

function RecModeCards({
  mode,
  onChange,
}: {
  mode: RecMode | null;
  onChange: (m: RecMode) => void;
}) {
  const opt = (m: RecMode, emoji: string, label: string, sub: string) => {
    const active = mode === m;
    return (
      <button
        key={m}
        onClick={() => onChange(m)}
        className={[
          "flex-1 rounded-2xl border p-4 text-left transition-all",
          active
            ? "border-[#6c5ce7] bg-purple-50 shadow-sm"
            : "border-zinc-200 bg-white hover:border-[#6c5ce7]",
        ].join(" ")}
      >
        <div className="text-2xl">{emoji}</div>
        <div className="mt-1 text-sm font-semibold">{label}</div>
        <div className="text-xs text-zinc-500">{sub}</div>
      </button>
    );
  };
  return (
    <div className="mb-4 flex gap-3">
      {opt("closet", "👗", "用我的衣柜搭", "从已有的衣物里组合")}
      {opt("aspirational", "🛍️", "推荐我没有的", "AI 建议你可以买什么")}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-zinc-600">{label}</div>
      {children}
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={[
            "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            value === o
              ? "bg-[#6c5ce7] text-white"
              : "bg-white text-zinc-700 border border-zinc-200",
          ].join(" ")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

function OutfitCard({
  outfit,
  mode,
  occasion,
  face,
  onSaved,
  onOpenImage,
}: {
  outfit: ParsedOutfit;
  mode: RecMode;
  occasion: string;
  face: LibraryRecord | null;
  onSaved: () => void;
  onOpenImage: (url: string) => void;
}) {
  const { navigateToItem } = useNav();
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);

  const canCloset =
    mode === "closet" && outfit.itemIds.length > 0 && face !== null;

  const generate = async () => {
    if (!face) {
      setSceneError("请先去『形象分析』tab 上传一张正面人像");
      return;
    }
    setSceneLoading(true);
    setSceneError(null);
    try {
      let dataUrl: string;
      if (mode === "closet" && outfit.itemIds.length > 0) {
        const itemBlobs = await Promise.all(
          outfit.itemIds.slice(0, 4).map((id) => fetchItemBlob(id)),
        );
        dataUrl = await generateSceneFromCloset(face.blob, itemBlobs, occasion);
      } else {
        dataUrl = await generateSceneAspirational(face.blob, occasion, outfit.body);
      }
      setSceneImage(dataUrl);

      // Save to library
      const blob = await (await fetch(dataUrl)).blob();
      await addRecord("generations", {
        blob,
        mime: blob.type || "image/png",
        mode: mode === "closet" ? "scene-closet" : "scene-aspirational",
        sourceId: face.id,
        note: `${occasion}${outfit.title ? " · " + outfit.title : ""}`,
      });
      onSaved();
    } catch (e) {
      setSceneError(e instanceof Error ? e.message : "生图失败");
    } finally {
      setSceneLoading(false);
    }
  };

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <div className="p-5">
        {outfit.title && (
          <h3 className="mb-3 font-serif text-lg font-semibold">
            {outfit.title}
          </h3>
        )}
        <div className="prose prose-sm prose-zinc max-w-none text-sm leading-relaxed text-zinc-700 [&_h3]:hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const text = String(children).trim();
                if (/^item_[a-z0-9_]+$/i.test(text)) {
                  return (
                    <button
                      onClick={() => navigateToItem(text.toLowerCase())}
                      className="rounded bg-purple-100 px-1.5 py-0.5 font-mono text-xs text-[#6c5ce7] hover:bg-purple-200"
                    >
                      {text}
                    </button>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {outfit.body}
          </ReactMarkdown>
        </div>

        {/* Item thumbnails (closet mode only) */}
        {mode === "closet" && outfit.itemIds.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 text-xs font-medium text-zinc-500">
              本套用到的单品
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {outfit.itemIds.map((id) => (
                <button
                  key={id}
                  onClick={() => navigateToItem(id)}
                  className="flex-shrink-0"
                  title={id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemImageUrl(id)}
                    alt={id}
                    className="h-20 w-20 rounded-xl border border-zinc-100 object-cover transition hover:border-[#6c5ce7]"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scene generation */}
      <div className="border-t border-zinc-100 bg-zinc-50/50 p-4">
        {!sceneImage && !sceneLoading && (
          <button
            onClick={generate}
            disabled={!face || (mode === "closet" && outfit.itemIds.length === 0)}
            className="w-full rounded-xl border border-[#6c5ce7] bg-white py-2.5 text-sm font-medium text-[#6c5ce7] transition hover:bg-[#f5f3ff] disabled:opacity-50"
          >
            ✨ 为这套生成场景图
            {mode === "closet" && outfit.itemIds.length > 0 && (
              <span className="ml-1 text-xs text-zinc-500">
                ({outfit.itemIds.length} 件)
              </span>
            )}
          </button>
        )}
        {sceneLoading && (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-zinc-500">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-300 border-t-[#6c5ce7]" />
            <div>AI 正在画场景图…通常 30~90 秒</div>
            {canCloset && (
              <div className="text-xs text-zinc-400">
                喂入 face + {outfit.itemIds.slice(0, 4).length} 件衣物图
              </div>
            )}
          </div>
        )}
        {sceneError && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {sceneError}
          </div>
        )}
        {sceneImage && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sceneImage}
              alt={outfit.title || "scene"}
              onClick={() => onOpenImage(sceneImage)}
              className="w-full cursor-zoom-in rounded-xl"
            />
            <div className="mt-2 flex gap-2 text-xs text-zinc-400">
              <span>已存入图库</span>
              <span>·</span>
              <a
                href={sceneImage}
                download={`scene-${occasion}.png`}
                className="text-[#6c5ce7] hover:underline"
              >
                下载
              </a>
              <span>·</span>
              <button
                onClick={generate}
                className="text-[#6c5ce7] hover:underline"
              >
                再来一张
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────

function BoardSection({
  outfitCount,
  boardImage,
  loading,
  error,
  disabled,
  occasion,
  onGenerate,
  onOpenImage,
}: {
  outfitCount: number;
  boardImage: string | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  occasion: string;
  onGenerate: () => void;
  onOpenImage: (url: string) => void;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[#6c5ce7]/20 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            🎨 一张图看全部搭配
          </div>
          <div className="text-xs text-zinc-500">
            杂志风总览，{outfitCount} 套同框
          </div>
        </div>
      </div>
      {!boardImage && !loading && (
        <button
          onClick={onGenerate}
          disabled={disabled}
          className="w-full rounded-xl bg-[#6c5ce7] py-2.5 text-sm font-medium text-white transition hover:bg-[#5a4bd6] disabled:opacity-50"
        >
          生成搭配总览图 ({outfitCount} 套)
        </button>
      )}
      {loading && (
        <div className="flex flex-col items-center gap-2 py-6 text-sm text-zinc-500">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-300 border-t-[#6c5ce7]" />
          <div>AI 正在排版总览图…通常 60~120 秒</div>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {boardImage && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={boardImage}
            alt="搭配总览"
            onClick={() => onOpenImage(boardImage)}
            className="w-full cursor-zoom-in rounded-xl"
          />
          <div className="mt-2 flex gap-2 text-xs text-zinc-400">
            <span>已存入图库</span>
            <span>·</span>
            <a
              href={boardImage}
              download={`board-${occasion}.png`}
              className="text-[#6c5ce7] hover:underline"
            >
              下载
            </a>
            <span>·</span>
            <button
              onClick={onGenerate}
              className="text-[#6c5ce7] hover:underline"
            >
              再来一张
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

function SavedScenesStrip({
  scenes,
  onOpen,
}: {
  scenes: LibraryRecord[];
  onOpen: (url: string) => void;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 font-serif text-base font-semibold">我的搭配 ({scenes.length})</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {scenes.slice(0, 12).map((rec) => (
          <Thumb key={rec.id} rec={rec} onClick={onOpen} />
        ))}
      </div>
    </div>
  );
}

function Thumb({ rec, onClick }: { rec: LibraryRecord; onClick: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(rec.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [rec.blob]);
  if (!url) return null;
  return (
    <button onClick={() => onClick(url)} className="flex-shrink-0" title={rec.note}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={rec.note ?? ""}
        className="h-24 w-16 rounded-xl border border-zinc-100 object-cover transition hover:border-[#6c5ce7]"
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[95vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
      />
      <button
        onClick={onClose}
        aria-label="关闭"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl"
      >
        ×
      </button>
    </div>
  );
}
