import { create } from "zustand";

type UiState = {
  autoScroll: boolean;
  toggleAutoScroll: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  autoScroll: true,
  toggleAutoScroll: () => set((state) => ({ autoScroll: !state.autoScroll })),
}));
