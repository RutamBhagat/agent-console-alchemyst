type WorkerIn = { type: "send"; content?: unknown };
type ServerOut =
  | { type: "USER_MESSAGE"; content: string }
  | { type: "PONG"; echo: string };
type PingIn = { type: "PING"; challenge?: unknown };

const WS_URL = "ws://localhost:4747/ws";
const encode = JSON.stringify;
let socket: WebSocket | null = null;
const pending: ServerOut[] = [];

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
    if (next) socket.send(encode(next));
  }
}

function send(content: string) {
  sendToServer({ type: "USER_MESSAGE", content });
}

function sendToServer(message: ServerOut) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(encode(message));
    return;
  }

  pending.push(message);
  connect();
}

function handleServerMessage(event: MessageEvent) {
  if (typeof event.data !== "string") return;

  const message = parseServerMessage(event.data);
  if (message?.type !== "PING") return;

  const echo =
    typeof message.challenge === "string" ? message.challenge : "";
  sendToServer({ type: "PONG", echo });
}

function parseServerMessage(raw: string): PingIn | null {
  try {
    return JSON.parse(raw) as PingIn;
  } catch {
    return null;
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerIn>) => {
  if (event.data.type !== "send") return;
  if (typeof event.data.content !== "string") return;

  const content = event.data.content.trim();
  if (content) send(content);
});

connect();
export {};
