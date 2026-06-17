export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonEvent = { [key: string]: JsonValue };
export type SequencedJsonEvent = JsonEvent & { seq: number };

type ProcessedResult = {
  processed: SequencedJsonEvent | null;
  next: SequencedJsonEvent | null;
};

export class SequenceGate {
  private lastProcessedSeq = 0;
  private inFlight: SequencedJsonEvent | null = null;
  private mayStartNewTurn = false;
  private readonly buffer = new Map<number, SequencedJsonEvent>();

  getLastProcessedSeq() {
    return this.lastProcessedSeq;
  }

  noteUserMessageSent() {
    this.mayStartNewTurn = true;
  }

  accept(message: JsonEvent) {
    const seq = getServerSeq(message);
    if (seq === null) return null;

    if (this.shouldStartNewTurn(seq)) {
      this.resetForNewTurn();
    } else if (seq <= this.lastProcessedSeq) {
      return null;
    }

    this.mayStartNewTurn = false;

    if (this.inFlight?.seq === seq) return null;
    if (this.buffer.has(seq)) return null;

    const sequenced = message as SequencedJsonEvent;
    this.buffer.set(seq, sequenced);
    return this.nextReady();
  }

  markProcessed(seq: number): ProcessedResult {
    if (!this.inFlight || this.inFlight.seq !== seq) {
      return { processed: null, next: null };
    }

    const processed = this.inFlight;
    this.lastProcessedSeq = seq;
    this.inFlight = null;

    return { processed, next: this.nextReady() };
  }

  private shouldStartNewTurn(seq: number) {
    return this.mayStartNewTurn && seq === 1 && this.lastProcessedSeq > 0;
  }

  private resetForNewTurn() {
    this.lastProcessedSeq = 0;
    this.inFlight = null;
    this.buffer.clear();
  }

  private nextReady() {
    if (this.inFlight) return null;

    const nextSeq = this.lastProcessedSeq + 1;
    const next = this.buffer.get(nextSeq);
    if (!next) return null;

    this.buffer.delete(nextSeq);
    this.inFlight = next;
    return next;
  }
}

function getServerSeq(message: JsonEvent) {
  if (typeof message.seq !== "number") return null;
  if (!Number.isSafeInteger(message.seq)) return null;
  if (message.seq < 1) return null;
  return message.seq;
}
