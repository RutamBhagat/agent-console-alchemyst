import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { FakeWebSocket, installWorkerFakes } from "../utils/worker-fakes";

let workerScope: ReturnType<typeof installWorkerFakes>;

beforeEach(() => {
  workerScope = installWorkerFakes();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("sends user messages through the open socket", async () => {
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  workerScope.uiMessage({ type: "sendUserMessage", content: "hello" });

  expect(FakeWebSocket.latest?.sent).toEqual([
    JSON.stringify({ type: "USER_MESSAGE", content: "hello" }),
  ]);
  expect(workerScope.messages).toEqual([
    { type: "connectionStatus", status: "connecting", reconnectDelayMs: 0 },
    {
      type: "clientEvent",
      direction: "out",
      message: { type: "USER_MESSAGE", content: "hello" },
    },
  ]);
});

test("reconnects and resends the active user message after socket close", async () => {
  vi.useFakeTimers();
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  const firstSocket = FakeWebSocket.latest;
  workerScope.uiMessage({ type: "sendUserMessage", content: "hello" });

  firstSocket?.serverClose();
  expect(FakeWebSocket.latest).toBe(firstSocket);
  await vi.advanceTimersByTimeAsync(500);
  const retrySocket = FakeWebSocket.latest;
  retrySocket?.open();

  expect(retrySocket).not.toBe(firstSocket);
  expect(retrySocket?.sent).toEqual([
    JSON.stringify({ type: "USER_MESSAGE", content: "hello" }),
  ]);
  expect(workerScope.messages).toEqual([
    { type: "connectionStatus", status: "connecting", reconnectDelayMs: 0 },
    {
      type: "clientEvent",
      direction: "out",
      message: { type: "USER_MESSAGE", content: "hello" },
    },
    { type: "retryUserMessage", content: "hello" },
    {
      type: "connectionStatus",
      status: "reconnecting",
      reconnectDelayMs: 500,
    },
    { type: "connectionStatus", status: "reconnecting", reconnectDelayMs: 0 },
    { type: "connectionStatus", status: "connected" },
    {
      type: "clientEvent",
      direction: "out",
      message: { type: "USER_MESSAGE", content: "hello" },
    },
  ]);
});
