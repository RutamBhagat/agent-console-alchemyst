import { prettifyError, ZodError } from "zod";

import { ServerMessageSchema, WorkerMessageSchema } from "./schemas/protocol";
import { createSequenceGate } from "./sequence-gate";
import type { ClientMessage } from "./types/clientToServer";
import type { ServerMessage } from "./types/serverToClient";

export let socket: WebSocket | undefined;
const sequenceGate = createSequenceGate();
let lastPongedPingSeq = 0;

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const message = WorkerMessageSchema.parse(event.data);

  switch (message.type) {
    case "connect":
      connect(message.url);
      return;
    case "disconnect":
      socket?.close();
      socket = undefined;
      return;
    case "sendUserMessage": {
      const userMessage = { type: "USER_MESSAGE", content: message.content } satisfies ClientMessage;
      if (socket?.readyState === WebSocket.OPEN) {
        sequenceGate.reset();
        lastPongedPingSeq = 0;
        socket.send(JSON.stringify(userMessage));
        self.postMessage({ type: "clientEvent", direction: "out", message: userMessage });
      }
      return;
    }
    case "toolAck": {
      const ack = { type: "TOOL_ACK", call_id: message.call_id } satisfies ClientMessage;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(ack));
        self.postMessage({ type: "clientEvent", direction: "out", message: ack });
      }
      return;
    }
  }
});

function connect(url: string) {
  socket?.close();
  socket = new WebSocket(url);
  socket.addEventListener("message", handleSocketMessage);
}

function handleSocketMessage(event: MessageEvent) {
  try {
    const message = ServerMessageSchema.parse(JSON.parse(event.data));
    self.postMessage({ type: "clientEvent", direction: "in", message });
    const lastAppliedBefore = sequenceGate.lastAppliedSeq;

    if (message.type === "PING" && message.seq > lastPongedPingSeq) {
      lastPongedPingSeq = message.seq;
      const pong = { type: "PONG", echo: message.challenge } satisfies ClientMessage;
      socket?.send(JSON.stringify(pong));
      self.postMessage({ type: "clientEvent", direction: "out", message: pong });
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
      const resume = { type: "RESUME", last_seq: lastAppliedBefore } satisfies ClientMessage;
      socket.send(JSON.stringify(resume));
      self.postMessage({ type: "clientEvent", direction: "out", message: resume });
    }
  } catch (error) {
    self.postMessage({
      type: "protocolViolation",
      error: error instanceof ZodError ? prettifyError(error) : "Invalid WebSocket frame",
    });
  }
}

function applyServerMessage(message: ServerMessage) {
  switch (message.type) {
    case "TOKEN":
    case "TOOL_RESULT":
    case "STREAM_END": {
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

export {};
