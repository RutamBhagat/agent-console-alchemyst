import { create } from "zustand";

export type ConnectionStatus = "connected" | "connecting" | "reconnecting";

interface UtilState {
  connectionStatus: ConnectionStatus;
  reconnectDelayMs: number;
  fullscreen: boolean;
  mode: "auto" | "manual";
  setConnectionStatus: (
    status: ConnectionStatus,
    reconnectDelayMs?: number,
  ) => void;
  toggleFullscreen: () => void;
  toggleMode: () => void;
}

export const useUtilStore = create<UtilState>((set) => ({
  connectionStatus: "connecting",
  reconnectDelayMs: 0,
  fullscreen: false,
  mode: "auto",
  setConnectionStatus: (connectionStatus, reconnectDelayMs = 0) =>
    set({ connectionStatus, reconnectDelayMs }),
  toggleFullscreen: () =>
    set((state) => ({ fullscreen: !state.fullscreen })),
  toggleMode: () =>
    set((state) => ({ mode: state.mode === "auto" ? "manual" : "auto" })),
}));
