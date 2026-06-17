import { ResponseScript } from "../types.js";
import { greetingScript } from "./responseScripts/1-greeting.js";
import { reportSummaryScript } from "./responseScripts/2-report.js";
import { multiToolScript } from "./responseScripts/3-multi_tool.js";
import { lookupScript } from "./responseScripts/4-lookup.js";
import { largeContextScript } from "./responseScripts/5-large_context.js";
import { longResponseScript } from "./responseScripts/6-long_response.js";
import { defaultResponseScript } from "./responseScripts/7-default.js";
export { selectScript } from "./selectScript.js";

// ─────────────────────────────────────────────────────────────
// Canned response scripts
//
// Each script defines a sequence of events the agent produces.
// The server picks a script based on keyword matching against
// the user's message, falling back to "default".
// ─────────────────────────────────────────────────────────────

export const RESPONSE_SCRIPTS: ResponseScript[] = [
  greetingScript,
  reportSummaryScript,
  multiToolScript,
  lookupScript,
  largeContextScript,
  longResponseScript,
  defaultResponseScript,
];
