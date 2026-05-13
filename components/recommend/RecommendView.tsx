"use client";

import { useState } from "react";
import { recommend } from "@/lib/api";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";

const QUICK_TAGS = ["上班", "约会", "面试", "运动", "逛街", "聚餐", "居家"];
const TRAVEL_DURATIONS = ["1天", "3天", "5天", "7天", "自定义"];
const TRAVEL_TYPES = ["城市漫步", "户外徒步", "海岛度假", "商务出差", "文艺探店"];

export default function RecommendView() {
  const [mode, setMode] = useState<"quick" | "travel">("quick");
  const [occasion, setOccasion] = useState("");
  const [travelDest, setTravelDest] = useState("");
  const [travelDuration, setTravelDuration] = useState("3天");
  const [customDuration, setCustomDuration] = useState("");
  const [travelTemp, setTravelTemp] = useState("");
  const [travelType, setTravelType] = useState("");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let occ: string;
      let weather: string | undefined;

      if (mode === "travel") {
        const dur = travelDuration === "自定义" ? customDuration : travelDuration;
        occ = `旅行：${travelDest || "未知目的地"} ${dur}${travelType ? " " + travelType : ""}`;
        weather = travelTemp || undefined;
      } else {
        occ = occasion || "日常";
      }

      const res = await recommend({ occasion: occ, weather, extra: extra || undefined });
      setResult(res.recommendation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "推荐失败");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setOccasion("");
    setExtra("");
    setTravelDest("");
    setTravelDuration("3天");
    setCustomDuration("");
    setTravelTemp("");
    setTravelType("");
  };

  if (loading) return <LoadingState text="AI 正在搭配中..." />;

  if (result) {
    return (
      <div className="pb-4">
        <div className="mb-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-serif text-lg font-semibold">穿搭推荐</h3>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{result}</div>
        </div>
        <button
          onClick={reset}
          className="w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6]"
        >
          重新推荐
        </button>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={handleSubmit} />;

  return (
    <div className="pb-4">
      {/* Mode toggle */}
      <div className="mb-4 flex gap-1 rounded-full border border-zinc-200 bg-white p-1">
        <button
          onClick={() => setMode("quick")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200 ${mode === "quick" ? "bg-[#6c5ce7] text-white" : "text-zinc-600"}`}
        >
          快速推荐
        </button>
        <button
          onClick={() => setMode("travel")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200 ${mode === "travel" ? "bg-[#6c5ce7] text-white" : "text-zinc-600"}`}
        >
          旅行模式
        </button>
      </div>

      {mode === "quick" ? (
        /* Quick tags */
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
        /* Travel mode */
        <div className="mb-4 space-y-3">
          <div>
            <div className="mb-1 text-sm font-medium text-zinc-600">目的地</div>
            <input
              type="text"
              placeholder="如：东京、大理、巴黎"
              value={travelDest}
              onChange={(e) => setTravelDest(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
            />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-zinc-600">天数</div>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setTravelDuration(d)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                    travelDuration === d
                      ? "bg-[#6c5ce7] text-white"
                      : "bg-white text-zinc-700 border border-zinc-200",
                  ].join(" ")}
                >
                  {d}
                </button>
              ))}
            </div>
            {travelDuration === "自定义" && (
              <input
                type="text"
                placeholder="如：10天"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
              />
            )}
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-zinc-600">温度范围</div>
            <input
              type="text"
              placeholder="如：15-25度"
              value={travelTemp}
              onChange={(e) => setTravelTemp(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
            />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-zinc-600">旅行类型</div>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTravelType(t === travelType ? "" : t)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                    travelType === t
                      ? "bg-[#6c5ce7] text-white"
                      : "bg-white text-zinc-700 border border-zinc-200",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extra */}
      <div className="mb-4">
        <div className="mb-1 text-sm font-medium text-zinc-600">额外要求</div>
        <input
          type="text"
          placeholder="如：想穿得显瘦、不想穿裙子"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#6c5ce7]"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={mode === "quick" && !occasion}
        className="w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6] disabled:opacity-50"
      >
        获取推荐
      </button>
    </div>
  );
}
