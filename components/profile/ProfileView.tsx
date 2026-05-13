"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchStyleProfile, saveStyleProfile, fetchSummary } from "@/lib/api";
import type { StyleProfile, OutfitRecord } from "@/lib/types";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";

const STYLE_OPTIONS = [
  { name: "老钱风", icon: "👑", tags: ["低调奢华", "质感面料", "经典剪裁", "高级配色"] },
  { name: "韩系温柔", icon: "💗", tags: ["柔和色调", "oversized", "叠穿", "精致感"] },
  { name: "日系清新", icon: "🍃", tags: ["素雅", "自然面料", "文艺", "舒适感"] },
  { name: "美式复古", icon: "🚗", tags: ["丹宁", "棒球帽", "工装", "vintage"] },
  { name: "辣妹风", icon: "🔥", tags: ["修身", "露肤", "高跟", "性感"] },
  { name: "极简高级", icon: "💎", tags: ["无印良品", "中性色", "建筑感", "Less is more"] },
  { name: "街头潮牌", icon: "🎧", tags: ["logo", "球鞋", "宽松", "大胆配色"] },
  { name: "法式慵懒", icon: "☕", tags: ["碎花", "丝巾", "裸妆感", "effortless"] },
  { name: "暗黑机能", icon: "⚡", tags: ["全黑", "多口袋", "户外面料", "未来感"] },
  { name: "新中式", icon: "🎨", tags: ["盘扣", "国风印花", "水墨", "东方美"] },
];

export default function ProfileView() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [outfits, setOutfits] = useState<OutfitRecord[]>([]);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s] = await Promise.all([
        fetchStyleProfile().catch(() => ({ styles: [], likes: [], onboarded: false })),
        fetchSummary().catch(() => ({ total: 0, by_category: {}, recent_outfits: [] })),
      ]);
      setProfile(p);
      setSelected(p.styles || []);
      setOutfits(s.recent_outfits || []);
      if (!p.onboarded) setShowOnboarding(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStyle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const p = await saveStyleProfile(selected);
      setProfile(p);
      setDirty(false);
      setShowOnboarding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="加载个人信息..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const styleGrid = (
    <div className="grid grid-cols-2 gap-3">
      {STYLE_OPTIONS.map((s) => {
        const active = selected.includes(s.name);
        return (
          <button
            key={s.name}
            onClick={() => toggleStyle(s.name)}
            className={[
              "relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all duration-200",
              active
                ? "border-[#6c5ce7] bg-purple-50 shadow-sm"
                : "border-zinc-100 bg-white hover:border-[#6c5ce7]",
            ].join(" ")}
          >
            {active && (
              <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#6c5ce7] text-xs text-white">✓</div>
            )}
            <div className="text-2xl">{s.icon}</div>
            <div className="text-sm font-semibold">{s.name}</div>
            <div className="flex flex-wrap gap-1">
              {s.tags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">{t}</span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );

  // Onboarding overlay
  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#faf7f2] p-5">
        <div className="mb-4 text-center">
          <h2 className="font-serif text-2xl font-semibold">选择你的风格</h2>
          <p className="mt-1 text-sm text-zinc-500">至少选择 1 个，帮助 AI 了解你</p>
        </div>
        <div className="flex-1 overflow-y-auto pb-20">
          {styleGrid}
        </div>
        <div className="fixed inset-x-0 bottom-0 bg-[#faf7f2] p-5 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={handleSave}
            disabled={selected.length === 0 || saving}
            className="w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6] disabled:opacity-50"
          >
            {saving ? "保存中..." : "开始使用"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Style preferences */}
      <div className="mb-4">
        <h3 className="mb-3 font-serif text-lg font-semibold">风格偏好</h3>
        {styleGrid}
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-medium text-white transition hover:bg-[#5a4bd6] disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存偏好"}
          </button>
        )}
      </div>

      {/* Outfit history */}
      <div>
        <h3 className="mb-3 font-serif text-lg font-semibold">穿搭记录</h3>
        {outfits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-400">
            还没有穿搭记录
          </div>
        ) : (
          <div className="space-y-2">
            {outfits.map((o, i) => (
              <div key={i} className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{o.occasion}</span>
                  <span className="text-xs text-zinc-400">{o.date}</span>
                </div>
                {o.notes && <p className="mt-1 text-xs text-zinc-500">{o.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
