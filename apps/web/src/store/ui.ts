"use client";

import { create } from "zustand";

type UiState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  chatAgentMode: boolean;
  setChatAgentMode: (value: boolean) => void;
  chatModelId: string | null;
  setChatModelId: (value: string | null) => void;
  lastStudioProjectId: string | null;
  setLastStudioProjectId: (value: string | null) => void;
};

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  chatAgentMode: readLocal("astra-agent-mode") === "1",
  setChatAgentMode: (value) => {
    try {
      window.localStorage.setItem("astra-agent-mode", value ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ chatAgentMode: value });
  },
  chatModelId: readLocal("astra-model-id"),
  setChatModelId: (value) => {
    try {
      if (value) window.localStorage.setItem("astra-model-id", value);
      else window.localStorage.removeItem("astra-model-id");
    } catch {
      /* ignore */
    }
    set({ chatModelId: value });
  },
  lastStudioProjectId: readLocal("astra-project-id"),
  setLastStudioProjectId: (value) => {
    try {
      if (value) window.localStorage.setItem("astra-project-id", value);
    } catch {
      /* ignore */
    }
    set({ lastStudioProjectId: value });
  },
}));
