type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonEvent = { [key: string]: JsonValue };
type TraceDirection = "worker->server" | "server->worker";

type WorkerIn = { type: "send"; content?: unknown };
type WorkerOut = { type: "trace"; direction: TraceDirection; event: JsonEvent };

const WS_URL = "ws://localhost:4747/ws";
const encode = JSON.stringify;
let socket: WebSocket | null = null;
const pending: JsonEvent[] = [];

function connect() {
  if (socket?.readyState === WebSocket.OPEN) return;
  if (socket?.readyState === WebSocket.CONNECTING) return;

  socket = new WebSocket(WS_URL);
  socket.addEventListener("open", flush);
  socket.addEventListener("message", handleServerMessage);
  socket.addEventListener("close", () => {
    socket = null;
  });
}

function flush() {
  while (pending.length > 0 && socket?.readyState === WebSocket.OPEN) {
    const next = pending.shift();
    if (next) sendOpenSocket(next);
  }
}

function send(content: string) {
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

  emitTrace("server->worker", message);

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
  self.postMessage({ type: "trace", direction, event } satisfies WorkerOut);
}

self.addEventListener("message", (event: MessageEvent<WorkerIn>) => {
  if (event.data.type !== "send") return;
  if (typeof event.data.content !== "string") return;

  const content = event.data.content.trim();
  if (content) send(content);
});

connect();
export {};
