import { ResponseScript } from "../../types.js";

// ── 7. Default — moderate response with one tool call ─────
export const defaultResponseScript = {
  id: "default",
  name: "Default Response",
  triggers: [],
  events: [
    {
      kind: "context",
      context_id: "ctx_session",
      data: {
        session_type: "general",
        capabilities: ["search", "analyze", "compute", "summarize"],
        active_sources: ["knowledge_base", "metrics_dashboard", "recent_docs"],
      },
    },
    { kind: "token", text: "I've reviewed " },
    { kind: "token", text: "your request. " },
    {
      kind: "tool_call",
      tool_name: "classify_intent",
      args: { text: "user_query", confidence_threshold: 0.7 },
      result: {
        intent: "general_query",
        confidence: 0.82,
        suggested_tools: ["search_knowledge_base"],
        category: "information_retrieval",
      },
    },
    { kind: "token", text: "Based on my analysis, " },
    { kind: "token", text: "this falls into an " },
    { kind: "token", text: "information retrieval " },
    { kind: "token", text: "category. I can search " },
    { kind: "token", text: "our knowledge base, " },
    { kind: "token", text: "analyze data patterns, " },
    { kind: "token", text: "or compute metrics " },
    { kind: "token", text: "for you. The context " },
    { kind: "token", text: "engine currently has " },
    { kind: "token", text: "access to your " },
    { kind: "token", text: "organization's " },
    { kind: "token", text: "documentation, metrics " },
    { kind: "token", text: "dashboards, and recent " },
    { kind: "token", text: "communication logs. " },
    { kind: "token", text: "What specific aspect " },
    { kind: "token", text: "would you like me " },
    { kind: "token", text: "to dig into?" },
  ],
} satisfies ResponseScript;
