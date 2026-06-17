import { ResponseScript } from "../../types.js";
import { generateLargeContext } from "../generateLargeContext.js";

// ── 5. Large context — oversized payload ──────────────────
export const largeContextScript = {
  id: "large_context",
  name: "Large Context Load",
  triggers: ["schema", "database", "large", "context", "full"],
  events: [
    {
      kind: "context",
      context_id: "ctx_schema",
      data: generateLargeContext(),
    },
    { kind: "token", text: "I've loaded the " },
    { kind: "token", text: "full database schema " },
    { kind: "token", text: "into context. The " },
    { kind: "token", text: "schema contains 64 " },
    { kind: "token", text: "tables across 4 primary " },
    { kind: "token", text: "domains: user management, " },
    { kind: "token", text: "billing, analytics, " },
    { kind: "token", text: "and agent operations. " },
    {
      kind: "tool_call",
      tool_name: "analyze_schema",
      args: { focus: "relationships", depth: "full" },
      result: {
        total_tables: 64,
        total_columns: 412,
        foreign_keys: 67,
        most_connected: "events",
        orphan_tables: ["legacy_logs", "temp_migrations"],
      },
    },
    { kind: "token", text: "The most connected " },
    { kind: "token", text: "table is `events` " },
    { kind: "token", text: "with 12 foreign key " },
    { kind: "token", text: "relationships. I also " },
    { kind: "token", text: "found 2 orphan tables " },
    { kind: "token", text: "that may be candidates " },
    { kind: "token", text: "for cleanup: " },
    { kind: "token", text: "`legacy_logs` and " },
    { kind: "token", text: "`temp_migrations`. " },
    {
      kind: "context",
      context_id: "ctx_schema",
      data: {
        ...generateLargeContext(),
        analysis_complete: true,
        flagged_issues: ["orphan_tables", "missing_indices", "wide_tables"],
      },
    },
    { kind: "token", text: "Would you like me " },
    { kind: "token", text: "to focus on a " },
    { kind: "token", text: "specific domain or " },
    { kind: "token", text: "analyze the overall " },
    { kind: "token", text: "architecture?" },
  ],
} satisfies ResponseScript;
