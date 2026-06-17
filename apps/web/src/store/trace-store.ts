import { create } from "zustand";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonEvent = { [key: string]: JsonValue };
export type TraceDirection = "worker->server" | "server->worker";

export type TraceEntry = {
  id: number;
  direction: TraceDirection;
  event: JsonEvent;
};

type TraceState = {
  traces: TraceEntry[];
  addTrace: (direction: TraceDirection, event: JsonEvent) => void;
};

let nextTraceId = 1;

export function isJsonEvent(value: unknown): value is JsonEvent {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const useTraceStore = create<TraceState>((set) => ({
  traces: [],
  addTrace: (direction, event) =>
    set((state) => ({
      traces: [...state.traces, { id: nextTraceId++, direction, event }],
    })),
}));
