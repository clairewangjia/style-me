"use client";

import type { TabId } from "@/lib/types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "wardrobe", label: "衣橱", icon: "👕" },
  { id: "recommend", label: "推荐", icon: "👗" },
  { id: "analysis", label: "分析", icon: "✨" },
  { id: "profile", label: "我的", icon: "👤" },
];

interface TabBarProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-5xl">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-all duration-200",
                isActive ? "text-[#6c5ce7]" : "text-zinc-400",
              ].join(" ")}
            >
              {isActive && (
                <div className="absolute top-0 h-0.5 w-10 rounded-full bg-[#6c5ce7]" />
              )}
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={isActive ? "font-medium" : ""}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
