import { create } from "zustand";
import type { JsonEvent, TraceDirection } from "./trace-store";

type UserChatMessage = {
  id: string;
  role: "user";
  event: { type: "USER_MESSAGE"; content: string };
};

type AgentChatMessage = {
  id: string;
  role: "agent";
  streamId: string;
  status: "streaming" | "done";
  tokens: { seq: number; text: string }[];
};

export type ChatMessage = UserChatMessage | AgentChatMessage;

type ChatState = {
  messages: ChatMessage[];
  applyTraceEvent: (direction: TraceDirection, event: JsonEvent) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  applyTraceEvent: (direction, event) =>
    set((state) => applyChatTraceEvent(state, direction, event)),
}));

export function applyChatTraceEvent(
  state: Pick<ChatState, "messages">,
  direction: TraceDirection,
  event: JsonEvent,
): Pick<ChatState, "messages"> {
  if (direction === "worker->server" && event.type === "USER_MESSAGE") {
    if (typeof event.content !== "string") return { messages: state.messages };

    return {
      messages: [
        ...state.messages,
        {
          id: `user-${state.messages.length}`,
          role: "user",
          event: { type: "USER_MESSAGE", content: event.content },
        },
      ],
    };
  }

  if (direction !== "server->worker") return { messages: state.messages };

  if (event.type === "TOKEN") return applyToken(state.messages, event);
  if (event.type === "STREAM_END") return applyStreamEnd(state.messages, event);

  return { messages: state.messages };
}

function applyToken(
  messages: ChatMessage[],
  event: JsonEvent,
): Pick<ChatState, "messages"> {
  if (typeof event.stream_id !== "string") return { messages };
  if (typeof event.seq !== "number") return { messages };
  if (typeof event.text !== "string") return { messages };

  const streamId = event.stream_id;
  const index = messages.findIndex(
    (message) => message.role === "agent" && message.streamId === streamId,
  );

  if (index === -1) {
    return {
      messages: [
        ...messages,
        {
          id: `stream-${streamId}`,
          role: "agent",
          streamId,
          status: "streaming",
          tokens: [{ seq: event.seq, text: event.text }],
        },
      ],
    };
  }

  const current = messages[index];
  if (!current || current.role !== "agent") return { messages };
  if (current.tokens.some((token) => token.seq === event.seq))
    return { messages };

  const nextMessage: AgentChatMessage = {
    ...current,
    tokens: [...current.tokens, { seq: event.seq, text: event.text }].sort(
      (left, right) => left.seq - right.seq,
    ),
  };

  return {
    messages: messages.map((message, messageIndex) =>
      messageIndex === index ? nextMessage : message,
    ),
  };
}

function applyStreamEnd(
  messages: ChatMessage[],
  event: JsonEvent,
): Pick<ChatState, "messages"> {
  if (typeof event.stream_id !== "string") return { messages };

  return {
    messages: messages.map((message) =>
      message.role === "agent" && message.streamId === event.stream_id
        ? { ...message, status: "done" }
        : message,
    ),
  };
}

export function getAgentText(message: AgentChatMessage) {
  return message.tokens.map((token) => token.text).join("");
}
