import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { FakeWebSocket, installWorkerFakes } from "../utils/worker-fakes";

let workerScope: ReturnType<typeof installWorkerFakes>;

beforeEach(() => {
  workerScope = installWorkerFakes();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("buffers out-of-order socket messages before patching state", async () => {
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  FakeWebSocket.latest?.serverMessage(
    JSON.stringify({ type: "TOKEN", seq: 2, text: "two", stream_id: "s1" }),
  );
  FakeWebSocket.latest?.serverMessage(
    JSON.stringify({ type: "TOKEN", seq: 1, text: "one", stream_id: "s1" }),
  );

  expect(workerScope.messages).toEqual([
    {
      type: "clientEvent",
      direction: "in",
      message: { type: "TOKEN", seq: 2, text: "two", stream_id: "s1" },
    },
    {
      type: "clientEvent",
      direction: "in",
      message: { type: "TOKEN", seq: 1, text: "one", stream_id: "s1" },
    },
    {
      type: "statePatch",
      chat: { type: "TOKEN", seq: 1, text: "one", stream_id: "s1" },
    },
    {
      type: "statePatch",
      chat: { type: "TOKEN", seq: 2, text: "two", stream_id: "s1" },
    },
  ]);
});

test("drops duplicate socket messages before patching state", async () => {
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  FakeWebSocket.latest?.serverMessage(
    JSON.stringify({ type: "TOKEN", seq: 1, text: "one", stream_id: "s1" }),
  );
  FakeWebSocket.latest?.serverMessage(
    JSON.stringify({ type: "TOKEN", seq: 1, text: "one", stream_id: "s1" }),
  );

  expect(workerScope.messages).toEqual([
    {
      type: "clientEvent",
      direction: "in",
      message: { type: "TOKEN", seq: 1, text: "one", stream_id: "s1" },
    },
    {
      type: "statePatch",
      chat: { type: "TOKEN", seq: 1, text: "one", stream_id: "s1" },
    },
    {
      type: "clientEvent",
      direction: "in",
      message: { type: "TOKEN", seq: 1, text: "one", stream_id: "s1" },
    },
  ]);
});

test("resumes from last applied seq when ping exposes a gap", async () => {
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  const server = FakeWebSocket.latest;

  server?.serverMessage(
    JSON.stringify({ type: "TOKEN", seq: 1, text: "one", stream_id: "s1" }),
  );
  server?.serverMessage(
    JSON.stringify({ type: "PING", seq: 3, challenge: "hb" }),
  );

  expect(FakeWebSocket.latest).toBe(server);
  expect(server?.sent).toEqual([
    JSON.stringify({ type: "PONG", echo: "hb" }),
    JSON.stringify({ type: "RESUME", last_seq: 1 }),
  ]);
});
