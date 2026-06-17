import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { FakeWebSocket, installWorkerFakes } from "../utils/worker-fakes";

let workerScope: ReturnType<typeof installWorkerFakes>;

beforeEach(() => {
  workerScope = installWorkerFakes();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("pongs every ping challenge", async () => {
  const worker = await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  const server = FakeWebSocket.latest;
  expect(server).toBe(worker.socket);

  server?.serverMessage(
    JSON.stringify({ type: "PING", seq: 1, challenge: "" }),
  );

  expect(server?.sent).toEqual([JSON.stringify({ type: "PONG", echo: "" })]);
  expect(workerScope.messages).toEqual([
    {
      type: "clientEvent",
      direction: "in",
      message: { type: "PING", seq: 1, challenge: "" },
    },
    {
      type: "clientEvent",
      direction: "out",
      message: { type: "PONG", echo: "" },
    },
  ]);
});

test("does not pong duplicate or replayed pings", async () => {
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  FakeWebSocket.latest?.serverMessage(
    JSON.stringify({ type: "PING", seq: 1, challenge: "first" }),
  );
  FakeWebSocket.latest?.serverMessage(
    JSON.stringify({ type: "PING", seq: 1, challenge: "first" }),
  );

  expect(FakeWebSocket.latest?.sent).toEqual([
    JSON.stringify({ type: "PONG", echo: "first" }),
  ]);
});

test("reports corrupt server messages without sending pong", async () => {
  await import("../../agent-worker");

  workerScope.uiMessage({ type: "connect", url: "ws://test/ws" });
  FakeWebSocket.latest?.serverMessage("{ nope");
  FakeWebSocket.latest?.serverMessage(JSON.stringify({ type: "PING", seq: 2 }));

  expect(FakeWebSocket.latest?.sent).toEqual([]);
  expect(workerScope.messages).toEqual([
    { type: "protocolViolation", error: "Invalid WebSocket frame" },
    expect.objectContaining({ type: "protocolViolation" }),
  ]);
});
