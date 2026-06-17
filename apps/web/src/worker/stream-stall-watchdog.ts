import type { JsonEvent } from "./sequence-gate";

type StreamStallWatchdogOptions = {
  timeoutMs: number;
  checkIntervalMs: number;
  onStall: () => void;
};

type StreamStallWatchdog = {
  start: () => void;
  stop: () => void;
  noteStreamStarted: () => void;
  noteOrderedProgress: (event: JsonEvent) => void;
  noteTransportActive: () => void;
};

const STREAM_PROGRESS_TYPES = new Set([
  "CONTEXT_SNAPSHOT",
  "TOKEN",
  "TOOL_CALL",
  "TOOL_RESULT",
]);

const STREAM_TERMINAL_TYPES = new Set(["STREAM_END", "ERROR"]);

export function createStreamStallWatchdog(
  options: StreamStallWatchdogOptions,
): StreamStallWatchdog {
  let streamOpen = false;
  let recoveryInFlight = false;
  let lastProgressAt = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  function start() {
    if (timer) return;

    timer = setInterval(checkForStall, options.checkIntervalMs);
  }

  function stop() {
    if (!timer) return;

    clearInterval(timer);
    timer = null;
  }

  function noteStreamStarted() {
    streamOpen = true;
    recoveryInFlight = false;
    lastProgressAt = Date.now();
  }

  function noteOrderedProgress(event: JsonEvent) {
    const type = getType(event);
    if (!type) return;

    if (STREAM_PROGRESS_TYPES.has(type)) {
      noteStreamStarted();
      return;
    }

    if (STREAM_TERMINAL_TYPES.has(type)) {
      streamOpen = false;
      recoveryInFlight = false;
      lastProgressAt = Date.now();
    }
  }

  function noteTransportActive() {
    recoveryInFlight = false;
    lastProgressAt = Date.now();
  }

  function checkForStall() {
    if (!streamOpen) return;
    if (recoveryInFlight) return;
    if (Date.now() - lastProgressAt < options.timeoutMs) return;

    recoveryInFlight = true;
    lastProgressAt = Date.now();
    options.onStall();
  }

  return {
    start,
    stop,
    noteStreamStarted,
    noteOrderedProgress,
    noteTransportActive,
  };
}

function getType(event: JsonEvent) {
  return typeof event.type === "string" ? event.type : null;
}
