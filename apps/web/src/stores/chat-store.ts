import { create } from "zustand";
import type {
  StreamEndMessage,
  TokenMessage,
  ToolCallMessage,
  ToolResultMessage,
} from "@/worker/types/serverToClient";

interface ChatStream {
  stream_id: string;
  text: string;
  toolCalls: Record<string, ToolCallMessage>;
  toolResults: Record<string, ToolResultMessage>;
  ended: boolean;
}

interface ChatState {
  streams: Record<string, ChatStream>;
  addToken: (token: TokenMessage) => void;
  addToolCall: (call: ToolCallMessage) => void;
  addToolResult: (result: ToolResultMessage) => void;
  endStream: (end: StreamEndMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  streams: {},
  addToken: (token) =>
    set((state) => {
      const stream = state.streams[token.stream_id] ?? emptyStream(token.stream_id);
      return {
        streams: {
          ...state.streams,
          [token.stream_id]: { ...stream, text: stream.text + token.text },
        },
      };
    }),
  addToolCall: (call) =>
    set((state) => {
      const stream = state.streams[call.stream_id] ?? emptyStream(call.stream_id);
      return {
        streams: {
          ...state.streams,
          [call.stream_id]: {
            ...stream,
            toolCalls: { ...stream.toolCalls, [call.call_id]: call },
          },
        },
      };
    }),
  addToolResult: (result) =>
    set((state) => {
      const stream = state.streams[result.stream_id] ?? emptyStream(result.stream_id);
      return {
        streams: {
          ...state.streams,
          [result.stream_id]: {
            ...stream,
            toolResults: { ...stream.toolResults, [result.call_id]: result },
          },
        },
      };
    }),
  endStream: (end) =>
    set((state) => {
      const stream = state.streams[end.stream_id] ?? emptyStream(end.stream_id);
      return {
        streams: {
          ...state.streams,
          [end.stream_id]: { ...stream, ended: true },
        },
      };
    }),
}));

function emptyStream(stream_id: string): ChatStream {
  return { stream_id, text: "", toolCalls: {}, toolResults: {}, ended: false };
}
