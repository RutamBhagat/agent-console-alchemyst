import { create } from "zustand";
import type {
  StreamEndMessage,
  TokenMessage,
  ToolCallMessage,
  ToolResultMessage,
} from "@/worker/types/serverToClient";

export interface ChatStream {
  stream_id: string;
  text: string;
  toolCalls: Record<string, ToolCallMessage>;
  toolResults: Record<string, ToolResultMessage>;
  ended: boolean;
}

interface ChatState {
  streams: Record<string, ChatStream>;
  chats: ChatStream[];
  addToken: (token: TokenMessage) => void;
  addToolCall: (call: ToolCallMessage) => void;
  addToolResult: (result: ToolResultMessage) => void;
  endStream: (end: StreamEndMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  streams: {},
  chats: [],
  addToken: (token) =>
    set((state) => {
      const stream = state.streams[token.stream_id] ?? emptyStream(token.stream_id);
      const streams = {
        ...state.streams,
        [token.stream_id]: { ...stream, text: stream.text + token.text },
      };
      return {
        streams,
        chats: Object.values(streams),
      };
    }),
  addToolCall: (call) =>
    set((state) => {
      const stream = state.streams[call.stream_id] ?? emptyStream(call.stream_id);
      const streams = {
        ...state.streams,
        [call.stream_id]: {
          ...stream,
          toolCalls: { ...stream.toolCalls, [call.call_id]: call },
        },
      };
      return {
        streams,
        chats: Object.values(streams),
      };
    }),
  addToolResult: (result) =>
    set((state) => {
      const stream = state.streams[result.stream_id] ?? emptyStream(result.stream_id);
      const streams = {
        ...state.streams,
        [result.stream_id]: {
          ...stream,
          toolResults: { ...stream.toolResults, [result.call_id]: result },
        },
      };
      return {
        streams,
        chats: Object.values(streams),
      };
    }),
  endStream: (end) =>
    set((state) => {
      const stream = state.streams[end.stream_id] ?? emptyStream(end.stream_id);
      const streams = {
        ...state.streams,
        [end.stream_id]: { ...stream, ended: true },
      };
      return {
        streams,
        chats: Object.values(streams),
      };
    }),
}));

function emptyStream(stream_id: string): ChatStream {
  return { stream_id, text: "", toolCalls: {}, toolResults: {}, ended: false };
}
