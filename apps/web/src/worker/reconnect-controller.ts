import type { JsonEvent } from "./sequence-gate";

type Wire = EventTarget & {
  readyState: number;
  send: (message: string) => void;
  close: () => void;
};

export type ConnectionStatus = "connected" | "reconnecting" | "resuming";

type ReconnectControllerOptions = {
  url: string;
  onMessage: (raw: string) => void;
  onReconnect: () => void;
  onSend: (message: JsonEvent) => void;
  onStatus: (status: ConnectionStatus) => void;
};

const OPEN = 1;
const CONNECTING = 0;
const BACKOFF_MS = [500, 1000, 2000, 4000, 10000] as const;

type WebSocketConstructor = new (url: string) => Wire;

function openSocket(url: string) {
  const ctor = globalThis["WebSocket" as keyof typeof globalThis] as WebSocketConstructor;
  return new ctor(url);
}

export function createReconnectController(options: ReconnectControllerOptions) {
  let socket: Wire | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let hasOpened = false;
  let reconnectAttempt = 0;
  const pending: JsonEvent[] = [];

  function connect() {
    if (socket?.readyState === OPEN) return;
    if (socket?.readyState === CONNECTING) return;

    const nextSocket = openSocket(options.url);
    socket = nextSocket;

    nextSocket.addEventListener("open", () => handleOpen(nextSocket));
    nextSocket.addEventListener("message", handleMessage);
    nextSocket.addEventListener("close", () => handleClose(nextSocket));
    nextSocket.addEventListener("error", () => nextSocket.close());
  }

  function send(message: JsonEvent) {
    if (socket?.readyState === OPEN) {
      if (sendOpenSocket(message)) return;
    }

    pending.push(message);
    connect();
  }

  function forceReconnect() {
    if (socket?.readyState === OPEN || socket?.readyState === CONNECTING) {
      socket.close();
      return;
    }

    connect();
  }

  function handleOpen(openedSocket: Wire) {
    if (openedSocket !== socket) return;

    const isReconnect = hasOpened;
    reconnectAttempt = 0;
    hasOpened = true;

    if (isReconnect) {
      pending.length = 0;
      options.onStatus("resuming");
      options.onReconnect();
      return;
    }

    options.onStatus("connected");
    flush();
  }

  function handleMessage(event: Event) {
    const data = "data" in event ? event.data : null;
    if (typeof data !== "string") return;
    options.onMessage(data);
  }

  function handleClose(closedSocket: Wire) {
    if (closedSocket !== socket) return;

    socket = null;
    options.onStatus("reconnecting");
    scheduleReconnect();
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;

    const index = Math.min(reconnectAttempt, BACKOFF_MS.length - 1);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, BACKOFF_MS[index]);
  }

  function flush() {
    while (pending.length > 0 && socket?.readyState === OPEN) {
      const next = pending.shift();
      if (!next) continue;
      if (sendOpenSocket(next)) continue;

      pending.unshift(next);
      break;
    }
  }

  function sendOpenSocket(message: JsonEvent) {
    const activeSocket = socket;
    if (!activeSocket || activeSocket.readyState !== OPEN) return false;

    try {
      activeSocket.send(JSON.stringify(message));
    } catch {
      activeSocket.close();
      return false;
    }

    options.onSend(message);
    return true;
  }

  return { connect, send, forceReconnect };
}
