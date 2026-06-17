import { SequenceGate, type JsonEvent } from "./sequence-gate";

type TraceDirection = "worker->server" | "server->worker";

type WorkerIn =
  | { type: "send"; content?: unknown }
  | { type: "processed"; seq?: unknown };
type WorkerOut = { type: "trace"; direction: TraceDirection; event: JsonEvent };

const WS_URL = "ws://localhost:4747/ws";
const encode = JSON.stringify;
const sequenceGate = new SequenceGate();
let socket: WebSocket | null = null;
let hasOpened = false;
const pending: JsonEvent[] = [];

function connect() {
  if (socket?.readyState === WebSocket.OPEN) return;
  if (socket?.readyState === WebSocket.CONNECTING) return;

  socket = new WebSocket(WS_URL);
  socket.addEventListener("open", handleOpen);
  socket.addEventListener("message", handleServerMessage);
  socket.addEventListener("close", () => {
    socket = null;
  });
}

function handleOpen() {
  if (hasOpened) {
    sendOpenSocket({
      type: "RESUME",
      last_seq: sequenceGate.getLastProcessedSeq(),
    });
  }

  hasOpened = true;
  flush();
}

function flush() {
  while (pending.length > 0 && socket?.readyState === WebSocket.OPEN) {
    const next = pending.shift();
    if (next) sendOpenSocket(next);
  }
}

function send(content: string) {
  sequenceGate.noteUserMessageSent();
  sendToServer({ type: "USER_MESSAGE", content });
}

function sendToServer(message: JsonEvent) {
  if (socket?.readyState === WebSocket.OPEN) {
    sendOpenSocket(message);
    return;
  }

  pending.push(message);
  connect();
}

function sendOpenSocket(message: JsonEvent) {
  socket?.send(encode(message));
  emitTrace("worker->server", message);
}

function handleServerMessage(event: MessageEvent) {
  if (typeof event.data !== "string") return;

  const message = parseJsonObject(event.data);
  if (!message) return;

  const next = sequenceGate.accept(message);
  if (next) emitTrace("server->worker", next);
}

function markServerMessageProcessed(seq: number) {
  const { processed, next } = sequenceGate.markProcessed(seq);
  if (!processed) return;

  respondAfterUiConsumption(processed);
  if (next) emitTrace("server->worker", next);
}

function respondAfterUiConsumption(message: JsonEvent) {
  if (message.type === "TOOL_CALL" && typeof message.call_id === "string") {
    sendToServer({ type: "TOOL_ACK", call_id: message.call_id });
    return;
  }

  if (message.type !== "PING") return;

  const echo = typeof message.challenge === "string" ? message.challenge : "";
  sendToServer({ type: "PONG", echo });
}

function parseJsonObject(raw: string): JsonEvent | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as JsonEvent;
  } catch {
    return null;
  }
}

function emitTrace(direction: TraceDirection, event: JsonEvent) {
  const message = { type: "trace", direction, event } satisfies WorkerOut;
  globalThis.postMessage(message);
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

connect();
export {};
