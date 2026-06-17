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

type TokenTraceEntry = TraceEntry & {
  direction: "server->worker";
  event: JsonEvent & {
    type: "TOKEN";
    stream_id: string;
    text: string;
    seq_range: string;
    token_count: number;
    seq?: JsonValue;
  };
  tokenParts: Map<number, string>;
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
      traces: addTraceEntry(state.traces, direction, event),
    })),
}));
function addTraceEntry(
  traces: TraceEntry[],
  direction: TraceDirection,
  event: JsonEvent,
): TraceEntry[] {
  if (isTokenEvent(direction, event)) return mergeTokenTrace(traces, event);

  return [...traces, { id: nextTraceId++, direction, event: { ...event } }];
}

function isTokenEvent(
  direction: TraceDirection,
  event: JsonEvent,
): event is JsonEvent & {
  type: "TOKEN";
  stream_id: string;
  text: string;
  seq: number;
} {
  return (
    direction === "server->worker" &&
    event.type === "TOKEN" &&
    typeof event.stream_id === "string" &&
    typeof event.text === "string" &&
    typeof event.seq === "number"
  );
}
function mergeTokenTrace(
  traces: TraceEntry[],
  event: JsonEvent & {
    type: "TOKEN";
    stream_id: string;
    text: string;
    seq: number;
  },
): TraceEntry[] {
  const index = traces.findIndex(
    (trace) =>
      trace.direction === "server->worker" &&
      trace.event.type === "TOKEN" &&
      trace.event.stream_id === event.stream_id,
  );

  if (index === -1) {
    const tokenParts = new Map([[event.seq, event.text]]);
    return [...traces, createTokenTrace(nextTraceId++, event.stream_id, tokenParts)];
  }
  const current = traces[index] as TokenTraceEntry;
  const tokenParts = new Map(current.tokenParts);
  tokenParts.set(event.seq, event.text);

  const next = traces.slice();
  next[index] = createTokenTrace(current.id, event.stream_id, tokenParts);
  return next;
}

function createTokenTrace(
  id: number,
  streamId: string,
  tokenParts: Map<number, string>,
): TokenTraceEntry {
  const ordered = [...tokenParts.entries()].sort(([leftSeq], [rightSeq]) =>
    leftSeq - rightSeq,
  );
  const seqs = ordered.map(([seq]) => seq);
  const firstSeq = seqs[0];
  const lastSeq = seqs.at(-1);
  const text = ordered.map(([, part]) => part).join("");

  return {
    id,
    direction: "server->worker",
    event: {
      type: "TOKEN",
      seq: firstSeq,
      seq_range:
        firstSeq === lastSeq ? String(firstSeq) : `${firstSeq}-${lastSeq}`,
      stream_id: streamId,
      text,
      token_count: ordered.length,
    },
    tokenParts,
  };
}
