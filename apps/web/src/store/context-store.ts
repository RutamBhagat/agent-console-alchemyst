import { create } from "zustand";

import type { JsonEvent, JsonValue, TraceDirection } from "./trace-store";

type ContextSnapshot = {
  seq: number;
  data: JsonValue;
};

type ContextState = {
  contexts: Record<string, ContextSnapshot[]>;
  activeContextId: string | null;
  setActiveContextId: (contextId: string) => void;
  applyTraceEvent: (direction: TraceDirection, event: JsonEvent) => void;
};

export const useContextStore = create<ContextState>((set) => ({
  contexts: {},
  activeContextId: null,
  setActiveContextId: (contextId) => set({ activeContextId: contextId }),
  applyTraceEvent: (direction, event) =>
    set((state) => applyContextTraceEvent(state, direction, event)),
}));

function applyContextTraceEvent(
  state: Pick<ContextState, "contexts" | "activeContextId">,
  direction: TraceDirection,
  event: JsonEvent,
): Pick<ContextState, "contexts" | "activeContextId"> {
  if (direction !== "server->worker") return state;
  if (event.type !== "CONTEXT_SNAPSHOT") return state;
  if (typeof event.context_id !== "string") return state;
  if (typeof event.seq !== "number") return state;
  if (!isJsonLike(event.data)) return state;

  const current = state.contexts[event.context_id] ?? [];
  if (current.some((snapshot) => snapshot.seq === event.seq)) return state;

  return {
    activeContextId: state.activeContextId ?? event.context_id,
    contexts: {
      ...state.contexts,
      [event.context_id]: [
        ...current,
        { seq: event.seq, data: event.data },
      ].sort((left, right) => left.seq - right.seq),
    },
  };
}

function isJsonLike(value: unknown): value is JsonValue {
  return (
    value === null ||
    ["string", "number", "boolean", "object"].includes(typeof value)
  );
}
