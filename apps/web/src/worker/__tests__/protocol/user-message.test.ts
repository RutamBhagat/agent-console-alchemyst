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
