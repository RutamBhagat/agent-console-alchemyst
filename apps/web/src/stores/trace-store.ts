import { create } from "zustand";
import type { ClientMessage } from "../../../agent-server/src/types";
import type { ServerMessage } from "../../../agent-server/src/types";

type TokenBatchMessage = {
  type: "TOKEN";
  firstSeq: number;
  lastSeq: number;
  stream_id: string;
  count: number;
};

export type StoredTraceEvent =
  | TraceEvent
  | { type: "clientEvent"; direction: "in"; message: TokenBatchMessage };

export type TraceEvent =
  | { type: "clientEvent"; direction: "in"; message: ServerMessage }
  | { type: "clientEvent"; direction: "out"; message: ClientMessage };

interface TraceState {
  events: StoredTraceEvent[];
  addTraceEvent: (event: TraceEvent) => void;
  clearTraceEvents: () => void;
}

export const useTraceStore = create<TraceState>((set) => ({
  events: [],
  addTraceEvent: (event) =>
    set((state) => ({
      events: upsertTraceEvent(state.events, event).slice(-200),
    })),
  clearTraceEvents: () => set({ events: [] }),
}));

function upsertTraceEvent(
  events: StoredTraceEvent[],
  event: TraceEvent,
): StoredTraceEvent[] {
  if (event.direction === "out") {
    return [...events, event];
  }

  if (event.message.type !== "TOKEN") {
    return [...events, event];
  }

  let index = -1;
  for (let itemIndex = events.length - 1; itemIndex >= 0; itemIndex -= 1) {
    const item = events[itemIndex];
    if (
      item.direction === "in" &&
      item.message.type === "TOKEN" &&
      "count" in item.message &&
      item.message.stream_id === event.message.stream_id
    ) {
      index = itemIndex;
      break;
    }
  }

  if (index === -1) {
    return [
      ...events,
      {
        type: "clientEvent",
        direction: "in",
        message: {
          type: "TOKEN",
          firstSeq: event.message.seq,
          lastSeq: event.message.seq,
          stream_id: event.message.stream_id,
          count: 1,
        },
      },
    ];
  }

  return events.map((item, itemIndex) =>
    itemIndex === index &&
    item.direction === "in" &&
    item.message.type === "TOKEN" &&
    "count" in item.message
      ? {
          type: "clientEvent",
          direction: "in",
          message: {
            ...item.message,
            lastSeq: event.message.seq,
            count: item.message.count + 1,
          },
        }
      : item,
  );
}
