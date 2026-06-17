import { ResponseScript } from "../../types.js";

// ── 1. Simple greeting — no tools, short stream ───────────
export const greetingScript = {
  id: "greeting",
  name: "Simple Greeting",
  triggers: ["hello", "hi", "hey", "greetings", "good morning", "good evening"],
  events: [
    {
      kind: "context",
      context_id: "ctx_session",
      data: {
        session_type: "conversational",
        capabilities: ["search", "analyze", "compute", "summarize"],
        model_version: "alchemyst-agent-v3.1",
      },
    },
    { kind: "token", text: "Hello! " },
    { kind: "token", text: "I'm the " },
    { kind: "token", text: "Alchemyst Agent. " },
    { kind: "token", text: "I can help you " },
    { kind: "token", text: "analyze data, " },
    { kind: "token", text: "look up metrics, " },
    { kind: "token", text: "retrieve context, " },
    { kind: "token", text: "and generate " },
    { kind: "token", text: "reports from " },
    { kind: "token", text: "your connected " },
    { kind: "token", text: "data sources. " },
    { kind: "token", text: "What would you " },
    { kind: "token", text: "like to explore " },
    { kind: "token", text: "today?" },
  ],
} satisfies ResponseScript;
