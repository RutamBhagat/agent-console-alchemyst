import { create } from "zustand";
import type {
  StreamEndMessage,
  TokenMessage,
  ToolCallMessage,
  ToolResultMessage,
} from "@/worker/types/serverToClient";
import type { UserMessagePayload } from "@/worker/types/clientToServer";

export interface ChatStream {
  stream_id: string;
  text: string;
  toolCalls: Record<string, ToolCallMessage>;
  toolResults: Record<string, ToolResultMessage>;
  ended: boolean;
}

type ChatEntry = ChatStream | UserMessagePayload;

interface ChatState {
  streams: Record<string, ChatStream>;
  chats: ChatEntry[];
  addUserMessage: (message: UserMessagePayload) => void;
  addToken: (token: TokenMessage) => void;
  addToolCall: (call: ToolCallMessage) => void;
  addToolResult: (result: ToolResultMessage) => void;
  endStream: (end: StreamEndMessage) => void;
  retryUserMessage: (message: UserMessagePayload) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  streams: {},
  chats: [],
  addUserMessage: (message) =>
    set((state) => ({ chats: [...state.chats, message] })),
  addToken: (token) =>
    set((state) => {
      const stream =
        state.streams[token.stream_id] ?? emptyStream(token.stream_id);
      const streams = {
        ...state.streams,
        [token.stream_id]: { ...stream, text: stream.text + token.text },
      };
      return {
        streams,
        chats: upsertStream(state.chats, streams[token.stream_id]),
      };
    }),
  addToolCall: (call) =>
    set((state) => {
      const stream =
        state.streams[call.stream_id] ?? emptyStream(call.stream_id);
      const streams = {
        ...state.streams,
        [call.stream_id]: {
          ...stream,
          toolCalls: { ...stream.toolCalls, [call.call_id]: call },
        },
      };
      return {
        streams,
        chats: upsertStream(state.chats, streams[call.stream_id]),
      };
    }),
  addToolResult: (result) =>
    set((state) => {
      const stream =
        state.streams[result.stream_id] ?? emptyStream(result.stream_id);
      const streams = {
        ...state.streams,
        [result.stream_id]: {
          ...stream,
          toolResults: { ...stream.toolResults, [result.call_id]: result },
        },
      };
      return {
        streams,
        chats: upsertStream(state.chats, streams[result.stream_id]),
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
        chats: upsertStream(state.chats, streams[end.stream_id]),
      };
    }),
  retryUserMessage: (message) =>
    set((state) => {
      const index = state.chats.findLastIndex((chat) => !("stream_id" in chat));
      const chats = index === -1 ? state.chats : state.chats.slice(0, index);
      return { chats: [...chats, message], streams: streamsFromChats(chats) };
    }),
}));

function emptyStream(stream_id: string): ChatStream {
  return { stream_id, text: "", toolCalls: {}, toolResults: {}, ended: false };
}

function upsertStream(chats: ChatEntry[], stream: ChatStream): ChatEntry[] {
  const index = chats.findIndex(
    (chat) => "stream_id" in chat && chat.stream_id === stream.stream_id,
  );
  if (index === -1) return [...chats, stream];
  return chats.map((chat, itemIndex) => (itemIndex === index ? stream : chat));
}

function streamsFromChats(chats: ChatEntry[]): Record<string, ChatStream> {
  return Object.fromEntries(
    chats
      .filter((chat): chat is ChatStream => "stream_id" in chat)
      .map((stream) => [stream.stream_id, stream]),
  );
}
