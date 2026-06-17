import { ResponseScript } from "../../types/index.js";

// ── 4. Immediate tool call — tool before any tokens ───────
export const lookupScript = {
  id: "lookup",
  name: "Knowledge Base Lookup",
  triggers: ["look up", "lookup", "find", "search", "what is", "define"],
  events: [
    {
      kind: "tool_call",
      tool_name: "search_knowledge_base",
      args: { query: "deployment SLA requirements", top_k: 3 },
      result: {
        found: true,
        document: "SLA-Framework-v3",
        section: "4.2",
        relevance_score: 0.94,
        content_preview: "Production deployments require 99.95% uptime...",
      },
    },
    {
      kind: "context",
      context_id: "ctx_search",
      data: {
        source_document: "SLA-Framework-v3",
        section: "4.2",
        retrieval_method: "vector_search",
        confidence: 0.94,
      },
    },
    { kind: "token", text: "Based on the " },
    { kind: "token", text: "knowledge base, the " },
    { kind: "token", text: "current deployment SLA " },
    { kind: "token", text: "requirements are defined " },
    { kind: "token", text: "in the SLA Framework " },
    { kind: "token", text: "v3, section 4.2. " },
    { kind: "token", text: "Production deployments " },
    { kind: "token", text: "require 99.95% uptime " },
    { kind: "token", text: "with a maximum planned " },
    { kind: "token", text: "downtime of 4.38 hours " },
    { kind: "token", text: "per year. Critical path " },
    { kind: "token", text: "services have a stricter " },
    { kind: "token", text: "requirement of 99.99% " },
    { kind: "token", text: "availability. Incident " },
    { kind: "token", text: "response times are " },
    { kind: "token", text: "tiered: P0 incidents " },
    { kind: "token", text: "require acknowledgment " },
    { kind: "token", text: "within 5 minutes, P1 " },
    { kind: "token", text: "within 15 minutes, " },
    { kind: "token", text: "and P2 within one hour." },
  ],
} satisfies ResponseScript;
