import { ChaosConfig, ServerMessage } from "./types/index.js";

type IntRange = [number, number];

const CHAOS_SETTINGS = {
  dropConnection: { enabled: false, afterMessages: [15, 45] },
  reorder: { enabled: true, chancePercent: [45, 55] },
  duplicate: { enabled: false, chancePercent: [5, 15] },
  latencySpike: { enabled: false, chancePercent: [5, 13], ms: [2000, 8000] },
  corruptPing: { enabled: false, chancePercent: [15, 25] }, // PASS
} satisfies {
  dropConnection: { enabled: boolean; afterMessages: IntRange };
  reorder: { enabled: boolean; chancePercent: IntRange };
  duplicate: { enabled: boolean; chancePercent: IntRange };
  latencySpike: { enabled: boolean; chancePercent: IntRange; ms: IntRange };
  corruptPing: { enabled: boolean; chancePercent: IntRange };
};

// ─────────────────────────────────────────────────────────────
// ChaosEngine
//
// Wraps the message delivery pipeline and injects failures:
// - Out-of-order delivery (buffered shuffle)
// - Duplicate messages
// - Latency spikes
// - Connection drops (signalled, not executed here)
// - Corrupt heartbeats
// ─────────────────────────────────────────────────────────────

export class ChaosEngine {
  private config: ChaosConfig;
  private messagesSent: number = 0;
  private reorderBuffer: ServerMessage[] = [];
  private readonly REORDER_BUFFER_SIZE = 4;

  constructor(config: ChaosConfig) {
    this.config = config;
  }

  reset(): void {
    this.messagesSent = 0;
    this.reorderBuffer = [];
  }

  /**
   * Check if the connection should be dropped.
   * Called before each message send. Returns true if it is time to kill
   * the connection. The caller is responsible for actually closing the socket.
   */
  shouldDropConnection(): boolean {
    if (this.config.dropAfterMessages === null) return false;
    return this.messagesSent >= this.config.dropAfterMessages;
  }

  /**
   * Check if a PING should have its challenge corrupted.
   */
  shouldCorruptPing(): boolean {
    return this.hitsChance(this.config.corruptPingChancePercent);
  }

  /**
   * Process a message through the chaos pipeline.
   * Returns an array of messages to send (may be empty if buffered,
   * may contain duplicates, may be reordered).
   *
   * Also returns a delay in ms to wait before sending.
   */
  process(message: ServerMessage): {
    messages: ServerMessage[];
    delayMs: number;
  } {
    this.messagesSent++;

    const output: ServerMessage[] = [];
    let delayMs = 0;

    // ── Latency spike ─────────────────────────────────────
    if (this.hitsChance(this.config.latencySpikeChancePercent)) {
      const [min, max] = this.config.latencySpikeMs;
      delayMs = min + Math.random() * (max - min);
    }

    // ── Reorder: buffer messages and shuffle ──────────────
    if (this.hitsChance(this.config.reorderChancePercent)) {
      this.reorderBuffer.push(message);
      if (this.reorderBuffer.length >= this.REORDER_BUFFER_SIZE) {
        // Fisher-Yates shuffle
        const buf = [...this.reorderBuffer];
        for (let i = buf.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [buf[i], buf[j]] = [buf[j], buf[i]];
        }
        output.push(...buf);
        this.reorderBuffer = [];
      }
      // If buffer not yet full, return empty — messages are held
      if (output.length === 0) return { messages: [], delayMs: 0 };
    } else {
      // Flush any pending buffer first (in shuffled order), then this message
      if (this.reorderBuffer.length > 0) {
        const buf = [...this.reorderBuffer, message];
        for (let i = buf.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [buf[i], buf[j]] = [buf[j], buf[i]];
        }
        output.push(...buf);
        this.reorderBuffer = [];
      } else {
        output.push(message);
      }
    }

    // ── Duplicate: occasionally send a message twice ──────
    const finalOutput: ServerMessage[] = [];
    for (const msg of output) {
      finalOutput.push(msg);
      if (this.hitsChance(this.config.duplicateChancePercent)) {
        finalOutput.push(msg); // exact duplicate, same seq
      }
    }

    return { messages: finalOutput, delayMs };
  }

  /**
   * Flush any remaining buffered messages (e.g. at stream end).
   */
  flush(): ServerMessage[] {
    if (this.reorderBuffer.length === 0) return [];
    const buf = [...this.reorderBuffer];
    // Shuffle before flushing
    for (let i = buf.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [buf[i], buf[j]] = [buf[j], buf[i]];
    }
    this.reorderBuffer = [];
    return buf;
  }

  private hitsChance(percent: number): boolean {
    return Math.random() * 100 < percent;
  }
}

/**
 * Generate a chaos config from the settings above.
 * Set enabled=false to isolate one behavior while testing.
 */
export function generateChaosConfig(): ChaosConfig {
  return {
    dropAfterMessages: CHAOS_SETTINGS.dropConnection.enabled
      ? randomIntRange(CHAOS_SETTINGS.dropConnection.afterMessages)
      : null,
    reorderChancePercent: CHAOS_SETTINGS.reorder.enabled
      ? randomIntRange(CHAOS_SETTINGS.reorder.chancePercent)
      : 0,
    duplicateChancePercent: CHAOS_SETTINGS.duplicate.enabled
      ? randomIntRange(CHAOS_SETTINGS.duplicate.chancePercent)
      : 0,
    latencySpikeChancePercent: CHAOS_SETTINGS.latencySpike.enabled
      ? randomIntRange(CHAOS_SETTINGS.latencySpike.chancePercent)
      : 0,
    latencySpikeMs: [
      CHAOS_SETTINGS.latencySpike.ms[0],
      CHAOS_SETTINGS.latencySpike.ms[1],
    ],
    corruptPingChancePercent: CHAOS_SETTINGS.corruptPing.enabled
      ? randomIntRange(CHAOS_SETTINGS.corruptPing.chancePercent)
      : 0,
  };
}

function randomIntRange([min, max]: IntRange): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
