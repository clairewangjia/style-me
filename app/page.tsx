"use client";

import type { TabId } from "@/lib/types";
import { NavProvider, useNav } from "@/lib/nav";
import TabBar from "@/components/TabBar";
import WardrobeView from "@/components/wardrobe/WardrobeView";
import RecommendView from "@/components/recommend/RecommendView";
import AnalysisView from "@/components/analysis/AnalysisView";
import ProfileView from "@/components/profile/ProfileView";

const TAB_TITLE: Record<TabId, string> = {
  wardrobe: "我的衣橱",
  recommend: "穿搭推荐",
  analysis: "形象分析",
  profile: "个人中心",
};

function HomeInner() {
  const { tab, setTab } = useNav();

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6">
        <header className="mb-4">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            {TAB_TITLE[tab]}
          </h1>
        </header>

        {tab === "wardrobe" && <WardrobeView />}
        {tab === "recommend" && <RecommendView />}
        {tab === "analysis" && <AnalysisView />}
        {tab === "profile" && <ProfileView />}
      </main>

      <TabBar active={tab} onChange={setTab} />
    </>
  );
}

export default function Home() {
  return (
    <NavProvider>
      <HomeInner />
    </NavProvider>
  );
}
