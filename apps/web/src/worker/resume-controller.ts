import type { JsonEvent } from "./sequence-gate";

type ResumeControllerOptions = {
  url: string;
  getLastProcessedSeq: () => number;
  onMessage: (raw: string) => void;
  onSend: (message: JsonEvent) => void;
};

const BACKOFF_MS = [500, 1000, 2000, 4000, 10000] as const;

export class ResumeController {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private hasOpened = false;
  private reconnectAttempt = 0;
  private closedByClient = false;
  private readonly pending: JsonEvent[] = [];

  constructor(private readonly options: ResumeControllerOptions) {}

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    if (this.socket?.readyState === WebSocket.CONNECTING) return;

    this.closedByClient = false;
    const socket = new WebSocket(this.options.url);
    this.socket = socket;

    socket.addEventListener("open", () => this.handleOpen(socket));
    socket.addEventListener("message", (event) => this.handleMessage(event));
    socket.addEventListener("close", () => this.handleClose(socket));
    socket.addEventListener("error", () => socket.close());
  }

  send(message: JsonEvent) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendOpenSocket(message);
      return;
    }

    this.pending.push(message);
    this.connect();
  }

  close() {
    this.closedByClient = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
  }

  private handleOpen(socket: WebSocket) {
    if (socket !== this.socket) return;

    this.reconnectAttempt = 0;
    if (this.hasOpened) {
      this.sendOpenSocket({
        type: "RESUME",
        last_seq: this.options.getLastProcessedSeq(),
      });
    }

    this.hasOpened = true;
    this.flush();
  }

  private handleMessage(event: MessageEvent) {
    if (typeof event.data !== "string") return;
    this.options.onMessage(event.data);
  }

  private handleClose(socket: WebSocket) {
    if (socket !== this.socket) return;

    this.socket = null;
    if (!this.closedByClient) this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private flush() {
    while (this.pending.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const next = this.pending.shift();
      if (next) this.sendOpenSocket(next);
    }
  }

  private sendOpenSocket(message: JsonEvent) {
    this.socket?.send(JSON.stringify(message));
    this.options.onSend(message);
  }
}
