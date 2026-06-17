import { create } from "zustand";

interface UtilState {
  fullscreen: boolean;
  mode: "auto" | "manual";
  toggleFullscreen: () => void;
  toggleMode: () => void;
}

export const useUtilStore = create<UtilState>((set) => ({
  fullscreen: false,
  mode: "auto",
  toggleFullscreen: () =>
    set((state) => ({ fullscreen: !state.fullscreen })),
  toggleMode: () =>
    set((state) => ({ mode: state.mode === "auto" ? "manual" : "auto" })),
}));
