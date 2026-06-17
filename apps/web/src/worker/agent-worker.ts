import { prettifyError, ZodError } from "zod";

import { ServerMessageSchema, WorkerMessageSchema } from "./schemas/protocol";
import { createReconnectController } from "./reconnect-controller";
import { createSequenceGate } from "./sequence-gate";
import type { ClientMessage } from "../../../agent-server/src/types";
import type { ServerMessage } from "../../../agent-server/src/types";

export let socket: WebSocket | undefined;
const sequenceGate = createSequenceGate();
const reconnect = createReconnectController();
const maxReconnectDelayMs = 10_000;
let lastPongedPingSeq = 0;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const message = WorkerMessageSchema.parse(event.data);

  switch (message.type) {
    case "connect":
      connect(message.url);
      return;
    case "disconnect":
      {
        clearReconnectTimer();
        const currentSocket = socket;
        socket = undefined;
        currentSocket?.close();
      }
      return;
    case "sendUserMessage": {
      sendUserMessage(message.content);
      return;
    }
    case "toolAck": {
      const ack = {
        type: "TOOL_ACK",
        call_id: message.call_id,
      } satisfies ClientMessage;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(ack));
        self.postMessage({
          type: "clientEvent",
          direction: "out",
          message: ack,
        });
      }
      return;
    }
  }
});

function connect(url: string, isRetry = false) {
  reconnect.connect(url);
  self.postMessage({
    type: "connectionStatus",
    status: isRetry ? "reconnecting" : "connecting",
    reconnectDelayMs: 0,
  });
  const oldSocket = socket;
  socket = undefined;
  oldSocket?.close();
  const nextSocket = new WebSocket(url);
  socket = nextSocket;
  nextSocket.addEventListener("open", handleSocketOpen);
  nextSocket.addEventListener("close", () => handleSocketClose(nextSocket));
  nextSocket.addEventListener("message", handleSocketMessage);
}

function handleSocketOpen() {
  reconnectAttempt = 0;
  self.postMessage({ type: "connectionStatus", status: "connected" });
  const content = reconnect.takeReconnectMessage();
  if (!content) return;
  sendUserMessage(content);
}

function handleSocketClose(closedSocket: WebSocket | undefined) {
  if (closedSocket !== socket) return;
  socket = undefined;
  const content = reconnect.socketClosed();
  if (content) self.postMessage({ type: "retryUserMessage", content });

  const reconnectDelayMs = Math.min(
    500 * 2 ** reconnectAttempt,
    maxReconnectDelayMs,
  );
  reconnectAttempt += 1;
  self.postMessage({
    type: "connectionStatus",
    status: "reconnecting",
    reconnectDelayMs,
  });
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connect(reconnect.url, true);
  }, reconnectDelayMs);
}

function sendUserMessage(content: string) {
  const userMessage = { type: "USER_MESSAGE", content } satisfies ClientMessage;
  if (socket?.readyState !== WebSocket.OPEN) return;
  reconnect.sentUserMessage(content);
  sequenceGate.reset();
  lastPongedPingSeq = 0;
  socket.send(JSON.stringify(userMessage));
  self.postMessage({
    type: "clientEvent",
    direction: "out",
    message: userMessage,
  });
}

function handleSocketMessage(event: MessageEvent) {
  try {
    const message = ServerMessageSchema.parse(JSON.parse(event.data));
    self.postMessage({ type: "clientEvent", direction: "in", message });
    const lastAppliedBefore = sequenceGate.lastAppliedSeq;

    if (message.type === "PING" && message.seq > lastPongedPingSeq) {
      lastPongedPingSeq = message.seq;
      const pong = {
        type: "PONG",
        echo: message.challenge,
      } satisfies ClientMessage;
      socket?.send(JSON.stringify(pong));
      self.postMessage({
        type: "clientEvent",
        direction: "out",
        message: pong,
      });
    }

    for (const readyMessage of sequenceGate.accept(message)) {
      applyServerMessage(readyMessage);
    }

    if (
      message.type === "PING" &&
      message.seq > lastAppliedBefore + 1 &&
      sequenceGate.lastAppliedSeq === lastAppliedBefore &&
      socket?.readyState === WebSocket.OPEN
    ) {
      const resume = {
        type: "RESUME",
        last_seq: lastAppliedBefore,
      } satisfies ClientMessage;
      socket.send(JSON.stringify(resume));
      self.postMessage({
        type: "clientEvent",
        direction: "out",
        message: resume,
      });
    }
  } catch (error) {
    self.postMessage({
      type: "protocolViolation",
      error:
        error instanceof ZodError
          ? prettifyError(error)
          : "Invalid WebSocket frame",
    });
  }
}

function applyServerMessage(message: ServerMessage) {
  switch (message.type) {
    case "TOKEN":
    case "TOOL_RESULT":
      self.postMessage({ type: "statePatch", chat: message });
      return;
    case "STREAM_END": {
      reconnect.streamEnded();
      self.postMessage({ type: "statePatch", chat: message });
      return;
    }
    case "TOOL_CALL": {
      self.postMessage({ type: "statePatch", chat: message });
      return;
    }
    case "CONTEXT_SNAPSHOT": {
      self.postMessage({ type: "statePatch", context: message });
      return;
    }
    default:
      return;
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
}

export {};
