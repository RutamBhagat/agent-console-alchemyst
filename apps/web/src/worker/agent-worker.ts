import { ResumeController } from "./resume-controller";
import { SequenceGate, type JsonEvent } from "./sequence-gate";

type TraceDirection = "worker->server" | "server->worker";

type WorkerIn =
  | { type: "send"; content?: unknown }
  | { type: "processed"; seq?: unknown };
type WorkerOut = { type: "trace"; direction: TraceDirection; event: JsonEvent };

const WS_URL = "ws://localhost:4747/ws";
const sequenceGate = new SequenceGate();
const resumeController = new ResumeController({
  url: WS_URL,
  getLastProcessedSeq: () => sequenceGate.getLastProcessedSeq(),
  onMessage: handleServerMessage,
  onSend: (message) => emitTrace("worker->server", message),
});

function send(content: string) {
  sequenceGate.noteUserMessageSent();
  resumeController.send({ type: "USER_MESSAGE", content });
}

function sendToServer(message: JsonEvent) {
  resumeController.send(message);
}

function handleServerMessage(raw: string) {
  const message = parseJsonObject(raw);
  if (!message) return;

  respondToPingImmediately(message);

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
  }
}

function respondToPingImmediately(message: JsonEvent) {
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

resumeController.connect();
export {};
