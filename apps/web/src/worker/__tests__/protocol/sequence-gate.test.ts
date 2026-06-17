import { expect, test } from "vitest";

import { createSequenceGate } from "../../sequence-gate";
import type { ServerMessage } from "../../types/serverToClient";

function token(seq: number, text = String(seq)): ServerMessage {
  return { type: "TOKEN", seq, text, stream_id: "s1" };
}

test("buffers shuffled messages until they are contiguous", () => {
  const gate = createSequenceGate();

  expect(gate.accept(token(3))).toEqual([]);
  expect(gate.accept(token(1))).toEqual([token(1)]);
  expect(gate.accept(token(2))).toEqual([token(2), token(3)]);
  expect(gate.lastAppliedSeq).toBe(3);
});

test("drops duplicate messages", () => {
  const gate = createSequenceGate();

  expect(gate.accept(token(1))).toEqual([token(1)]);
  expect(gate.accept(token(1))).toEqual([]);
  expect(gate.accept(token(3))).toEqual([]);
  expect(gate.accept(token(3))).toEqual([]);
  expect(gate.accept(token(2))).toEqual([token(2), token(3)]);
});

test("reset starts a new turn at seq one", () => {
  const gate = createSequenceGate();

  expect(gate.accept(token(1))).toEqual([token(1)]);
  gate.reset();

  expect(gate.accept(token(1, "new"))).toEqual([token(1, "new")]);
  expect(gate.lastAppliedSeq).toBe(1);
});

test("pings advance sequence without reaching reducers", () => {
  const gate = createSequenceGate();
  const ping: ServerMessage = { type: "PING", seq: 2, challenge: "ok" };

  expect(gate.accept(token(1))).toEqual([token(1)]);
  expect(gate.accept(ping)).toEqual([]);
  expect(gate.accept(token(3))).toEqual([token(3)]);
  expect(gate.lastAppliedSeq).toBe(3);
});

test("reports gaps without skipping them", () => {
  const gate = createSequenceGate();

  expect(gate.accept(token(2))).toEqual([]);
  expect(gate.hasGap).toBe(true);
  expect(gate.accept(token(1))).toEqual([token(1), token(2)]);
  expect(gate.hasGap).toBe(false);
});
