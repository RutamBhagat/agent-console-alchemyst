import type { ServerMessage } from "./types/serverToClient";

export function createSequenceGate() {
  let nextExpectedSeq = 1;
  let lastAppliedSeq = 0;
  const pending = new Map<number, ServerMessage>();

  return {
    get lastAppliedSeq() {
      return lastAppliedSeq;
    },
    get hasGap() {
      return pending.size > 0 && !pending.has(nextExpectedSeq);
    },
    reset() {
      nextExpectedSeq = 1;
      lastAppliedSeq = 0;
      pending.clear();
    },
    accept(message: ServerMessage) {
      if (message.seq < nextExpectedSeq || pending.has(message.seq)) return [];

      pending.set(message.seq, message);

      const ready: ServerMessage[] = [];
      for (;;) {
        const next = pending.get(nextExpectedSeq);
        if (next === undefined) return ready;

        pending.delete(nextExpectedSeq);
        if (next.type !== "PING") ready.push(next);
        lastAppliedSeq = nextExpectedSeq;
        nextExpectedSeq++;
      }
    },
  };
}
