"use client";

// Cross-tab navigation context. Lifts the current tab + an optional
// focusItemId from app/page.tsx so child views can:
//   - jump to another tab (e.g. recommend → wardrobe)
//   - request that wardrobe scroll-to / highlight a specific item.

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TabId } from "@/lib/types";

interface NavState {
  tab: TabId;
  focusItemId: string | null;
  setTab: (tab: TabId) => void;
  navigateToItem: (itemId: string) => void;
  clearFocus: () => void;
}

const NavCtx = createContext<NavState | null>(null);

export function NavProvider({
  children,
  initialTab = "wardrobe",
}: {
  children: ReactNode;
  initialTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);

  const navigateToItem = (itemId: string) => {
    setFocusItemId(itemId);
    setTab("wardrobe");
  };

  const clearFocus = () => setFocusItemId(null);

  return (
    <NavCtx.Provider value={{ tab, focusItemId, setTab, navigateToItem, clearFocus }}>
      {children}
    </NavCtx.Provider>
  );
}

export function useNav(): NavState {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used inside <NavProvider>");
  return ctx;
}
