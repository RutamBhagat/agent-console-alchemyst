import { create } from "zustand";

interface ScrollState {
  mode: "auto" | "manual";
  toggleMode: () => void;
}

export const useScrollStore = create<ScrollState>((set) => ({
  mode: "auto",
  toggleMode: () =>
    set((state) => ({ mode: state.mode === "auto" ? "manual" : "auto" })),
}));
