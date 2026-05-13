"use client";

import { useState } from "react";
import type { TabId } from "@/lib/types";
import TabBar from "@/components/TabBar";
import WardrobeView from "@/components/wardrobe/WardrobeView";
import RecommendView from "@/components/recommend/RecommendView";
import AnalysisView from "@/components/analysis/AnalysisView";
import ProfileView from "@/components/profile/ProfileView";

export default function Home() {
  const [tab, setTab] = useState<TabId>("wardrobe");

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6">
        {/* Page header */}
        <header className="mb-4">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            {tab === "wardrobe" && "我的衣橱"}
            {tab === "recommend" && "穿搭推荐"}
            {tab === "analysis" && "形象分析"}
            {tab === "profile" && "个人中心"}
          </h1>
        </header>

        {/* Tab content — lazy mount to avoid redundant API calls */}
        {tab === "wardrobe" && <WardrobeView />}
        {tab === "recommend" && <RecommendView />}
        {tab === "analysis" && <AnalysisView />}
        {tab === "profile" && <ProfileView />}
      </main>

      <TabBar active={tab} onChange={setTab} />
    </>
  );
}
