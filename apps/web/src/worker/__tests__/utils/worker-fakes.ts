import { vi } from "vitest";

type Listener = (event: MessageEvent) => void;

export class FakeWorkerScope {
  messages: unknown[] = [];
  private listener?: (event: MessageEvent<unknown>) => void;

  addEventListener(_type: "message", listener: (event: MessageEvent<unknown>) => void) {
    this.listener = listener;
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  uiMessage(data: unknown) {
    this.listener?.({ data } as MessageEvent<unknown>);
  }
}

export class FakeWebSocket {
  static latest?: FakeWebSocket;
  sent: string[] = [];
  private listener?: Listener;

  constructor(readonly url: string) {
    FakeWebSocket.latest = this;
  }

  addEventListener(_type: "message", listener: Listener) {
    this.listener = listener;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {}

  serverMessage(data: string) {
    this.listener?.({ data } as MessageEvent);
  }
}

export function installWorkerFakes() {
  const workerScope = new FakeWorkerScope();
  FakeWebSocket.latest = undefined;
  vi.resetModules();
  vi.stubGlobal("self", workerScope);
  vi.stubGlobal("WebSocket", FakeWebSocket);
  return workerScope;
}
