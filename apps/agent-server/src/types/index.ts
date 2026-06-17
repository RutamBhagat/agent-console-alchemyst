// ─────────────────────────────────────────────────────────────
// Protocol type definitions for the Agent Server
// These are the canonical types for the WebSocket protocol.
// ─────────────────────────────────────────────────────────────

export * from "./serverToClient.js";
export * from "./clientToServer.js";

// ── Response Script Types ─────────────────────────────────────

export interface ScriptTokenEvent {
  kind: "token";
  text: string;
}

export interface ScriptToolCallEvent {
  kind: "tool_call";
  tool_name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface ScriptContextEvent {
  kind: "context";
  context_id: string;
  data: Record<string, unknown>;
}

export type ScriptEvent =
  | ScriptTokenEvent
  | ScriptToolCallEvent
  | ScriptContextEvent;

export interface ResponseScript {
  id: string;
  name: string;
  triggers: string[]; // Keywords that select this script
  events: ScriptEvent[];
}

// ── Log Entry Types ───────────────────────────────────────────

export interface ClientLogEntry {
  timestamp: number;
  type: string;
  data: Record<string, unknown>;
  verdict?: string; // "ok", "violation", "late", etc.
}

// ── Chaos Configuration ───────────────────────────────────────

export interface ChaosConfig {
  dropAfterMessages: number | null;
  reorderProbability: number;
  duplicateProbability: number;
  latencySpikeProbability: number;
  latencySpikeMs: [number, number]; // [min, max]
  corruptPingProbability: number;
}

// ── Server Mode ───────────────────────────────────────────────

export type ServerMode = "normal" | "chaos";
