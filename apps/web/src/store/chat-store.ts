import { create } from "zustand";
import type { JsonEvent, JsonValue, TraceDirection } from "./trace-store";

type UserChatMessage = {
  id: string;
  role: "user";
  event: { type: "USER_MESSAGE"; content: string };
};

type TextPart = {
  kind: "text";
  tokens: { seq: number; text: string }[];
};

type ToolPart = {
  kind: "tool";
  callId: string;
  streamId: string;
  seq: number;
  toolName: string;
  args: JsonValue;
  status: "pending" | "done";
  result?: JsonValue;
  resultSeq?: number;
};

type AgentPart = TextPart | ToolPart;

type AgentChatMessage = {
  id: string;
  role: "agent";
  streamId: string;
  status: "streaming" | "done";
  parts: AgentPart[];
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
  if (event.type === "TOOL_CALL") return applyToolCall(state.messages, event);
  if (event.type === "TOOL_RESULT") return applyToolResult(state.messages, event);
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

  const stream = getOrCreateStream(messages, event.stream_id);
  if (hasTokenSeq(stream.message, event.seq)) return { messages };

  const parts = [...stream.message.parts];
  const last = parts.at(-1);
  if (last?.kind === "text") {
    parts[parts.length - 1] = {
      kind: "text",
      tokens: [...last.tokens, { seq: event.seq, text: event.text }].sort(
        (left, right) => left.seq - right.seq,
      ),
    };
  } else {
    parts.push({ kind: "text", tokens: [{ seq: event.seq, text: event.text }] });
  }

  return replaceStream(stream.messages, stream.index, {
    ...stream.message,
    parts: sortParts(parts),
  });
}

function applyToolCall(
  messages: ChatMessage[],
  event: JsonEvent,
): Pick<ChatState, "messages"> {
  if (typeof event.stream_id !== "string") return { messages };
  if (typeof event.seq !== "number") return { messages };
  if (typeof event.call_id !== "string") return { messages };
  if (typeof event.tool_name !== "string") return { messages };

  const streamId = event.stream_id;
  const seq = event.seq;
  const callId = event.call_id;
  const toolName = event.tool_name;
  const args = event.args ?? {};
  const stream = getOrCreateStream(messages, streamId);
  let found = false;
  const parts: AgentPart[] = stream.message.parts.map((part) => {
    if (part.kind !== "tool" || part.callId !== callId) return part;
    found = true;
    return {
      ...part,
      seq,
      toolName,
      args,
    };
  });

  if (!found) {
    parts.push({
      kind: "tool",
      callId,
      streamId,
      seq,
      toolName,
      args,
      status: "pending",
    });
  }

  return replaceStream(stream.messages, stream.index, {
    ...stream.message,
    parts: sortParts(parts),
  });
}

function applyToolResult(
  messages: ChatMessage[],
  event: JsonEvent,
): Pick<ChatState, "messages"> {
  if (typeof event.stream_id !== "string") return { messages };
  if (typeof event.seq !== "number") return { messages };
  if (typeof event.call_id !== "string") return { messages };

  const streamId = event.stream_id;
  const seq = event.seq;
  const callId = event.call_id;
  const result = event.result ?? {};
  const stream = getOrCreateStream(messages, streamId);
  let found = false;
  const parts: AgentPart[] = stream.message.parts.map((part) => {
    if (part.kind !== "tool" || part.callId !== callId) return part;
    found = true;
    return {
      ...part,
      status: "done" as const,
      result,
      resultSeq: seq,
    };
  });

  if (!found) {
    parts.push({
      kind: "tool",
      callId,
      streamId,
      seq,
      toolName: "unknown",
      args: {},
      status: "done",
      result,
      resultSeq: seq,
    });
  }

  return replaceStream(stream.messages, stream.index, {
    ...stream.message,
    parts: sortParts(parts),
  });
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

function getOrCreateStream(messages: ChatMessage[], streamId: string) {
  const index = messages.findIndex(
    (message) => message.role === "agent" && message.streamId === streamId,
  );

  if (index !== -1) {
    const message = messages[index];
    if (message?.role === "agent") return { messages, index, message };
  }

  const message: AgentChatMessage = {
    id: `stream-${streamId}`,
    role: "agent",
    streamId,
    status: "streaming",
    parts: [],
  };

  return { messages: [...messages, message], index: messages.length, message };
}

function replaceStream(
  messages: ChatMessage[],
  index: number,
  message: AgentChatMessage,
): Pick<ChatState, "messages"> {
  return {
    messages: messages.map((current, currentIndex) =>
      currentIndex === index ? message : current,
    ),
  };
}

function hasTokenSeq(message: AgentChatMessage, seq: number) {
  return message.parts.some(
    (part) => part.kind === "text" && part.tokens.some((token) => token.seq === seq),
  );
}

function sortParts(parts: AgentPart[]) {
  return [...parts].sort((left, right) => getPartSeq(left) - getPartSeq(right));
}

function getPartSeq(part: AgentPart) {
  if (part.kind === "tool") return part.seq;
  return part.tokens[0]?.seq ?? Number.MAX_SAFE_INTEGER;
}

export function getAgentText(message: AgentChatMessage) {
  return message.parts
    .filter((part): part is TextPart => part.kind === "text")
    .flatMap((part) => part.tokens)
    .sort((left, right) => left.seq - right.seq)
    .map((token) => token.text)
    .join("");
}
