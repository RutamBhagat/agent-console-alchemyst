import { prettifyError, ZodError } from "zod";

import { ServerMessageSchema, WorkerMessageSchema } from "./schemas/protocol";
import type { ClientMessage } from "./types/clientToServer";

export let socket: WebSocket | undefined;

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const message = WorkerMessageSchema.parse(event.data);

  switch (message.type) {
    case "connect":
      socket?.close();
      socket = new WebSocket(message.url);
      socket.addEventListener("message", handleSocketMessage);
      return;
    case "disconnect":
      socket?.close();
      socket = undefined;
      return;
    case "sendUserMessage": {
      const userMessage = { type: "USER_MESSAGE", content: message.content } satisfies ClientMessage;
      if (socket?.readyState === WebSocket.OPEN) {
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

function handleSocketMessage(event: MessageEvent) {
  try {
    const message = ServerMessageSchema.parse(JSON.parse(event.data));
    self.postMessage({ type: "clientEvent", direction: "in", message });

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
      case "PING": {
        const pong = { type: "PONG", echo: message.challenge } satisfies ClientMessage;
        socket?.send(JSON.stringify(pong));
        self.postMessage({ type: "clientEvent", direction: "out", message: pong });
        return;
      }
      default:
        return;
    }
  } catch (error) {
    self.postMessage({
      type: "protocolViolation",
      error: error instanceof ZodError ? prettifyError(error) : "Invalid WebSocket frame",
    });
  }
}

export {};
