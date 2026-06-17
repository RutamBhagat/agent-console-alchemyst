import { createReconnectController } from "./reconnect-controller";
import { SequenceGate, type JsonEvent } from "./sequence-gate";
import { createStreamStallWatchdog } from "./stream-stall-watchdog";

type TraceDirection = "worker->server" | "server->worker";

type WorkerIn =
  | { type: "send"; content?: unknown }
  | { type: "processed"; seq?: unknown };
type ConnectionStatus = "connected" | "reconnecting" | "resuming";
type WorkerOut =
  | { type: "trace"; direction: TraceDirection; event: JsonEvent }
  | { type: "flush-last-turn" }
  | { type: "connection-status"; status: ConnectionStatus };

const WS_URL = "ws://localhost:4747/ws";
const STREAM_STALL_MS = 12_000;
const STALL_CHECK_INTERVAL_MS = 1_000;

const sequenceGate = new SequenceGate();
let lastUserMessage: string | null = null;
let lastStreamProgressSeq = 0;
let resumePendingAtStreamSeq: number | null = null;
const answeredPingSeqs = new Set<number>();
const acknowledgedToolCallIds = new Set<string>();
let suppressToolAcks = false;

const reconnectController = createReconnectController({
  url: WS_URL,
  onMessage: handleServerMessage,
  onReconnect: resumeFromLastProcessedSeq,
  onSend: handleClientMessageSent,
  onStatus: emitConnectionStatus,
});
const streamStallWatchdog = createStreamStallWatchdog({
  timeoutMs: STREAM_STALL_MS,
  checkIntervalMs: STALL_CHECK_INTERVAL_MS,
  onStall: recoverStalledStream,
});

function send(content: string) {
  lastUserMessage = content;
  lastStreamProgressSeq = 0;
  resumePendingAtStreamSeq = null;
  answeredPingSeqs.clear();
  acknowledgedToolCallIds.clear();
  suppressToolAcks = false;
  reconnectController.send({ type: "USER_MESSAGE", content });
}

function sendToServer(message: JsonEvent) {
  reconnectController.send(message);
}

function resumeFromLastProcessedSeq() {
  const lastSeq = sequenceGate.getResumeSeq();
  resumePendingAtStreamSeq = lastStreamProgressSeq;
  suppressToolAcks = true;
  sendToServer({ type: "RESUME", last_seq: lastSeq });
  emitConnectionStatus("connected");
}

function recoverStalledStream() {
  if (shouldRestartAfterFailedResume()) {
    restartLastUserMessage();
    return;
  }

  emitConnectionStatus("reconnecting");
  reconnectController.forceReconnect();
}

function shouldRestartAfterFailedResume() {
  return (
    lastUserMessage !== null &&
    resumePendingAtStreamSeq !== null &&
    lastStreamProgressSeq <= resumePendingAtStreamSeq
  );
}

function restartLastUserMessage() {
  if (!lastUserMessage) return;

  lastStreamProgressSeq = 0;
  resumePendingAtStreamSeq = null;
  answeredPingSeqs.clear();
  acknowledgedToolCallIds.clear();
  suppressToolAcks = false;
  sequenceGate.noteUserMessageSent();
  streamStallWatchdog.noteStreamStarted();
  globalThis.postMessage({ type: "flush-last-turn" } satisfies WorkerOut);
  reconnectController.send({ type: "USER_MESSAGE", content: lastUserMessage });
  emitConnectionStatus("connected");
}

function handleClientMessageSent(message: JsonEvent) {
  if (message.type === "USER_MESSAGE") {
    sequenceGate.noteUserMessageSent();
    streamStallWatchdog.noteStreamStarted();
  }

  emitTrace("worker->server", message);
}

function handleServerMessage(raw: string) {
  const message = parseJsonObject(raw);
  if (!message) return;

  tracePingImmediately(message);
  respondToPingImmediately(message);
  respondToToolCallImmediately(message);

  const next = sequenceGate.accept(message);
  if (next) emitTrace("server->worker", next);
}

function markServerMessageProcessed(seq: number) {
  const { processed, next } = sequenceGate.markProcessed(seq);
  if (!processed) return;

  if (isStreamLifecycleEvent(processed)) {
    lastStreamProgressSeq = processed.seq;
    resumePendingAtStreamSeq = null;
  }

  streamStallWatchdog.noteOrderedProgress(processed);
  if (next) emitTrace("server->worker", next);
}

function isStreamLifecycleEvent(message: JsonEvent) {
  return (
    message.type === "CONTEXT_SNAPSHOT" ||
    message.type === "TOKEN" ||
    message.type === "TOOL_CALL" ||
    message.type === "TOOL_RESULT" ||
    message.type === "STREAM_END" ||
    message.type === "ERROR"
  );
}

function respondToToolCallImmediately(message: JsonEvent) {
  if (message.type !== "TOOL_CALL") return;
  if (typeof message.call_id !== "string") return;
  if (suppressToolAcks) return;
  if (acknowledgedToolCallIds.has(message.call_id)) return;

  acknowledgedToolCallIds.add(message.call_id);
  sendToServer({ type: "TOOL_ACK", call_id: message.call_id });
}

function tracePingImmediately(message: JsonEvent) {
  if (message.type === "PING") emitTrace("server->worker", message);
}

function respondToPingImmediately(message: JsonEvent) {
  if (message.type !== "PING") return;
  if (typeof message.seq !== "number") return;
  if (answeredPingSeqs.has(message.seq)) return;

  answeredPingSeqs.add(message.seq);
  const echo = typeof message.challenge === "string" ? message.challenge : "";
  sendToServer({ type: "PONG", echo });
}

function parseJsonObject(raw: string): JsonEvent | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    return value as JsonEvent;
  } catch {
    return null;
  }
}

function emitTrace(direction: TraceDirection, event: JsonEvent) {
  const message = { type: "trace", direction, event } satisfies WorkerOut;
  globalThis.postMessage(message);
}

function emitConnectionStatus(status: ConnectionStatus) {
  if (status !== "reconnecting") streamStallWatchdog.noteTransportActive();
  globalThis.postMessage({
    type: "connection-status",
    status,
  } satisfies WorkerOut);
}

self.addEventListener("message", (event: MessageEvent<WorkerIn>) => {
  if (event.data.type === "processed") {
    if (typeof event.data.seq === "number") {
      markServerMessageProcessed(event.data.seq);
    }
    return;
  }

  if (event.data.type !== "send") return;
  if (typeof event.data.content !== "string") return;

  const content = event.data.content.trim();
  if (content) send(content);
});

streamStallWatchdog.start();
reconnectController.connect();
export {};
