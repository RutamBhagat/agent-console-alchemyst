import { ResponseScript } from "../types.js";
import { RESPONSE_SCRIPTS } from "./index.js";

/**
 * Select a response script based on message content.
 * Falls back to the default script.
 */
export function selectScript(userMessage: string): ResponseScript {
  const lower = userMessage.toLowerCase();

  for (const script of RESPONSE_SCRIPTS) {
    if (script.triggers.length === 0) continue; // skip default
    for (const trigger of script.triggers) {
      if (lower.includes(trigger)) {
        return script;
      }
    }
  }

  // Fall back to default
  const defaultScript = RESPONSE_SCRIPTS.find((s) => s.id === "default");
  if (!defaultScript) throw new Error("No default script found");
  return defaultScript;
}
