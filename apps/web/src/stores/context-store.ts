import { create } from "zustand";
import type { ContextSnapshotMessage } from "@/worker/types/serverToClient";

interface ContextState {
  contexts: Record<string, ContextSnapshotMessage[]>;
  addContextSnapshot: (snapshot: ContextSnapshotMessage) => void;
}

export const useContextStore = create<ContextState>((set) => ({
  contexts: {},
  addContextSnapshot: (snapshot) =>
    set((state) => ({
      contexts: {
        ...state.contexts,
        [snapshot.context_id]: [
          ...(state.contexts[snapshot.context_id] ?? []),
          snapshot,
        ],
      },
    })),
}));
