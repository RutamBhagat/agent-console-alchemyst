import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { FakeWebSocket, installWorkerFakes } from "../utils/worker-fakes";

let workerScope: ReturnType<typeof installWorkerFakes>;

beforeEach(() => {
  workerScope = installWorkerFakes();
});

afterEach(() => {
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
    {
      type: "clientEvent",
      direction: "out",
      message: { type: "USER_MESSAGE", content: "hello" },
    },
  ]);
});

test("reconnects and resends the active user message after socket close", async () => {
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  const firstSocket = FakeWebSocket.latest;
  workerScope.uiMessage({ type: "sendUserMessage", content: "hello" });

  firstSocket?.serverClose();
  const retrySocket = FakeWebSocket.latest;
  retrySocket?.open();

  expect(retrySocket).not.toBe(firstSocket);
  expect(retrySocket?.sent).toEqual([
    JSON.stringify({ type: "USER_MESSAGE", content: "hello" }),
  ]);
  expect(workerScope.messages).toEqual([
    {
      type: "clientEvent",
      direction: "out",
      message: { type: "USER_MESSAGE", content: "hello" },
    },
    { type: "retryUserMessage", content: "hello" },
    {
      type: "clientEvent",
      direction: "out",
      message: { type: "USER_MESSAGE", content: "hello" },
    },
  ]);
});
