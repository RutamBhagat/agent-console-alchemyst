import { z } from "zod";

const JsonRecord = z.record(z.string(), z.unknown());

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TOKEN"),
    seq: z.number(),
    text: z.string(),
    stream_id: z.string(),
  }),
  z.object({
    type: z.literal("TOOL_CALL"),
    seq: z.number(),
    call_id: z.string(),
    tool_name: z.string(),
    args: JsonRecord,
    stream_id: z.string(),
  }),
  z.object({
    type: z.literal("TOOL_RESULT"),
    seq: z.number(),
    call_id: z.string(),
    result: JsonRecord,
    stream_id: z.string(),
  }),
  z.object({
    type: z.literal("CONTEXT_SNAPSHOT"),
    seq: z.number(),
    context_id: z.string(),
    data: JsonRecord,
  }),
  z.object({
    type: z.literal("PING"),
    seq: z.number(),
    challenge: z.string(),
  }),
  z.object({
    type: z.literal("STREAM_END"),
    seq: z.number(),
    stream_id: z.string(),
  }),
  z.object({
    type: z.literal("ERROR"),
    seq: z.number(),
    code: z.string(),
    message: z.string(),
  }),
]);

export const WorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connect"),
    url: z.string().default("ws://localhost:4747/ws"),
  }),
  z.object({ type: z.literal("disconnect") }),
  z.object({
    type: z.literal("sendUserMessage"),
    content: z.string(),
  }),
]);
