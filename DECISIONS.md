# Decisions

## Constraints and pivots

- The assignment described a replayable resumable agent, but the provided `apps/agent-server` behavior diverged from that contract under chaos mode.
- The server was treated as read-only, so frontend recovery had to work around backend behavior instead of fixing protocol implementation bugs.
- Chaos drops often aborted the active script, which meant `RESUME` could replay only already-generated events and could not create missing future tokens.
- Because true resume was technically useless after an aborted script, the client pivots to resending the last user message when a resume makes no stream progress.
- New prompts are queued/blocked during streaming because the mock server is single-session and clears or restarts history on a new `USER_MESSAGE`.
- A correct frontend-only fix for `TOOL_ACK` violations is impossible with the provided backend. First, chaos mode can buffer a `TOOL_CALL` before it is delivered while the server still starts the 5s ACK timer, so a client can ACK immediately after seeing the call and still be late from the server's point of view. Second, reconnect aborts the active script and clears `pendingAcks`, but `RESUME` can replay the old `TOOL_CALL`; ACKing that historical call is then logged as `unexpected` because no active server wait exists. The client can only reduce symptoms by avoiding replayed/dead ACKs and sending live ACKs as early as the assignment constraints allow; full correctness requires backend changes.

## Sequence ordering and deduplication

`SequenceGate` is the protocol boundary. It keeps `lastProcessedSeq`, one `inFlight` event, and a `Map<number, event>` buffer keyed by `seq`; the map gives cheap dedupe, direct lookup for `lastProcessedSeq + 1`, and simple buffering for out-of-order delivery. Duplicate events are ignored if they are already processed, currently in flight, or already buffered.

The worker emits only the next ordered event to React. React applies it to the stores, then posts a `processed` acknowledgement back to the worker; only then does `SequenceGate` advance `lastProcessedSeq`. This keeps `RESUME.last_seq` tied to UI-consumed state, not merely socket-received state.

There is one intentional restart path: after a user message, `SequenceGate` can accept a fresh `seq: 1` as a new turn. That exists because the mock server restarts numbering/history in cases where the documented protocol implied a continuous replay stream.

## Streaming, tools, and layout stability

Chat state is stored as ordered agent parts: text parts hold token chunks by `seq`, and tool parts are separate records keyed by `call_id`. A `TOOL_CALL` inserts a stable card below the frozen text part, while later tokens resume in the next text part, so the already-rendered text is not rebuilt into a different shape.

The UI uses stable React keys, normal document flow, `whitespace-pre-wrap`, bounded scroll containers, and compact accordion tool cards. That keeps tool interruptions from flickering or overwriting streamed text, and it avoids a large layout jump when a tool result arrives.

## Reconnection and recovery

WebSocket work runs inside a Web Worker so reconnect loops, heartbeats, sequence buffering, and stall detection do not compete with React rendering. The reconnect controller uses the required backoff sequence and sends `RESUME` before normal queued messages on reconnect.

The stream watchdog handles the backend failure mode the spec did not cover: a socket reconnects successfully but no more ordered stream events arrive because the server killed the active script. In that case, the client first tries reconnect/resume; if `lastStreamProgressSeq` does not advance, it flushes the partial last turn and resends the last user message.

This resend workaround is a deliberate compromise. It preserves an interactive demo against the fixed mock server, but it is not equivalent to protocol-level continuation because any already-shown partial answer from the aborted run must be discarded to avoid duplicate or contradictory output.

## Trace and context panels

The trace store groups token frames into one expandable token row per stream instead of rendering one row per token. The sidebar is virtualized with `@tanstack/react-virtual`, which keeps high-rate token streams usable.

Context snapshots are stored by `context_id` and sorted by `seq`. The inspector intentionally uses two JSON libraries: `@uiw/react-json-view` for normal object viewing, and `virtual-react-json-diff` only for diffs, because the non-virtual diff path blocked the main thread on very large JSON during the second comparison, especially when one side of the diff was empty.

## If this needed 50 concurrent streams

I would move from one global `SequenceGate` and one chat timeline to per-session or per-stream protocol state, with windowed retention and explicit stream ownership in the UI stores. The worker model still fits, but messages would need routing by connection/session/stream id and the visible UI would subscribe only to rows currently on screen.

## If responses were 100x longer

I would stop keeping every token as React-rendered state forever. The client should compact completed text ranges, virtualize chat transcript rendering, persist old trace/context data outside hot Zustand state, and keep only recent ordered events in memory once they are no longer needed for replay or highlighting.
